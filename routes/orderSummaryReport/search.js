// Status
const { BAD_REQUEST, OK } = require('../../helpers/Response');
const Permission = require('../../helpers/Permission');
const { order, Location: locationModel } = require('../../db').models;
const { Op } = require('sequelize');

// Services
const orderReportService = require('../../services/OrderReportService');
const DateTime = require('../../lib/dateTime');
const Location = require('../../helpers/Location');
const Response = require('../../helpers/Response');
const Order = require('../../helpers/Order');
const OrderProductConstants = require('../../helpers/OrderProduct');
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");
const StatusService = require('../../services/StatusService');
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const Request = require("../../lib/request");
const Numbers = require("../../lib/Number");

async function search(req, res, next) {
  try {
    const params = req.query;

    let companyId = req.user && req.user.company_id;

    if (!companyId) {
      return res.send(Response.BAD_REQUEST, {
        message: 'Company Not Found',
      });
    }

    const hasPermission = await Permission.Has(Permission.ORDER_REPORT_VIEW, req);

    

    let statusDetail = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_CANCELLED, companyId);

    const orderWhere = {};
    const locationWhere = {};
    let { startDate, endDate, location, type, shift, paymentType, sortType } = req.query;



    let timeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)

    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    let total = 0;
    let totalCount = 0;

    if(Numbers.isNotNull(statusDetail)){
      orderWhere.status = { [Op.ne]: statusDetail?.id }
    }

    if (startDate && !endDate) {
      orderWhere.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      orderWhere.date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (startDate && endDate) {
      orderWhere.date = {
        [Op.and]: {
          [Op.gte]:  DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (date && Numbers.isNotNull(req?.query?.date)) {
      orderWhere.date = {
        [Op.and]: {
          [Op.gte]:  date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (location) {
      orderWhere.store_id = location;
    }
    if (paymentType) {
      orderWhere.payment_type = paymentType;
    }

    locationWhere.status = Location.STATUS_ACTIVE;
    locationWhere.allow_sale = Location.ENABLED;
    orderWhere.company_id = companyId;
    if (shift) orderWhere.shift = shift;

    const query = {
      include: [
        {
          required: true,
          model: locationModel,
          as: 'location',
          where: locationWhere,
        },
      ],
      where: orderWhere,
      order: [['date', 'ASC']],
      attributes: ["id", "date", "store_id", "payment_type", "shift","company_id","status","total_amount"],
    };
    const orderDetail = await order.findAndCountAll(query);

  
    for (const order of orderDetail.rows) {
      if( order.total_amount !== null){
       totalCount = orderDetail.count;
        total += Number(order.total_amount,0);
      }
    }

    if (!location) { 
      let data = await orderReportService.searchStore(params, companyId,orderDetail);

      if (type == OrderProductConstants.REPORT_TYPE_LOCATION_WISE && sortType !== OrderProductConstants.REPORT_TYPE_QUANTITY_WISE) {
        data.totalAmount = total;

        data.totalCount = totalCount;
        data.average = data.totalAmount / data.data.length;
        res.json(data, total);
      } else {
        if (type !== OrderProductConstants.REPORT_TYPE_LOCATION_WISE) {
          let orderProductData = await orderReportService.getDataBasedOnType(type, orderDetail, sortType);

          if (sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE) {
            let average = totalCount / orderProductData?.length;
            res.json({
              data: orderProductData,
              totalCount: totalCount,
              average,
            });
          } else {
            let average = total / orderProductData?.length;
            res.json({
              data: orderProductData,
              totalAmount: total,
              average,
            });
          }
        }
        if (sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE && type == OrderProductConstants.REPORT_TYPE_LOCATION_WISE) {
          data.totalAmount = total;

          data.totalCount = totalCount;
          data.average = data.totalCount / data.data.length;
          res.json(data, data.data.length);
        }
      }
    } else {
      // type == "Month Wise"
      if (type == OrderProductConstants.REPORT_TYPE_MONTH_WISE) {
        let arrayData = [];
        let year;
        let data;
        orderDetail.rows.forEach((value) => {
          year = null;
          data = null;
          year = DateTime.getYear(value.date);
          year = String(year).slice(-2);
          data = {
            amount: Number(value.get('total_amount')),
            date: DateTime.getMonth(value.date) + ' ' + year,
            totalCount: orderDetail.rows.filter((i) => i.date === value.date).length,
          };
          arrayData.push(data);
        });

        arrayData = arrayData.reduce((result, item) => {
          let existingItem = result.find((i) => i.date === item.date);

          if (existingItem) {
            existingItem.amount += item.amount;
            existingItem.totalCount += item.totalCount;
          } else {
            result.push({ ...item });
          }

          return result;
        }, []);

        if (sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE) {
          let average = totalCount / arrayData?.length;
          res.json({
            data: arrayData,
            totalCount: totalCount,
            average,
          });
        } else {
          let average = total / arrayData?.length;
          res.json({
            data: arrayData,
            totalAmount: total,
            average,
          });
        }
      }

      // type == "Date Wise"
      if (type == OrderProductConstants.REPORT_TYPE_DATE_WISE) {
        let arrayData = [];
        let data;

        orderDetail.rows.forEach((value) => {
          data = null;
          data = {
            date: DateTime.Format(value.date),
            amount: Number(value.get('total_amount')),
            totalCount: orderDetail.rows.filter((i) => i.date === value.date).length,
          };

          arrayData.push(data);
        });

        arrayData = arrayData.reduce((result, item) => {
          let existingItem = result.find((i) => i.date === item.date);

          if (existingItem) {
            existingItem.amount += item.amount;
            existingItem.totalCount += item.totalCount;
          } else {
            result.push({ ...item });
          }
          return result;
        }, []);

        // sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE

        if (sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE) {
          let average = totalCount / arrayData?.length;
          res.json({
            data: arrayData,
            totalCount: totalCount,
            average,
          });
        } else {
          let average = total / arrayData?.length;
          res.json({
            data: arrayData,
            totalAmount: total,
            average,
          });
        }
      }

      if (type == OrderProductConstants.REPORT_TYPE_LOCATION_WISE) {
        let arrayData = [];
        let data;

        orderDetail.rows.forEach((value) => {
          data = null;
          data = {
            name: value.location.name,
            totalAmount: Number(value.get('total_amount')),
            totalCount: orderDetail.count,
          };
          arrayData.push(data);
        });
        const groupedData = arrayData.reduce((acc, { name, totalAmount, totalCount }) => {
          if (!acc[name]) {
            acc[name] = {
              totalAmount: 0,
              totalCount: 0,
            };
          }
          acc[name].totalAmount += totalAmount;
          acc[name].totalCount = totalCount;
          return acc;
        }, {});

        const groupedDataArray = Object.entries(groupedData).map(([name, { totalAmount, totalCount }]) => ({
          name,
          totalAmount,
          totalCount,
        }));

        if (sortType == OrderProductConstants.REPORT_TYPE_QUANTITY_WISE) {
          let average = totalCount / groupedDataArray?.length;
          res.json({
            data: groupedDataArray,
            totalCount: totalCount,
            average,
          });
        } else {
          let average = total / groupedDataArray?.length;
          res.json({
            data: groupedDataArray,
            totalAmount: total,
            average,
          });
        }
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
