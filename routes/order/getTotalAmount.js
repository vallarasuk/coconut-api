const { BAD_REQUEST, OK }  = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");
// Services
const orderService = require("../../services/OrderService");
const DateTime = require("../../lib/dateTime");
const Setting = require("../../helpers/Setting");
const { getSettingValue } = require("../../services/SettingService");
const { TODAY_VALUE } = require("../../helpers/Date");

async function getTotalAmount(req, res, next) {
    try {
      const orderViewPermission = await Permission.Has(Permission.ORDER_VIEW, req);
      if(orderViewPermission){

      const hasOrderManageOthersPermission = await Permission.Has(Permission.ORDER_MANAGE_OTHERS, req);
      let userId;
      if (!hasOrderManageOthersPermission) {
        userId = req && req.user && req.user.id;
      }
      const companyId = Request.GetCompanyId(req);
  
      const defaultTimeZone = Request.getTimeZone(req);


    let date = DateTime.getCustomDateTime(TODAY_VALUE, defaultTimeZone)

      let params ={
        startDate:date.startDate,
        endDate:date.endDate,
        userId: userId,
        companyId: companyId,
        timeZone : defaultTimeZone
      }
      const todayTotalAmount = await orderService.getTotalAmount(params);
  
      res.json({
        todayAmount: todayTotalAmount
      });
    }
    } catch (err) {
      console.log(err);
      res.status(BAD_REQUEST).json({
        message: err.message
      });
    }
  }
  
  module.exports = getTotalAmount;
  
