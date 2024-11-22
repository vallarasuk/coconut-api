// Status
const { BAD_REQUEST, OK } = require('../../helpers/Response');
const Permission = require('../../helpers/Permission');
const { SaleSettlement, Location: locationModel } = require('../../db').models;
const { Op } = require('sequelize');

// Services
const service = require('../../services/SaleSettlememtReportService');
const DateTime = require('../../lib/dateTime');
const Location = require('../../helpers/Location');
const saleSettlement = require('../../helpers/SaleSettlement');
const SaleReport = require('../../helpers/SalesSettlementReport');
const Request = require("../../lib/request");
const Numbers = require("../../lib/Number");

async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.SALES_SETTLEMENT_REPORT_VIEW, req);

  
  let companyId = req.user && req.user.company_id;

  let timeZone = Request.getTimeZone(req)

  let date = DateTime.getCustomDateTime(req.query?.date, timeZone)

  if (!companyId) {
    return res.send(404, {
      message: 'Company Not Found',
    });
  }

  try {
    let data = await service.searchStore(req.query, companyId, timeZone, date);
    const saleWhere = {};
    const locationWhere = {};
    let { startDate, endDate, location, type, shift, paymentType } = req.query;

    if (startDate && !endDate) {
      saleWhere.date = {
        [Op.and]: {
          [Op.gte]: startDate,
        },
      };
    }

    if (endDate && !startDate) {
      saleWhere.date = {
        [Op.and]: {
          [Op.lte]: endDate,
        },
      };
    }

    if (startDate && endDate) {
      saleWhere.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }

    if (date && Numbers.isNotNull(req.query?.date)) {
      saleWhere.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (location) {
      saleWhere.store_id = location;
    }
    locationWhere.status = Location.STATUS_ACTIVE;
    locationWhere.allow_sale = Location.ENABLED;

    saleWhere.company_id = companyId;
    if (shift) saleWhere.shift = shift;

    const query = {
      // where: saleWhere,
      include: [
        {
          required: true,
          model: locationModel,
          as: 'location',
          where: locationWhere
        },
      ],
      where: saleWhere,
      order: [['date', 'ASC']],
    };
    let total = 0;

    const SalesDetail = await SaleSettlement.findAndCountAll(query);
    SalesDetail.rows.forEach((value) => {
      if (paymentType === saleSettlement.AMOUNT_CASH && value.amount_cash !== null) {
        total += Number(value.get('amount_cash'));
      }
      if (paymentType === saleSettlement.AMOUNT_UPI && value.amount_upi !== null) {
        total += Number(value.get('amount_upi'));
      }
      if (!paymentType) {
        total += Number(value.get('amount_upi'));
        total += Number(value.get('amount_cash'));
      }
    });
    data.totalAmount = total;

    if (!type && !location) {
      data.average = data.totalAmount / data.data.length;
      res.json(data, total);
    } else {
      let saleData = [];

      // type == 'month' && !paymentType

      if (type == 'month' && !paymentType) {
        let data = SaleReport.groupByMonth(SalesDetail);
        const average = total / data.length;
        res.json({
          data: data,
          totalAmount: total,
          average,
        });
      } else {
        SalesDetail.rows.forEach((value) => {
          let salesData = {
            date: value?.date,
            amount: Number(value.get('amount_upi')) + Number(value.get('amount_cash')),
            amount_cash: Number(value.get('amount_cash')),
            amount_upi: Number(value.get('amount_upi')),
          };
          saleData.push(salesData);
        });
      }

      if (type == 'month') {
        // paymentType = amount_cash
        if (paymentType == saleSettlement.AMOUNT_CASH) {
          let data = SaleReport.groupByMonth(saleData, saleSettlement.AMOUNT_CASH);
          const average = total / data.length;
          res.json({
            data: data,
            totalAmount: total,
            average,
          });
        }

        // paymentType = amount_upi
        if (paymentType == saleSettlement.AMOUNT_UPI) {
          let data = SaleReport.groupByMonth(saleData, saleSettlement.AMOUNT_UPI);
          const average = total / data.length;
          res.json({
            data: data,
            totalAmount: total,
            average,
          });
        }
      } else {
        // paymentType = ""
        if (!paymentType) {
          let data = SaleReport.groupByDate(saleData);
          const average = total / data.length;
          res.json({
            data: data,
            totalAmount: total,
            average,
          });
        }

        // paymentType = amount_cash
        if (paymentType == saleSettlement.AMOUNT_CASH) {
          let data = SaleReport.groupByDate(saleData, saleSettlement.AMOUNT_CASH);
          const average = total / data.length;
          res.json({
            data: data,
            totalAmount: total,
            average,
          });
        }

        // Type = amount_upi
        if (paymentType == saleSettlement.AMOUNT_UPI) {
          let data = SaleReport.groupByDate(saleData, saleSettlement.AMOUNT_UPI);
          const average = total / data.length;
          res.json({
            data: data,
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
