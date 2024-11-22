// Status
const { BAD_REQUEST, OK } = require('../../helpers/Response');
const Permission = require('../../helpers/Permission');
const { order, User:userModel } = require('../../db').models;
const { Op } = require('sequelize');

// Services
const OrderReportUserWiseService = require("../../services/OrderReportUserWiseService")
const DateTime = require('../../lib/dateTime');
const Response = require('../../helpers/Response');
const Order = require('../../helpers/Order');
const User = require("../../helpers/User");
const OrderProductConstants = require('../../helpers/OrderProduct');
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const { getSettingValue } = require("../../services/SettingService");
const Request = require("../../lib/request");
const Numbers = require("../../lib/Number");

async function search(req, res, next) {


  const params = req.query;
  let companyId = req.user && req.user.company_id;

  if (!companyId) {
    return res.send(Response.BAD_REQUEST, {
      message: 'Company Not Found',
    });
  }

  try {
    const hasPermission = await Permission.Has(Permission.ORDER_REPORT_VIEW, req);

    let data = await OrderReportUserWiseService.searchUser(params, companyId);

    const orderWhere = {};
    const userWhere = {};
    let { startDate, endDate, user, type, shift, paymentType } = req.query;
    let timeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)
    let total = 0;
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
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (date && Numbers.isNotNull(req.query?.date)) {
      orderWhere.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (user) {
      orderWhere.owner = user;
    }
    if (paymentType) {
      orderWhere.payment_type = paymentType;
    }

    userWhere.status =User.STATUS_ACTIVE;
    orderWhere.company_id = companyId;
    if (shift) orderWhere.shift = shift;

    const query = {
      // where: orderWhere,
      include: [
        {
          required: true,
          model: userModel,
          as: 'ownerDetail',
          where:userWhere
        },
      ],
      where: orderWhere,
      order: [['date', 'ASC']],
    };
    const orderDetail = await order.findAndCountAll(query);
    orderDetail.rows.forEach((value) => {
      total += Number(value.get('total_amount'));
    });
    data.totalAmount = total;
    if (!user) {
      if (type == OrderProductConstants.REPORT_TYPE_USER_WISE) {
        data.average = data.totalAmount / data.data.length;
        res.json(data, total);
      }else {
        if(type !== OrderProductConstants.REPORT_TYPE_USER_WISE){
        let orderProductData = await OrderReportUserWiseService.getDataBasedOnType(type, orderDetail.rows);
        let average = total / orderProductData?.length;
        res.json({
          data: orderProductData,
          totalAmount: total,
          average,
        });
      }
    } 
    } else {
      // let orderData
      if (type == OrderProductConstants.REPORT_TYPE_MONTH_WISE) {
        let arrayData = [];
        orderDetail.rows.forEach((value) => {
          let year = DateTime.getYear(value.date);
          year = String(year).slice(-2);
          let data = {
            amount: Number(value.get('total_amount')),
            date: DateTime.getMonth(value.date) + ' ' + year,
          };
          arrayData.push(data);
        });
        const groupedData = arrayData.reduce((acc, { date, amount }) => {
          if (!acc[date]) {
            acc[date] = 0;
          }
          acc[date] += amount;
          return acc;
        }, {});

        const groupedDataArray = Object.entries(groupedData).map(([date, amount]) => ({ date, amount }));
        const average = total / groupedDataArray.length;
        res.json({
          data: groupedDataArray,
          totalAmount: total,
          average,
        });
      }

      if (type == OrderProductConstants.REPORT_TYPE_DATE_WISE) {
        let arrayData = [];

        orderDetail.rows.forEach((value) => {
          let data = {
            date: DateTime.Format(value.date),
            amount: Number(value.get('total_amount')),
          };

          arrayData.push(data);
        });

        const groupedData = arrayData.reduce((acc, { date, amount }) => {
          if (!acc[date]) {
            acc[date] = 0;
          }
          acc[date] += amount;
          return acc;
        }, {});

        const groupedDataArray = Object.entries(groupedData).map(([date, amount]) => ({ date, amount }));
        const average = total / groupedDataArray.length;
        res.json({
          data: groupedDataArray,
          totalAmount: total,
          average,
        });
      }

      if (type == OrderProductConstants.REPORT_TYPE_USER_WISE) {


        let arrayData = [];

        orderDetail.rows.forEach((value) => {
          let data = {
            name: value?.ownerDetail?.name,
            totalAmount: Number(value.get('total_amount')),
          };
          arrayData.push(data);
        });
        const groupedData = arrayData.reduce((acc, { name, totalAmount }) => {
          if (!acc[name]) {
            acc[name] = 0;
          }
          acc[name] += totalAmount;
          return acc;
        }, {});

        const groupedDataArray = Object.entries(groupedData).map(([name, totalAmount]) => ({ name, totalAmount }));
        const average = total / groupedDataArray.length;
        res.json({
          data: groupedDataArray,
          totalAmount: total,
          average,
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
