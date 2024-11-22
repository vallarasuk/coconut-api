const { Transfer: TransferModel, TransferProduct, status: statusModal, productIndex, Location, TransferType ,User} = require("../db").models;

const { Op, Sequelize } = require("sequelize");
const db = require("../db");
const ObjectName = require("../helpers/ObjectName");
const Permission = require("../helpers/Permission");
const Response = require("../helpers/Response");
const Transfer = require("../helpers/Transfer");
const TransferProductStatus = require("../helpers/TransferProduct");
const Boolean = require("../lib/Boolean");
const DataBaseService = require("../lib/dataBaseService");
const { shortDateTimeAndMonthMmmFormat } = require("../lib/dateTime");
const DateTime = require("../lib/dateTime");
const Request = require("../lib/request");
const History = require('./HistoryService');
const validator = require("../lib/validator");

const transferService = new DataBaseService(TransferModel);
const transferProductService = new DataBaseService(TransferProduct);
const statusService = new DataBaseService(statusModal);
const ProductPriceService =  require("../services/ProductPriceService");
const { getSettingValue } = require("./SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../helpers/Setting");
const UserService = require("./UserService");
const Setting = require("../helpers/Setting");
const Numbers = require("../lib/Number");




const getNextTransferOrderNumber = async (company_id) => {
  try {
  let transfer_number;
  //get last transfer order
  let lastTransfer = await transferService.findOne({
    order: [['createdAt', 'DESC']],
    where: { company_id },
  });

  //get last transfer order data
  transfer_number = lastTransfer && lastTransfer.transfer_number;
  //validate last transfer order data exist or no
  if (!transfer_number) {
    transfer_number = 1;
  } else {
    transfer_number = transfer_number + 1;
  }

  return transfer_number;
} catch (err){
  console.log(err);
}
};

