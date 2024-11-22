const { BAD_REQUEST, OK } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");
const Request = require("../../lib/request");
const TransferProductReportService = require("../../services/TransferProductReportService");
const stockEntryProductService = require("../../services/StockEntryProductService");
const OrderProductService = require("../../services/OrderProductService");
const Permission = require("../../helpers/Permission");
const { getSettingValue } = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");
const Number = require("../../lib/Number");
const get = async(req, res) =>{
    try {
        const companyId = Request.GetCompanyId(req);
  
        const userId = Request.getUserId(req);
      
        let  stockEntryManageOthersPermission = await Permission.Has(Permission.STOCK_ENTRY_MANAGE_OTHERS, req);
        let  replenishmentViewPermission = await Permission.Has(Permission.REPLENISHMENT_VIEW, req);
        let  rewardViewPermission =  await Permission.Has(Permission.REWARD_VIEW, req);
        let  orderManageOthersPermission = await Permission.Has(Permission.ORDER_MANAGE_OTHERS, req);
        let userDefaultTimeZone = Request.getTimeZone(req)
        let currentDateTime = DateTime.getDateTimeByUserProfileTimezone(new Date(),userDefaultTimeZone)
        let where = new Object();
        let params = {
            company_id : companyId,
            user : userId,
            date : currentDateTime 
        }
        
        where.company_id = companyId;
        
        const response = { 
          stockEntryProductsCount: 0
        };
        
        if (replenishmentViewPermission) {
          let replenishedProductsCount = await TransferProductReportService.getCount(params,req);
            response.replenishedProductsCount =  replenishedProductsCount;
        }
        
        if ((Number.isNotNull(req?.user?.current_shift_id) && Number.isNotNull(req?.user?.current_location_id)) || stockEntryManageOthersPermission) {
          let params={
            company_id: companyId,
            user_id: userId,
            timeZone: userDefaultTimeZone,
            store_id: req?.user?.current_location_id ,
            shift_id: req?.user?.current_shift_id,
            manageOthers: stockEntryManageOthersPermission
          }
          let stockEntryProductsCount = await stockEntryProductService.getCount(params,req)
            response.stockEntryProductsCount = stockEntryProductsCount && stockEntryProductsCount?.stockEntryProduct;
        }
        
        if(rewardViewPermission){

        let start_date = DateTime.toGetISOStringWithDayStartTime(new Date())
        let end_date = DateTime.toGetISOStringWithDayEndTime(new Date())
          let param={
            companyId: companyId,
            userId: userId,
            startDate: DateTime.toGMT(start_date,userDefaultTimeZone),
            endDate: DateTime.toGMT(end_date,userDefaultTimeZone),
            manageOtherPermission: orderManageOthersPermission
          }
          let todayRewardCount = await OrderProductService.getRewardCount(param)
              response.todayRewardCount = todayRewardCount
          }
               return res.json(OK, response);
    } catch (err) {
        console.log(err);
        return res.json(BAD_REQUEST, { message: err.message });
    }
  };
  module.exports = {
    get,
};