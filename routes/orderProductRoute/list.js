const Permission = require('../../helpers/Permission');
const { Op, Sequelize } = require('sequelize');
const db = require('../../db');
const History = require('../../services/HistoryService');
const DateTime = require('../../lib/dateTime');
const vendorProductService = require("../../services/VendorProductService");
const StatusService = require("../../services/StatusService");
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const Request = require("../../lib/request");
const ObjectHelper = require("../../helpers/ObjectHelper");
const Numbers = require("../../lib/Number");
async function list(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_REPORT_VIEW, req);
    
    const params = req.query;
    let companyId = req.user && req.user.company_id;
    let { page, pageSize, search, sort, sortDir, pagination, status, location, startDate, endDate, brand, category, account ,product,startTime,endTime, showTotal} =
    params;

    let timeZone = Request.getTimeZone(req);

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
      profit_amount:"profit_amount",
      price:"price",
      mrp : "mrp",
      sale_price:"sale_price"
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

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)
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
    let startTimeValue = DateTime.getGmtHoursAndMinutes(startTime);
    let endTimeValue = DateTime.getGmtHoursAndMinutes(endTime);
    const searchTerm = search ? search.trim() : null;
    let totalAmountWhere = new Object();
    let filterProductId = new Array()
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
      whereClause += ` order_product.status NOT IN (${statusIdsArray}) `;
    }
    if (location) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.store_id= ${location} `;
      totalAmountWhere.store_id = location;
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
    //startDate and startTime
    if (startDate && !endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" > '${DateTime.toGMT(start_date,timeZone)}' `;
      
            totalAmountWhere.order_date = {
              [Op.and]: {
                [Op.gte]: DateTime.toGMT(start_date,timeZone),
              },
            };
      if(startTime){
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])} `;
        totalAmountWhere.createdAt = {
          [Op.and] : {
            [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),
        },
              } 
                 }
      if(endTime){
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])} `;
        totalAmountWhere.createdAt={
          [Op.and] : {
          [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
        },
              }
                  }
    }
   // endDate and endTime
    if (endDate && !startDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" < '${DateTime.toGMT(end_date,timeZone)}' `;
      if(startTime){
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."order_date"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])} `;
        totalAmountWhere.createdAt={
          [Op.and] : {
            [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),
        },
      }
      }
      if(endTime){
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])} `;
        totalAmountWhere.createdAt = {
          [Op.and] : {
            [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
        },
      }  
      }
      totalAmountWhere.order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }
    //startDate endDate and startTime endTime
    if (startDate && endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${DateTime.toGMT(start_date,timeZone)}' AND '${DateTime.toGMT(end_date,timeZone)}' `;
      if (startTime && endTime) {
        whereClause += `
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}
        `;

        totalAmountWhere.createdAt = {
          [Op.and] : {
          [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),

          [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
        },
      }  
      }
      
      totalAmountWhere.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }
    if(!startDate && !endDate && startTime && !endTime){
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."createdAt" > '${startTime}' `;
      totalAmountWhere.createdAt = {
        [Op.and]: {
          [Op.gte]: startTime,
        },
      };
    }
    //endTime
    if(!startDate && !endDate && !startTime && endTime){
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."createdAt" < '${endTime}' `;
      totalAmountWhere.createdAt = {
        [Op.and]: {
          [Op.lte]: endTime,
        },
      };
    }
   //startTime and endTime
    if(!startDate && !endDate && startTime && endTime){
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${startTime}' AND '${endTime}' `;
      totalAmountWhere.createdAt = {
        [Op.and]: {
          [Op.gte]: startTime,
          [Op.lte]: endTime,
        },
      };
    }

    if (date && Numbers.isNotNull(req.query.date)) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${date?.startDate}' AND '${date?.endDate}' `;
      if (startTime && endTime) {
        whereClause += `
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}
        `;

        totalAmountWhere.createdAt = {
          [Op.and] : {
          [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),

          [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
        },
      }  
      }
      
      totalAmountWhere.order_date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
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
    if (sort == 'quantity') {
      sortClause += `  ${sort} ${sortDir || 'ASC'}`;
    }
    if (sort == 'profit_amount') {
      sortClause += `  ${sort} ${`${sortDir} NULLS LAST` || 'ASC NULLS LAST'}`;
    }
    if (sort == 'price') {
      sortClause += `  ${sort} ${`${sortDir} NULLS LAST` || 'ASC NULLS LAST'}`;
    }
    if (sort == 'mrp') {
      sortClause += `  ${sort} ${`${sortDir} NULLS LAST` || 'ASC NULLS LAST'}`;
    }
    if (sort == 'sale_price') {
      sortClause += `  ${sort} ${`${sortDir} NULLS LAST` || 'ASC NULLS LAST'}`;
    }
    if (!sort) {
      sortClause += `  ${"quantity"} ${'DESC'}`;
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
    MAX (product_index.brand_name)AS brand_name,
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
    MAX (product_index.status)AS status
   FROM 
    order_product 
    LEFT JOIN 
    product_index  ON order_product.product_id = product_index.product_id 
  
  `;
    if (whereClause) {
      sqlQuery = sqlQuery + ' WHERE ' + whereClause;
    }
    groupClause = 'GROUP BY order_product.product_id';
    sqlQuery = sqlQuery + groupClause;
    if (sortClause) {
      sqlQuery = sqlQuery + ' ORDER BY ' + sortClause;
    }
    let totalAmount = 0;
    let totalProfitAmount = 0;
    let totalQuantity = 0;
    let totalSalePrice = 0;
    let queryData = await db.connection.query(sqlQuery);
    let productList = queryData[1];
    const orderProductList = productList.rows;
    for (let i = 0; i < orderProductList.length; i++) {
      const { profit_amount, price, quantity, sale_price } = orderProductList[i]
      totalAmount += Number(price);
      totalProfitAmount += Number(profit_amount);
      totalSalePrice += Number(sale_price);
      totalQuantity += Number(quantity);
    }
    const offset = (page - 1) * pageSize;
    const productData = productList.rows.slice(offset, offset + pageSize);
    if (showTotal) {
      let lastReCord = ObjectHelper.createEmptyRecord(productData[0]);
      lastReCord.sale_price = totalSalePrice || "";
      lastReCord.quantity = totalQuantity || "";
      lastReCord.price = totalAmount || "";
      lastReCord.profit_amount = totalProfitAmount || "";
      productData.push(lastReCord);
    }
    return res.json(200, {
      totalCount: productList.rowCount,
      currentPage: page,
      pageSize,
      totalAmount:totalAmount,
      totalProfitAmount: totalProfitAmount,
      data: productData,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
}
module.exports = list;
