// Status
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const { Location: locationModel, orderProduct, productTag: productTagModel, productIndex } = require("../../db").models;
const { Op } = require("sequelize");

// Services
const orderProductReportService = require("../../services/OrderProductReportService");
const DateTime = require("../../lib/dateTime");
const Location = require("../../helpers/Location");
const Response = require("../../helpers/Response");
const Numbers = require("../../lib/Number");
const ArrayList = require("../../lib/ArrayList");
const OrderProductConstants = require("../../helpers/OrderProduct");
const Number = require("../../lib/Number");
const Status = require("../../helpers/Status");
const ObjectName = require("../../helpers/ObjectName");
const { getAllStatusByGroupId } = require("../../services/StatusService");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const Request = require("../../lib/request");

async function search(req, res, next) {
  const { sort , sortDir} = req.query;
  let companyId = req.user && req.user.company_id;

  if (!companyId) {
    return res.send(Response.BAD_REQUEST, {
      message: "Company Is Required",
    });
  }

  try {
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_GRAPH_REPORTS_VIEW, req);


    const orderWhere = {};
    const locationWhere = {};
    const productWhere = {};
    let { startDate, endDate, type, location, productTag, brand, category, product } = req.query;
    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    let statusDetail = await getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);

    const statusIdsArray = statusDetail && statusDetail.length >0 && statusDetail.map(status => status.id);

    if(statusIdsArray && statusIdsArray.length >0){
      orderWhere.status={[Op.notIn]: statusIdsArray }
    }

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)
    const startDates = new Date(date?.startDate);
    const endDates = (date?.endDate && date) ? new Date(date?.endDate) : new Date();


    const dateArray = [];

    while (startDates <= endDates) {
      dateArray.push(DateTime.Format(startDates));
      startDates.setDate(startDates.getDate() + 1);
    }

    let total = 0;
    let totalAmount =0
    if (startDate && !endDate) {
      orderWhere.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      orderWhere.order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (startDate && endDate) {
      orderWhere.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (date && Number.isNotNull(req.query.date)) {
      orderWhere.order_date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    let where = {};
    where.company_id = companyId;
    if (productTag) {
      where.tag_id = productTag;
    }

    const tagQuery = {
      where,
      attributes: ["product_id", "tag_id"],
    };
    const productIds = [];
    if (productTag) {
      let tagData = await productTagModel.findAll(tagQuery);
      for (let i = 0; i < tagData.length; i++) {
        productIds.push(tagData[i].product_id);
      }
    }

    productWhere.company_id = companyId;
    if (brand) {
      productWhere.brand_id = brand;
    }
    if (category) {
      productWhere.category_id = category;
    }

    if (product && productTag) {
      const filteredIds = productIds.filter((id) => id === Numbers.Get(product));
      orderWhere.product_id = { [Op.in]: filteredIds };
    }

    if (product && !productTag) {
      orderWhere.product_id = product;
    }
    if (!product && productTag) {
      orderWhere.product_id = productIds;
    }

    if (location) {
      orderWhere.store_id = location;
    }

    locationWhere.status = Location.STATUS_ACTIVE;
    orderWhere.company_id = companyId;

    const query = {
      // where: orderWhere,
      include: [
        {
          required: true,
          model: locationModel,
          as: "locationDetails",
          where: locationWhere,
          attributes: ["id", "name", "status"],
        },
        {
          required: true,
          model: productIndex,
          as: "productIndex",
          where: productWhere,
          attributes: ["brand_id", "category_id","brand_name","category_name","product_id","product_name"],
        },
      ],
      where: orderWhere,
      order: [["order_date", "ASC"]],
      attributes: ["order_date", "quantity","price"],
    };

    const orderDetail = await orderProduct.findAndCountAll(query);
    orderDetail.rows.forEach((value) => {
      total += Number.Get(value.get("quantity"));
      totalAmount += Number.Get(value.get("price"));
    });

    if (!location) {
       if (type == OrderProductConstants.REPORT_TYPE_LOCATION_WISE) {
        let groupByData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir,sort,sortDir);
          let average = total / groupByData?.length;
          let totalAverage = totalAmount / groupByData?.length;
          res.json({
            data: groupByData,
            totalQuantity: total,
            average,
            totalAmount: totalAmount,
            totalAverage: totalAverage
          });
      }else if(type == OrderProductConstants.REPORT_TYPE_BRAND_WISE){
    
        let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir,sort,sortDir);

        let average = total / groupedData?.length;
        let totalAverage = totalAmount / groupedData?.length;
        res.json({
          data: groupedData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });

    }else if(type == OrderProductConstants.REPORT_TYPE_CATEGORY_WISE){
    
      let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);
      let average = total / groupedData?.length;
      let totalAverage = totalAmount / groupedData?.length;
      res.json({
        data: groupedData,
        totalQuantity: total,
         average,
         totalAmount: totalAmount,
         totalAverage: totalAverage
      });

  }else if(type == OrderProductConstants.REPORT_TYPE_PRODUCT_WISE){
    
      let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);
      let average = total / groupedData?.length;
      let totalAverage = totalAmount / groupedData?.length;
      res.json({
        data: groupedData,
        totalQuantity: total,
         average,
         totalAmount: totalAmount,
         totalAverage: totalAverage
      });

  } else {
        let orderProductData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir, dateArray);
        let average = total / orderProductData?.length;
        let totalAverage = totalAmount / orderProductData?.length;
        res.json({
          data: orderProductData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });

      }
    } else {
      if (type == OrderProductConstants.REPORT_TYPE_MONTH_WISE) {
        let orderProductData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir, dateArray);
        let average = total / orderProductData?.length;
        let totalAverage = totalAmount / orderProductData?.length;
        res.json({
          data: orderProductData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });
      }

      if (type == OrderProductConstants.REPORT_TYPE_DATE_WISE) {
        let orderProductData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir, dateArray);
        let average = total / orderProductData?.length;
        let totalAverage = totalAmount / orderProductData?.length;
        res.json({
          data: orderProductData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });
      }
      if (type == OrderProductConstants.REPORT_TYPE_LOCATION_WISE) {
        let groupByData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);
        let average = total / groupByData?.length;
        let totalAverage = totalAmount / groupByData?.length;
        res.json({
          data: groupByData,
          totalQuantity: total,
          average,
          totalAmount: totalAmount,
          totalAverage: totalAverage
        });
      }
      if(type == OrderProductConstants.REPORT_TYPE_BRAND_WISE){

        let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);

        let average = total / groupedData?.length;
        let totalAverage = totalAmount / groupedData?.length;
        res.json({
          data: groupedData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });
      }

      if(type == OrderProductConstants.REPORT_TYPE_PRODUCT_WISE){

        let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);

        let average = total / groupedData?.length;
        let totalAverage = totalAmount / groupedData?.length;
        res.json({
          data: groupedData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });
      }
      if(type == OrderProductConstants.REPORT_TYPE_CATEGORY_WISE){
    
        let groupedData = await orderProductReportService.getDataByType(type, orderDetail.rows,sort,sortDir);
        let average = total / groupedData?.length;
        let totalAverage = totalAmount / groupedData?.length;
        res.json({
          data: groupedData,
          totalQuantity: total,
           average,
           totalAmount: totalAmount,
           totalAverage: totalAverage
        });
  
    }
    }
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
}
module.exports = search;
