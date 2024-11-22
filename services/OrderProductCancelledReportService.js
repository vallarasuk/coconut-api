const Permission = require('../helpers/Permission');
const { Op, Sequelize, QueryTypes } = require('sequelize');
const db = require('../db');
const History = require('../services/HistoryService');
const DateTime = require('../lib/dateTime');
const vendorProductService = require("../services/VendorProductService");
const StatusService = require("../services/StatusService");
const ObjectName = require("../helpers/ObjectName");
const Status = require("../helpers/Status");
const Request = require("../lib/request");
const Number = require("../lib/Number");
const ObjectHelper = require("../helpers/ObjectHelper");

class OrderProductCancelledReportService {
 static async search(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_REPORT_VIEW, req);
 
    const params = req.query;
    let companyId = req.user && req.user.company_id;
    let { page, pageSize, search, sort, sortDir, pagination, status, location, startDate, endDate, brand, category, account ,product,startTime,endTime, paymentType, showTotal} =
    params;

    let timeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)


    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: 'Invalid page' };
    }
    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: 'Invalid page size' };
    }
    // Sortable Fields
    const validOrder = ['ASC', 'DESC'];
    const sortableFields = {
      quantity: 'quantity',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      product_name: 'product_name',
      cash_amount: 'cash_amount',
      upi_amount: 'upi_amount',
      user_name: '"user".name',
      location_name: "location_name",
      order_date: "order_date",
      order_number: "order_number",
    };
    const sortParam = sort || 'createdAt';
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort Location by ${sortParam}` };
    }
    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: 'Invalid sort order' };
    }
    //Get Order Product Cancelled status
    let statusDetail = await StatusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);
    const statusIdsArray = statusDetail && statusDetail.length >0 && statusDetail.map(status => status.id);
    const productIds = [];
    if (account) {
      let vendorData = await vendorProductService.findAllProducts(account,  companyId);
      if (Array.isArray(vendorData)) {
        for (let i = 0; i < vendorData.length; i++) {
          if (vendorData[i] && vendorData[i].product_id) {
            productIds.push(vendorData[i].product_id);
          }
        }
      } 
    }
   
    const searchTerm = search ? search.trim() : null;
   
    let whereClause = '';
    let sortClause = '';  
    if (whereClause) {
      whereClause += ' AND ';
    }
    whereClause += ` order_product."deletedAt" IS NULL `;
    if (statusIdsArray && statusIdsArray.length >0) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.status IN (${statusIdsArray}) `;
    }
    if (location) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.store_id= ${location} `;
    }
    if (search) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.product_display_name ILIKE '%${searchTerm}%' `;
    }
    if (brand) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.brand_id =${brand} `;
    }
    if (category) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.category_id = ${category} `;
    }
    if (paymentType) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` "order".payment_type = ${paymentType} `;
    }
    //startDate and startTime
    if (startDate && !endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" > '${DateTime.toGMT(start_date,timeZone)}' `;
    }
   // endDate and endTime
    if (endDate && !startDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" < '${DateTime.toGMT(end_date,timeZone)}' `;
    }
    //startDate endDate and startTime endTime
    if (startDate && endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${DateTime.toGMT(start_date,timeZone)}' AND '${DateTime.toGMT(end_date,timeZone)}' `;
    }

    if (date && Number.isNotNull(req?.query?.date)) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${date?.startDate}' AND '${date?.endDate}' `;
    }

    if (account && productIds && productIds.length > 0) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += `order_product.product_id IN (${productIds.join(', ')})`;
    }
    if (product) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.product_id =${product} `;
    }
    
    if (sort == 'product_name') {
      sortClause += `  MAX (product_index.${sort}) ${sortDir || 'ASC'} `;
    }
    if (sort == 'user_name') {
      sortClause += ` "user".name ${sortDir || 'ASC'} `;
    }

    if (sort == 'upi_amount') {
      sortClause += ` SUM ("order".upi_amount) ${sortDir || 'ASC'} `;
    }

    if (sort == 'cash_amount') {
      sortClause += ` SUM ("order".cash_amount) ${sortDir || 'ASC'} `;
    }

    if (sort == 'order_date') {
      sortClause += ` MAX ("order".date) ${sortDir || 'ASC'} `;
    }

    if (sort == 'location_name') {
      sortClause += ` store.name ${sortDir || 'ASC'} `;
    }
    
    if (sort == 'order_number') {
      sortClause += ` MAX ("order".order_number) ${sortDir || 'ASC'} `;
    }

    if (sort == 'quantity') {
      sortClause += `  ${sort} ${sortDir || 'ASC'}`;
    }
    if (!sort) {
      sortClause += `  ${"quantity"} ${'DESC'}`;
    }

    let totalAmount;
    if(showTotal){
      totalAmount = await this.getTotalAmount(whereClause);
    }

    let sqlQuery;
    let groupClause;
    sqlQuery = `
           
    SELECT 
    order_product.product_id, 
    SUM(order_product.quantity) AS quantity,
    SUM(order_product.profit_amount) AS profit_amount,
    SUM(order_product.price) AS price,
    MAX (product_index.product_name) AS product_name, 
    MAX (product_index.brand_name) AS brand_name,
    MAX (product_index.category_name) AS category_name,
    MAX (product_index.featured_media_url) AS featured_media_url,
    MAX (product_index.unit) AS unit,
    MAX (product_index.size) AS size,
    MAX (product_index.mrp) AS mrp,
    MAX (product_index.cost) AS cost,
    MAX (product_index.sale_price) AS sale_price,
    MAX (product_index.brand_id) AS brand_id,
    MAX (product_index.category_id) AS category_id,
    MAX (product_index.pack_size) AS pack_size,
    MAX (product_index.status) AS status,
    MAX ("order".order_number) AS order_number,
    MAX ("order".date) AS order_date,
    SUM ("order".upi_amount) AS upi_amount,
    SUM ("order".cash_amount)AS cash_amount,
    store.name AS location_name,
    "user".name As user_name,
    "status".name As status_name,
    "status".color_code As color_code,
    "order".id AS order_id,
    "order".type AS order_type
   FROM 
    order_product 
    LEFT JOIN 
    product_index  ON order_product.product_id = product_index.product_id 
    LEFT JOIN 
    store  ON order_product.store_id = store.id 
    LEFT JOIN 
    "order"  ON order_product.order_id = "order".id
    LEFT JOIN 
    "user"  ON "order".owner = "user".id
     LEFT JOIN 
    "status"  ON "order".status = "status".id
  
  `;
    if (whereClause) {
      sqlQuery = sqlQuery + ' WHERE ' + whereClause;
    }
    groupClause = 'GROUP BY order_product.id, order_product.product_id, store.name, "order".owner, "user".name, "status".name, "status".color_code, "order".id';
    sqlQuery = sqlQuery + groupClause;
    if (sortClause) {
      sqlQuery = sqlQuery + ' ORDER BY ' + sortClause;
    }

    sqlQuery = sqlQuery + ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};`

    let queryData = await db.connection.query(sqlQuery);
    let productList = queryData[1];

    const productData = productList.rows;

    if (showTotal) {
      let lastReCord = ObjectHelper.createEmptyRecord(productData[0]);
      lastReCord.cash_amount = totalAmount?.totalCashAmount || "";
      lastReCord.upi_amount = totalAmount?.totalUpiAmount || "";
      productData.push(lastReCord);
    }

    return res.json(200, {
      totalCount: productList.rowCount,
      currentPage: page,
      pageSize,
      data: productData,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
};

static async getTotalAmount(whereCondition) {

  const rawQuery = `
    SELECT 
      COALESCE(SUM("order"."upi_amount"), 0) AS "totalUpiAmount",
      COALESCE(SUM("order"."cash_amount"), 0) AS "totalCashAmount"
    FROM "order_product"
    LEFT JOIN 
    product_index  ON order_product.product_id = product_index.product_id 
    LEFT JOIN 
    store  ON order_product.store_id = store.id 
    LEFT JOIN 
    "order"  ON order_product.order_id = "order".id
    LEFT JOIN 
    "user"  ON "order".owner = "user".id
     LEFT JOIN 
    "status"  ON "order".status = "status".id
    WHERE ${whereCondition}
  `;

  const totalAmountResult = await db.connection.query(rawQuery, {
    type: QueryTypes.SELECT,
  });

  return {
    totalCashAmount: totalAmountResult && totalAmountResult[0]?.totalCashAmount,
    totalUpiAmount: totalAmountResult && totalAmountResult[0].totalUpiAmount,
  };
}
}
module.exports = OrderProductCancelledReportService;