const clone = async (req, res, next) => {
  try {
    //get transfer order Id
    const id = req.params.id;
    //get company Id
    const company_id = Request.GetCompanyId(req);

    //get transfer order details
    let transferDetail = await transferService.findOne({ where: { id: id, company_id: company_id } });

    //validate transfer order detail exist or not
    if (!transferDetail) {
      return res.json(400, { message: 'Transfer Not Found' });
    }
    const status = await statusService.findOne({
      where: {
        company_id: company_id,
        name: Transfer.STATUS_DRAFT,
        object_name: ObjectName.TRANSFER

      }
    });

    //create transfer order data
    let createData = {
      company_id,
      status: status.id,
      from_store_id: transferDetail.from_store_id,
      to_store_id: transferDetail.to_store_id,
      date: DateTime.UTCtoLocalTime(new Date()),
      transfer_number: await getNextTransferOrderNumber(company_id),
      type: transferDetail.type ? transferDetail.type : null,
      owner_id: transferDetail.owner_id ? transferDetail.owner_id : null,
      notes: transferDetail.notes ? transferDetail.notes : null

    };

    //create transfer
    let transfer = await transferService.create(createData);

    //get transfer order products
    let transferProducts = await transferProductService.find({
      where: { company_id: company_id, transfer_id: id },
    });

    //validate transfer products exist or not
    if (transferProducts && transferProducts.length > 0) {
      //loop the transfer prodcuts
      for (let i = 0; i < transferProducts.length; i++) {
        //destructure the transfer order
        const { product_id, status, company_id, quantity, from_store_id, to_store_id, type,date } = transferProducts[i];
        //create transfer order data
        const createData = {
          product_id,
          transfer_id: transfer.id,
          status,
          company_id,
          quantity,
          from_store_id,
          to_store_id,
          type,
        };
        //create transfer order
        await transferProductService.create(createData);
      }
    }

    //send response
    res.json(Response.OK, { message: 'transfer Cloned' });

    res.on('finish', async () => {
      //create system log for transfer updation
      History.create("transfer Cloned", req, ObjectName.TRANSFER, id);
    });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
};


const removeDuplicates = (originalArray, prop) => {
  try {
    let newArray = [];
    let lookupObject = {};

    for (let i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  } catch (err) {
    return null;
  }
}

const update = async (req, res) => {
  // Validate Permission exist or not
  const hasPermission = await Permission.GetValueByName(Permission.TRANSFER_EDIT, req.role_permission);

  try {
    //get company Id from request
    let body = req.body;

    const transferId = req.params.id;

    const company_id = Request.GetCompanyId(req);

    //create stock create object
    let transferUpdateData = new Object();

    if (body.fromLocationId) {
      transferUpdateData.from_store_id = body.fromLocationId
    }
    if (body.toLocationId) {
      transferUpdateData.to_store_id = body.toLocationId
    }

    if (body.type) {
      transferUpdateData.type = body.type
    }

    //create stock
    await transferProductService.update(transferUpdateData, {
      where: { transfer_id: transferId, company_id: company_id },
    });

  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};


const report = async (req, res) => {
  try {
    // Validate Permissions exist or not.
    // const hasPermission = await Permission.GetValueByName(Permission.TRANSFER_PRODUCT_REPORT_VIEW, req.role_permision);

    //get req params
    let params = req.query;



    //destructure the params
    let { page, pageSize, search, sort, sortDir, pagination, transferId, fromLocation, brand, category, startDate, endDate, toLocation, type, reportType } = params;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: "Invalid page" };
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: "Invalid page size" };
    }
    let timeZone = Request.getTimeZone(req);

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)

    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    //cretae where object
    let where = new Object();

    //get product details object
    let productDetailWhere = new Object();

    let transferDetailWhere = new Object();

    //append the company id
    where.company_id = companyId;



    if (fromLocation) {
      transferDetailWhere.from_store_id = fromLocation;
    }

    if (toLocation) {
      transferDetailWhere.to_store_id = toLocation;
    }


    if (type) {
      transferDetailWhere.type = type;
    }

    if (brand) {
      productDetailWhere.brand_id = brand;
    }

    if (category) {
      productDetailWhere.category_id = category;
    }

    if (startDate && !endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone)
        },
      };
    }

    if (endDate && !startDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.lte]:  DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]:  DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (date && Numbers.isNotNull(req?.query?.date)) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;

    let filteredProductIds = await ProductPriceService.getProductIds(searchTerm, companyId)
    if(filteredProductIds && filteredProductIds.length>0){
      productDetailWhere.product_id = filteredProductIds
    }
    //validate search term 
    if (searchTerm && filteredProductIds.length == 0) {
      productDetailWhere[Op.or] = [
        {
          product_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          brand_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        
      ];
    }
    let Ids = new Array();

    let filterList = new Array();
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id:"id",
      product_name: "product_name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      status: "status",
      quantity:"quantity"
    };
    const sortParam = sort || "product_name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort inventory by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }

    //create query object
    const query = {
      attributes: { exclude: ["deletedAt"] },
      // order: [["createdAt", "DESC"]],
      order:
        [sortParam !== ("product_name") ? [[sortableFields[sortParam], sortDirParam]] : [
          { model: productIndex, as: 'productIndex' }, 'product_name', sortDirParam]

        ],
      where,
    };

    //append the include
    query.include = [{
      required: true,
      distinct: true,
      model: productIndex,
      as: "productIndex",
      where: productDetailWhere
    },
    {
      required: true,
      distinct: true,
      model: TransferModel,
      as: "transfer",
      where: transferDetailWhere

    }, {
      required: true,
      model: Location,
      as: 'from_location',
      attributes: ['id', 'name'],
    },
    {
      required: true,
      model: Location,
      as: 'to_location',
      attributes: ['id', 'name'],
    },
    {
      required: true,
      model: TransferType,
      as: 'Type',
      attributes: ['id', 'name'],
    },
    ];

    if (validator.isEmpty(pagination)) {
      pagination = true;
  }

    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }
    let groupQuery = `
    with transfer_product as (
      SELECT product_id, MAX(id) AS id, SUM(quantity) as total_quantity
      FROM transfer_product
    `;
  
  if (fromLocation) {
    groupQuery += `
      WHERE from_store_id = ${fromLocation}
    `;
  }
  
  if (toLocation) {
    groupQuery += `
      ${fromLocation ? 'AND' : 'WHERE'} to_store_id = ${toLocation}
    `;
  }
  
  if (type) {
    groupQuery += `
      ${fromLocation || toLocation ? 'AND' : 'WHERE'} type = ${type}
    `;
  }
  
  if (startDate && endDate) {
    groupQuery += `
      ${fromLocation || toLocation || type ? 'AND' : 'WHERE'} "createdAt" BETWEEN '${startDate}' AND '${DateTime.toGetISOStringWithDayEndTime(endDate)}'
    `;
  }
  
  groupQuery += `
      GROUP BY product_id
    ),
    cte2 AS (SELECT t1.*, t2.total_quantity FROM transfer_product t1
    LEFT JOIN transfer_product t2 ON t1.product_id = t2.product_id)
    SELECT * FROM cte2
  `;


    let list = await db.connection.query(groupQuery)

    if (list && Array.isArray(list) && list.length > 0) {

      let orderProductLists = list[0]
      if (orderProductLists && Array.isArray(orderProductLists)) {

        let queryResult = orderProductLists;
        if (queryResult && queryResult.length > 0) {
          queryResult.forEach((data) => {
            Ids.push(data.id);
            filterList.push({ id: data.id, total_quantity: data.total_quantity });
          })
        }
        if (Ids.length > 0) {
          query.where.id = Ids
        }
      }
    }
    const TransferProductdata = await transferProductService.findAndCount(query);

    const TransferProductList = TransferProductdata && TransferProductdata.rows;
    const transferProduct = [];
    const productData = []
    let totalAmount = 0;

    if (TransferProductList && TransferProductList.length > 0) {


      for (let i = 0; i < TransferProductList.length; i++) {
        const { id,
          transfer_id,
          quantity,
          productIndex,
          product_id,
          from_location,
          to_location,
          status,
          company_id,
          transfer,
          Type } = TransferProductList[i];

        let maxQuant;

        if (filterList && filterList.length > 0) {
          maxQuant = filterList.find((data) => data.id == id);
        }

        let Transfer = { ...transfer.get() };

        //get product details
        let product_index = { ...productIndex.get() };
        totalAmount += Number(product_index.sale_price) * quantity;

        const storeDetail = await Location.findAndCountAll({ where: { id: Transfer?.to_store_id, company_id: companyId } });
        const detail = storeDetail && storeDetail.rows;
        let locationName = []
        for (let i = 0; i < detail.length; i++) {
          locationName = detail[i].name;
        }

        //create date object
        const data = {
          id: id,
          transferId: transfer_id,
          product_id: product_id,
          product_name: product_index.product_name,
          product_display_name: product_index.product_display_name,
          quantity: maxQuant ? maxQuant.total_quantity : quantity,
          brand_name: product_index.brand_name,
          brand_id: product_index.brand_id,
          sale_price: product_index.sale_price,
          size: product_index.size,
          mrp: product_index.mrp,
          unit: product_index.unit,
          image: product_index.featured_media_url,
          statusValue: status,
          companyId: company_id,
          location_name: locationName,
          date: Transfer.date,
          from_location_name: from_location.name,
          to_location_name: to_location.name,
          transfer_type: Type.name
        };


        //push the transferProduct
        transferProduct.push(data);

      }
    }


    return res.json(200, {
      totalCount: TransferProductdata.count,
      currentPage: page,
      pageSize,
      data: transferProduct,
      totalAmount,
      sort,
      sortDir,
    });

  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });

  }
};
const userWiseReport =async (params,res)=> {
  let { page, pageSize, search, sort, sortDir, pagination, user, company_id, date, startDate, endDate } = params;

  // Validate if page is not a number
  page = page ? parseInt(page, 10) : 1;
  if (isNaN(page)) {
    return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
  }

  // Validate if page size is not a number
  pageSize = pageSize ? parseInt(pageSize, 10) : 25;
  if (isNaN(pageSize)) {
    return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
  }

  const companyId = company_id;

 

  // Sortable Fields
  const validOrder = ["ASC", "DESC"];
  const sortableFields = {
    id: "id",
    date: "date",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    user: "user",
    first_name: "first_name",
    product_count: "product_count",
  };

  const sortParam = sort || "first_name";

  // Validate sortable fields is present in sort param
  if (!Object.keys(sortableFields).includes(sortParam)) {
    return res.json(Response.BAD_REQUEST, { message: `Unable to sort payments by ${sortParam}` });
  }

  const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
  // Validate order is present in sortDir param
  if (!validOrder.includes(sortDirParam)) {
    return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
  }

  const searchTerm = search ? search.trim() : null;
  // validate search term exist or not
  

  let where = {};

  if (date || startDate || endDate) {
    where.createdAt = {

      [Op.and]: {
        [Op.gte]: DateTime.toGetISOStringWithDayStartTime(startDate ? startDate : date),
        [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate ? endDate : date),
      },
    };
  }
  if (user) {
    where.created_by = Number(user);

  }

  let { allowedUserIds } = await UserService.listByRolePermission(Setting.REPLENISHMENT_ADD,companyId)

  if (allowedUserIds && allowedUserIds.length>0 && ! user) {
    where.created_by = {[Op.in]: allowedUserIds }
  }else{
    where.created_by = user? user:null

  }

  if (searchTerm) {
    where[Op.or] = [
      {
        "$userDetail.name$": {
          [Op.iLike]: `%${searchTerm}%`,
        },
      },
    ];
  
  }
  let query = {
    where: where,
    include: [
      {
        required: false,
        model: User,
        as: "userDetail",
      },
    ],
    attributes: [
      "created_by",
      "product_id",
      [
        Sequelize.literal(`CASE WHEN COUNT(*) > 1 THEN 1 ELSE COUNT(*) END`),
        "count",
      ],
    ],
    group: ["created_by", "product_id", "userDetail.id"],
    raw: true,
  };
  const TransferProductData = await TransferProduct.findAndCountAll(query);

 let transferQuery = {
    where: where,
    include: [
      {
        required: false,
        model: User,
        as: "userDetail",
      },
    ],
    attributes: [
      "created_by",
    
    ],
    group: ["created_by","userDetail.id"],
    raw: true,
  };

  const TransferData = await TransferProduct.count(transferQuery);

  let arrayData = [];

  let TransferProductDataList = TransferProductData && TransferProductData.rows;
  if (TransferProductDataList && TransferProductDataList.length > 0) {
    for (let i = 0; i < TransferProductDataList.length; i++) {
      const values = TransferProductDataList[i];

    let transferProductData =  TransferData.find((data) => data.created_by == values?.created_by)

      arrayData.push({
        user_id: values?.created_by,
        first_name: values["userDetail.name"],
        last_name: values["userDetail.last_name"],
        media_url: values["userDetail.media_url"],
        date: date,
        count:transferProductData.count
      });
    }
  }
  const userCounts = {};

  arrayData.forEach((item) => {
    const userId = item.user_id;
    if (!userCounts[userId]) {
      userCounts[userId] = { product_count: 1, ...item };
    } else {
      userCounts[userId].product_count++;
    }
  });
  // Convert the userCounts object into an array of objects
  const list = Object.values(userCounts);

  const offset = (page - 1) * pageSize;

    if(sortParam == "product_count" && sortDirParam == "ASC"){
  list.sort((a, b) => a.product_count - b.product_count);
    }
    if(sortParam == "product_count" && sortDirParam == "DESC"){
      list.sort((a, b) => b.product_count - a.product_count);
        }
  let List ;
  if(pagination){
    List = list.slice(offset, offset + pageSize);

  }else{
    List = list;

  }
  const totalProductCount = List.reduce((acc, item) => acc + item.product_count, 0);
  
  return {
    totalCount: list.length,
    totalProductCount : totalProductCount,
    currentPage: page,
    pageSize,
    data: List,
    search,
    sort,
    sortDir,
  };
}

module.exports = {
  clone,
  report,
  update,
  getNextTransferOrderNumber,
  userWiseReport
};
