const { Op, Sequelize } = require("sequelize");

// Models
const {
  StockEntryProduct: StockEntryProductModel,
  productTag,
  productIndex,
  status: statusModel,
  StockEntry,
  Location,
  storeProduct,
} = require("../db").models;

// Util
const { shortDateAndTime, shortDateTimeAndMonthMmmFormat } = require("../lib/dateTime");

const Request = require("../lib/request");
const DataBaseService = require("../lib/dataBaseService");
const DateTime = require("../lib/dateTime");

const productTagService = new DataBaseService(productTag);
const validator = require(".././lib/validator");
const Boolean = require("../lib/Boolean");
const Number = require("../lib/Number");
const StockEntryProduct = require("../helpers/StockEntryproduct");
const Response = require("../helpers/Response");
const History = require("./HistoryService");
const ObjectName = require("../helpers/ObjectName");
const Status = require("../helpers/Status");
const StatusService = require("./StatusService");
const Permission = require("../helpers/Permission");
const { getSettingValue } = require("./SettingService");
const Setting = require("../helpers/Setting");
const { TODAY_VALUE } = require("../helpers/Date");
const dateTime = new DateTime();

const getQuantity = (data,  productId,storeId) => {
  let quantity = 0;
  let lastStockEntryDate
  for (const product of data) {

    if (product.store_id == storeId && product.product_id == productId) {
      quantity += Number.Get(product.quantity, 0);
      lastStockEntryDate = product?.lastStockEntryDate;
    }
  }
  const stockdata = {
    quantity: quantity ? quantity : "",
    lastStockEntryDate: lastStockEntryDate ? lastStockEntryDate : "",
  }
  return stockdata;
};
const search = async (req, res) => {
  try {
    //get req params
    let params = req.query;

    //destructure the params

    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      stockEntryId,
      brand,
      category,
      tag,
      location,
      startDate,
      endDate,
      stockEntryProductType,
      productId,
      status,
      user
    } = params;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    let timeZone = Request.getTimeZone(req);

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone);

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
    const validOrder = ["ASC", "DESC"];

    const sortableFields = {
      id: "id",
      product_id: "product_id",
      product_name: "product_name",
      quantity: "quantity",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      stock_entry_number: "stock_entry_number",
      date: "date",
      system_quantity: "system_quantity",
      status: "status",
    };

    const sortParam = sort || "createdAt";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort stockEntryProduct by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }

    //cretae where object
    let where = new Object();

    //get product details object
    let productIndexWhere = new Object();

    let stockEntryWhere = new Object();
    //append the company id
    where.company_id = companyId;

    //validate stock entry Id exist or not
    if (stockEntryId) {
      where.stock_entry_id = stockEntryId;
    }

    if (status) {
      where.status = status;
    }
    //validate brand and catogery
    if (brand) {
      productIndexWhere.brand_id = brand;
    }

    if (category) {
      productIndexWhere.category_id = category;
    }

    if (location) {
      stockEntryWhere.store_id = location;
    }

    if(Number.isNotNull(user)){
      stockEntryWhere.owner_id = user
    }

    if (tag) {
      const productIds = [];
      if (tag) {
        let tagData = await productTagService.find({ where: { tag_id: tag, company_id: companyId } });
        for (let i = 0; i < tagData.length; i++) {
          productIds.push(tagData[i].product_id);
        }
      }

      productIndexWhere.product_id = { [Op.in]: productIds };
    }

    if(productId){
      where.product_id = productId
    }
    // Search term
    const searchTerm = search ? search.trim() : null;

    //validate search term
    if (searchTerm) {
      productIndexWhere[Op.or] = [
        {
          product_display_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    if (startDate && !endDate) {
      stockEntryWhere.date = {
        [Op.and]: {
          [Op.gte]: startDate,
        },
      };
    }

    if (endDate && !startDate) {
      stockEntryWhere.date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    if (startDate && endDate) {
      stockEntryWhere.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    if (date && Number.isNotNull(req?.query?.date)) {
      stockEntryWhere.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    let order = [];

    if (sort === "product_name") {
      order.push(
        [{ model: productIndex, as: "productIndexList" }, "brand_name", sortDirParam],
        [{ model: productIndex, as: "productIndexList" }, "product_name", sortDirParam],
        [{ model: productIndex, as: "productIndexList" }, "size", sortDirParam],
        [{ model: productIndex, as: "productIndexList" }, "mrp", sortDirParam]
      );
    }

    if (sort === "id") {
      order.push([{ model: StockEntry, as: "stockEntryDetail" }, "stock_entry_number", sortDirParam]);
    }
    if (sort === "status") {
      order.push([{ model: statusModel, as: "statusDetail" }, "id", sortDirParam]);
    }
    if (sort !== "product_name" && sort) {
      order.push([sortParam, sortDirParam]);
    }

    if (stockEntryProductType == StockEntryProduct.TYPE_MATCHED_VALUE) {
      where.quantity = {
        [Op.or]: [{ [Op.eq]: Sequelize.col("system_quantity") }],
      };
    }

    if (stockEntryProductType == StockEntryProduct.TYPE_NOT_MATCHED_VALUE) {
      where[Op.or] = [
        {
          [Op.and]: [{ quantity: { [Op.ne]: null } }, Sequelize.literal("system_quantity IS NULL")],
        },

        {
          [Op.and]: [{ quantity: null }, Sequelize.literal("system_quantity IS NOT NULL")],
        },
        {
          [Op.and]: [
            { quantity: { [Op.ne]: Sequelize.col("system_quantity") } },
            { quantity: { [Op.ne]: null } },
            Sequelize.literal("system_quantity IS NOT NULL"),
          ],
        },
      ];
    }

    if (stockEntryProductType == StockEntryProduct.TYPE_NOT_MATCHED_NEGATIVE_VALUE) {
      where.quantity = {
        [Op.or]: [{ [Op.lt]: Sequelize.col("system_quantity") }],
      };
    }
    if (stockEntryProductType == StockEntryProduct.TYPE_NOT_MATCHED_POSITIVE_VALUE) {
      where.quantity = {
        [Op.or]: [{ [Op.gt]: Sequelize.col("system_quantity") }],
      };
    }

    //create query object
    const query = {
      order,
      where,
    };

    query.include = [
      {
        required: true,
        model: productIndex,
        as: "productIndexList",
        where: productIndexWhere,
      },
      {
        required: false,
        model: statusModel,
        as: "statusDetail",
      },
      {
        required: true,
        model: StockEntry,
        as: "stockEntryDetail",
        where: stockEntryWhere,
        include: [
          {
            required: false,
            model: Location,
            as: "locationDetails",
          },
        ],
      },
    ];


    // Get Location list and count
    const stockProductEntryList = await StockEntryProductModel.findAll(query);

    const storeProductData = await storeProduct.findAll({
      where: {
        company_id:companyId
      },
      attributes: ["product_id", "store_id", "quantity","last_stock_entry_date"],
    });

    let storeProductArray = []
    for (let i = 0; i < storeProductData.length; i++) {
      storeProductArray.push({ quantity: storeProductData[i].quantity, store_id: storeProductData[i].store_id, product_id: storeProductData[i].product_id, lastStockEntryDate: storeProductData[i].last_stock_entry_date })
    }

    let storeProductMap = {};
    for (let i = 0; i < storeProductArray.length; i++) {
      const item = storeProductArray[i];
      const key = `${item.store_id}-${item.product_id}`;
      storeProductMap[key] = {
        quantity: item && item.quantity,
        lastStockEntryDate: item && item.lastStockEntryDate,
      };
    }

    //create stockProductEntry array
    const stockProductEntry = [];

    let storeProductQuantity;
    for (let i = 0; i < stockProductEntryList.length; i++) {
      let value = stockProductEntryList[i];

      storeProductQuantity = storeProductMap[`${value.store_id}-${value.product_id}`];

      const data = {
        id: value?.id,
        product_id: value?.product_id,
        product_name: value.productIndexList && value.productIndexList?.product_name,
        product_display_name: value.productIndexList && value.productIndexList?.product_display_name,
        image: value.productIndexList && value.productIndexList?.featured_media_url,
        quantity: value?.quantity,
        size: value.productIndexList && value.productIndexList?.size,
        pack_size: value.productIndexList && value.productIndexList?.pack_size,
        brand_name: value.productIndexList && value.productIndexList?.brand_name,
        sale_price: value.productIndexList && value.productIndexList?.sale_price,
        mrp: value.productIndexList && value.productIndexList?.mrp,
        unit: value.productIndexList && value.productIndexList?.unit,
        brand_id: value.productIndexList && value.productIndexList?.brand_id,
        companyId: companyId,
        stockEntryId: value.stockEntryDetail?.id,
        stock_entry_number: value.stockEntryDetail?.stock_entry_number,
        date: value?.createdAt,
        location_name: value.stockEntryDetail?.locationDetails?.name,
        location_id: value.stockEntryDetail?.locationDetails?.id,
        amount: Number.GetFloat(value.productIndexList?.sale_price) * value?.quantity,
        systemQuantity: value?.system_quantity,
        currentSystemQuantity: storeProductQuantity && storeProductQuantity?.quantity ? storeProductQuantity?.quantity : "",
        productStatus: value && value.productIndexList && value.productIndexList.status,
        status: value.statusDetail?.name,
        statusId: value.statusDetail && value.statusDetail.id,
        statusColor: value.statusDetail?.color_code,
        lastStockEntryDate: storeProductQuantity && storeProductQuantity?.lastStockEntryDate ? storeProductQuantity?.lastStockEntryDate : "",
      };

      // formate object property
      (data.createdAt = value.createdAt), dateTime.formats.shortDateAndTime;
      (data.updatedAt = value.updatedAt), dateTime.formats.shortDateAndTime;

      if (
        stockEntryProductType == StockEntryProduct.TYPE_NOT_MATCHED_POSITIVE_VALUE ||
        stockEntryProductType == StockEntryProduct.TYPE_NOT_MATCHED_NEGATIVE_VALUE
      ) {
        if (data.systemQuantity == data.currentSystemQuantity) {
          stockProductEntry.push(data);
        }
      } else {
        stockProductEntry.push(data);
      }
    }
    const offset = (page - 1) * pageSize;

    const stockEntryList = stockProductEntry.slice(offset, offset + pageSize);

    //return response
    return res.json(200, {
      totalCount: stockProductEntry.length,
      currentPage: page,
      pageSize,
      data:stockEntryList,
      sort,
      sortDir,
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const updateStoreQuantity = async (body, companyId) => {
  try {
    let stockEntryProductIds = body && body.selectedProductIds;

    if (!stockEntryProductIds) {
      throw { message: "Product Ids Required" };
    }

    if (stockEntryProductIds && stockEntryProductIds.length > 0) {
      let stockEntryProductList = await StockEntryProductModel.findAll({
        where: { company_id: companyId, id: { [Op.in]: stockEntryProductIds } },
      });

      if (stockEntryProductList && stockEntryProductList.length) {
        for (let i = 0; i < stockEntryProductList.length; i++) {
          if (
            stockEntryProductList[i].quantity >= 0 &&
            stockEntryProductList[i].product_id &&
            stockEntryProductList[i].store_id
          ) {
            await storeProduct.update(
              {
                quantity: Number.Get(stockEntryProductList[i].quantity),
              },
              {
                where: {
                  company_id: companyId,
                  product_id: stockEntryProductList[i].product_id,
                  store_id: stockEntryProductList[i].store_id,
                },
              }
            );
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};
const updateStatus = async (req, res, next) => {
  const data = req.body;

  const companyId = Request.GetCompanyId(req);

  try {
    let selectedProduct = data && data.selectedIds;

    if (!selectedProduct) {
      throw { message: "Product Ids Required" };
    }

    let statusDetail = await StatusService.getData(data.status, companyId);

    if (selectedProduct && selectedProduct.length > 0) {
      for (let i = 0; i < selectedProduct.length; i++) {
        if (statusDetail && statusDetail.update_quantity == Status.UPDATE_QUANTITY_ENABLED) {
          let stockEntryProductList = await StockEntryProductModel.findOne({
            where: { company_id: companyId, id: selectedProduct[i] },
          });

          await StockEntryProductModel.update({ status: data.status }, { where: { id: selectedProduct[i] } });

          if (
            stockEntryProductList.quantity >= 0 &&
            stockEntryProductList.product_id &&
            stockEntryProductList.store_id
          ) {
            await storeProduct.update(
              {
                quantity: Number.Get(stockEntryProductList?.quantity),
                last_stock_entry_date: stockEntryProductList.createdAt,
              },
              {
                where: {
                  company_id: companyId,
                  product_id: stockEntryProductList.product_id,
                  store_id: stockEntryProductList.store_id,
                },
              }
            );
          }
        } else {
          try {
            await StockEntryProductModel.update({ status: data.status }, { where: { id: selectedProduct[i] } });
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
    res.json(Response.UPDATE_SUCCESS, {
      message: "StockEntry Product Updated",
    });

    res.on("finish", async () => {
      History.create("Stock Entry Product Updated", req, ObjectName.STOCK_ENTRY_PRODUCT);
    });
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const getCount = async (params)=>{
  let { 
    company_id,
     user_id,
     date,
     timeZone,
     store_id ,
    shift_id,
    manageOthers
  } = params;

  let customDate = DateTime.getCustomDateTime(TODAY_VALUE, timeZone)
  let start_date = date ? DateTime.toGetISOStringWithDayStartTime(new Date(date)):null;
  let end_date = date ? DateTime.toGetISOStringWithDayEndTime(new Date(date)):null;
  try{

    let where={};

    where.company_id = company_id

    if(!manageOthers){
      if(user_id){
        where.owner_id = user_id
      }

      if(shift_id){
        where.shift_id = shift_id
      }

      if(store_id){
        where.store_id = store_id
      }
    }

    let stockEntryProduct = await StockEntryProductModel.count({
      where: {
          ...where,
          createdAt: {
            [Op.and]: {
              [Op.gte]: date ? DateTime.toGMT(start_date, timeZone): customDate.startDate,
              [Op.lte]: date ? DateTime.toGMT(end_date, timeZone): customDate.endDate,
            },
          },
      }
  });
 
    return {stockEntryProduct : stockEntryProduct}
 

  }catch(err){
    console.log(err);
  }

}


const mobileSearch = async (params, companyId) => {
  try {
    //destructure the params
    let { page, pageSize, sort, sortDir, pagination, stockEntryId } = params;

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

    const sortParam = "createdAt";

    const sortDirParam = "DESC";

    //cretae where object
    let where = new Object();

    //get product details object
    let productIndexWhere = new Object();

    //append the company id
    where.company_id = companyId;

    //validate stock entry Id exist or not
    if (stockEntryId) {
      where.stock_entry_id = stockEntryId;
    }else{
      throw { message: "Stock Entry Not Found" };
    }

    let order = [];

    order.push([sortParam, sortDirParam]);

    //create query object
    const query = {
      order,
      where,
    };

    query.include = [
      {
        required: true,
        model: productIndex,
        as: "productIndexList",
        where: productIndexWhere,
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

    // Get Location list and count

    const stockProductEntryList = await StockEntryProductModel.findAndCountAll(query);

    //create stockProductEntry array
    const stockProductEntry = [];

    if(stockProductEntryList && stockProductEntryList.rows.length>0){
      for (let i = 0; i < stockProductEntryList.rows.length; i++) {

        let value = stockProductEntryList.rows[i];

        const data = {
          id: value?.id,
          product_id: value?.product_id,
          product_name:
            value.productIndexList && value.productIndexList?.product_name,
          product_display_name:
            value.productIndexList &&
            value.productIndexList?.product_display_name,
          image:
            value.productIndexList && value.productIndexList?.featured_media_url,
          quantity: value?.quantity,
          size: value.productIndexList && value.productIndexList?.size,
          pack_size: value.productIndexList && value.productIndexList?.pack_size,
          brand_name:
            value.productIndexList && value.productIndexList?.brand_name,
          sale_price:
            value.productIndexList && value.productIndexList?.sale_price,
          mrp: value.productIndexList && value.productIndexList?.mrp,
          unit: value.productIndexList && value.productIndexList?.unit,
          date: value?.createdAt,
          amount:
            Number.GetFloat(value.productIndexList?.sale_price) * value?.quantity,
        };

        // formate object property
        (data.createdAt = value.createdAt), dateTime.formats.shortDateAndTime;
        (data.updatedAt = value.updatedAt), dateTime.formats.shortDateAndTime;

        stockProductEntry.push(data);
      }
    }

    let data = {
      totalCount: stockProductEntryList.count,
      currentPage: page,
      pageSize,
      data: stockProductEntry,
      sort,
      sortDir,
    };
    return data;
  } catch (err) {
    console.log(err);
    throw err
  }
};

module.exports = {
  search,
  updateStoreQuantity,
  updateStatus,
  getCount,
  mobileSearch,
};
