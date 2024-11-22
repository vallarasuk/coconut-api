const { Op } = require("sequelize");

// Models
const {
  productIndex,
  PurchaseProduct,
  Purchase,
  Location,
  account: accountModel,
  productTag,
} = require("../../db").models;

// Util

const Request = require("../../lib/request");
const { hasPermission } = require("../../services/UserRolePermissionService");
const DateTime = require("../../lib/dateTime");
const { BAD_REQUEST } = require("../../helpers/Response");
const Numbers = require("../../lib/Number");
const object = require("../object");
const db = require("../../db");
const DataBaseService = require("../../lib/dataBaseService");

const productTagService = new DataBaseService(productTag);
const validator = require("../../lib/validator");
const Boolean = require("../../lib/Boolean");
const Permission = require("../../helpers/Permission");
const ProductPriceService = require("../../services/ProductPriceService");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const Number = require("../../lib/Number");

const search = async (req, res) => {
  try {
    const hasPermission = await Permission.Has(
      Permission.PURCHASE_PRODUCT_REPORT_VIEW,
      req
    );

    //destructure the params
    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      purchaseId,
      location,
      startDate,
      endDate,
      account,
      brand,
      category,
      tag,
    } = req.query;
    //get company Id from request
    const companyId = Request.GetCompanyId(req);
    
    let timeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)


    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: "Invalid page size" });
    }

    //cretae where object
    let where = {};

    const productIds = [];
    if (tag) {
      let tagData = await productTagService.find({
        where: { tag_id: tag, company_id: companyId },
      });
      for (let i = 0; i < tagData.length; i++) {
        productIds.push(tagData[i].product_id);
      }
    }

    //get product details object
    let productDetailWhere = new Object();
    let wherePurchase = new Object();
    //append the company id
    where.company_id = companyId;
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate);
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate);

    //validate stock entry Id exist or not
    if (purchaseId) {
      where.purchase_id = purchaseId;
    }

    if (brand) {
      productDetailWhere.brand_id = brand;
    }

    if (category) {
      productDetailWhere.category_id = category;
    }

    if (tag) {
      productDetailWhere.product_id = { [Op.in]: productIds };
    }
    // Search term
    const searchTerm = search ? search.trim() : null;

    let filteredProductIds = await ProductPriceService.getProductIds(
      searchTerm,
      companyId
    );
    if (filteredProductIds && filteredProductIds.length > 0) {
      productDetailWhere.product_id = filteredProductIds;
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
    if (startDate && !endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    if (startDate && endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }

    if (date && Number.isNotNull(req.query?.date)) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (location) {
      wherePurchase.store_id = location;
    }
    if (account) {
      wherePurchase.vendor_id = account;
    }
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      purchase_id: "purchase_id",
      product_name: "product_name",
      quantity: "quantity",
      pack_size: "pack_size",
      unit_price: "unit_price",
      discount_percentage: "discount_percentage",
      discount_amount: "discount_amount",
      tax_percentage: "tax_percentage",
      tax_amount: "tax_amount",
      net_amount: "net_amount",
      id: "id",
      updatedAt: "updatedAt",
      date: " date",
      vendor: "vendor",
    };
    const sortParam = sort ? sort : "createdAt";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort inventory by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }
    let Ids = new Array();

    let filterList = new Array();

    const include = [
      {
        required: true,
        model: productIndex,
        as: "productIndex",
        where: productDetailWhere,
      },
      {
        required: true,
        model: Purchase,
        as: "purchaseDetail",
        where: wherePurchase,
        include: [
          {
            required: false,
            model: Location,
            as: "location",
          },
          {
            required: false,
            model: accountModel,
            as: "account",
          },
        ],
      },
    ];

    //create query object
    const query = {
      attributes: { exclude: ["deletedAt"] },
      order: [
        sortParam === "vendor"
          ? [
              { model: Purchase, as: "purchaseDetail" },
              { model: accountModel, as: "account" },
              "name",
              sortDirParam,
            ]
          : sortParam === "date"
          ? [
              { model: Purchase, as: "purchaseDetail" },
              "purchase_date",
              sortDirParam,
            ]
          : sortParam !== "product_name"
          ? [[sortableFields[sortParam], sortDirParam]]
          : [
              { model: productIndex, as: "productIndex" },
              "product_name",
              sortDirParam,
            ],
      ],
      include,
      where,
    };

    if (validator.isEmpty(pagination)) {
      pagination = true;
    }

    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    let groupQuery;
    if (location && account) {
      groupQuery = `with purchase_product as (
        SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
        FROM purchase_product
     WHERE  store_id = ${location ? location : null} AND vendor_id = ${
        account ? account : null
      } 

        GROUP BY product_id
        ),
        cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
        left join purchase_product t2 

                on t1.product_id = t2.product_id)
                          
        SELECT * FROM cte2   `;
    } else {
      groupQuery = `with purchase_product as (
      SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
      FROM purchase_product
      GROUP BY product_id
      ),
      cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
      left join purchase_product t2 
              on t1.product_id = t2.product_id)
                        
      SELECT * FROM cte2`;
    }

    if (!location && account && !startDate && !endDate) {
      groupQuery = `with purchase_product as (
          SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
          FROM purchase_product
          WHERE  vendor_id = ${account ? account : null} 
  
          GROUP BY product_id
          ),
          cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
          left join purchase_product t2 
                  on t1.product_id = t2.product_id)
                            
          SELECT * FROM cte2   `;
    }

    if (!location && account && startDate && endDate) {
      groupQuery = `with purchase_product as (
              SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
              FROM purchase_product
              WHERE "createdAt" BETWEEN '${startDate}' AND '${endDate}' AND  vendor_id = ${
        account ? account : null
      }
      
              GROUP BY product_id
              ),
              cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
              left join purchase_product t2 
                      on t1.product_id = t2.product_id)
                                
              SELECT * FROM cte2   `;
    }

    if (location && account && startDate && endDate) {
      groupQuery = `with purchase_product as (
                  SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
                  FROM purchase_product
                  WHERE "createdAt" BETWEEN '${startDate}' AND '${endDate}' AND  vendor_id = ${
        account ? account : null
      } AND  store_id = ${location ? location : null}
          
                  GROUP BY product_id
                  ),
                  cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
                  left join purchase_product t2 
                          on t1.product_id = t2.product_id)
                                    
                  SELECT * FROM cte2   `;
    }

    if (startDate && endDate && !location && !account) {
      groupQuery = `with purchase_product as (
              SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
              FROM purchase_product
              WHERE "createdAt" BETWEEN '${startDate}' AND '${endDate}'
      
              GROUP BY product_id
              ),
              cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
              left join purchase_product t2 
                      on t1.product_id = t2.product_id)
                                
              SELECT * FROM cte2   `;
    }

    if (location && !account && !startDate && !endDate) {
      groupQuery = `with purchase_product as (
                  SELECT product_id,MAX(id) AS id, SUM(quantity) as total_quantity
                  FROM purchase_product
               WHERE  store_id = ${location ? location : null}
          
                  GROUP BY product_id
                  ),
                  cte2 AS (select  t1.*, t2.total_quantity from purchase_product t1
                  left join purchase_product t2 
                          on t1.product_id = t2.product_id)
                                    
                  SELECT * FROM cte2   `;
    }

    let list = await db.connection.query(groupQuery);

    if (list && Array.isArray(list) && list.length > 0) {
      let orderProductLists = list[0];
      if (orderProductLists && Array.isArray(orderProductLists)) {
        let queryResult = orderProductLists;
        if (queryResult && queryResult.length > 0) {
          queryResult.forEach((data) => {
            Ids.push(data.id);
            filterList.push({
              id: data.id,
              total_quantity: data.total_quantity,
            });
          });
        }
        if (Ids.length > 0) {
          query.where.id = Ids;
        }
      }
    }

    // Get Location list and count
    const purchaseProductList = await PurchaseProduct.findAndCountAll(query);

    //create purchaseProductEntry array
    const purchaseProductEntry = [];
    purchaseProductList.rows.forEach((purchaseProduct) => {
      const {
        id,
        quantity,
        unit_price,
        productIndex,
        createdAt,
        updatedAt,
        discount_percentage,
        pack_size,
        purchase_id,
        product_id,
        discount_amount,
        tax_percentage,
        tax_amount,
        net_amount,
        purchaseDetail,
      } = purchaseProduct;
      const product_index = { ...productIndex.get() };

      const dateTime = new DateTime();
      let maxQuant;

      if (filterList && filterList.length > 0) {
        maxQuant = filterList.find((data) => data.id == id);
      }
      //create date object
      const data = {
        id,
        unit_price: unit_price,
        product_name: product_index.product_name,
        date_time: DateTime.Format(purchaseDetail.purchase_date),
        quantity: maxQuant ? maxQuant.total_quantity : quantity,
        location: purchaseDetail?.location?.name,
        vendor: purchaseDetail?.account?.name,
        image: product_index.featured_media_url,
        purchase_id: purchase_id,
        product_id: product_id,
        discount_percentage: discount_percentage,
        pack_size: pack_size,
        discount_amount: discount_amount,
        tax_percentage: tax_percentage,
        tax_amount: tax_amount,
        net_amount: net_amount,
        price: parseFloat(unit_price) * parseInt(quantity, 10),
        size: product_index.size,
        brand_name: product_index.brand_name,
        sale_price: product_index.sale_price,
        mrp: product_index.mrp,
        unit: product_index.unit,
        brand_id: product_index.brand_id,
      };

      // Formate Object Property
      (data.createdAt = createdAt), dateTime.formats.shortMonthDateAndTime;
      (data.updatedAt = updatedAt), dateTime.formats.shortMonthDateAndTime;

      //push the purchaseProductEntry
      purchaseProductEntry.push(data);
    });

    if (sortParam === "quantity" || sortParam === "total_quantity") {
      purchaseProductEntry.sort((a, b) => {
        const aValue = a[sortParam] || (a.total_quantity !== undefined ? a.total_quantity : 0);
        const bValue = b[sortParam] || (b.total_quantity !== undefined ? b.total_quantity : 0);
    
        if (sortDirParam === "ASC") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    } else {
      purchaseProductEntry.sort((a, b) => {
        const aValue = a[sortParam];
        const bValue = b[sortParam];
    
        if (sortDirParam === "ASC") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }
    

    // //return response
    return res.json(200, {
      totalCount: purchaseProductList.count,
      currentPage: page,
      pageSize,
      data: purchaseProductEntry,
      sort,
      sortDir,
      search,
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

module.exports = search;
