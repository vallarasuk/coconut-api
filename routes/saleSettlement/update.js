const { BAD_REQUEST } = require("../../helpers/Response");
const { Op } = require("sequelize");

// Model
const { SaleSettlement, Location, User, Shift,status: statusModel } = require("../../db").models;

// Lib
const Request = require("../../lib/request");
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const Currency = require("../../lib/currency");
const DateTime = require('../../lib/dateTime');
const Number = require("../../lib/Number");
const String = require("../../lib/string");
const Status = require("../../helpers/Status");
const SaleSettlementNotification = require("../../services/notifications/SaleSettlement");
const ShiftService = require("../../services/ShiftService");
const LocationService = require("../../services/LocationService");
const Response = require("../../helpers/Response");

async function update(req, res, next) {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_EDIT, req);

  

  let data = req.body;
  let { id } = req.params;
  try {
    let company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }

    const include = [{
      required: true,
      model: Location,
      as: "location",
      attributes: ["id", "name"],
  },
  {
      required: true,
      model: Shift,
      as: "shiftDetail",
  },
  {
      model: User,
      as: "salesExecutive",
  },
  {
      required: false,
      model: statusModel,
      as: 'statusDetail',
  },
  ];
    let saleSettlementData = await SaleSettlement.findOne({
      where: { id: id, company_id },
      include
    });
    if (!saleSettlementData) {
      return res.json(BAD_REQUEST, { message: "Sales Detail Not Found" });
    }
    let currentLocationId = data?.storeId ? data?.storeId:Request.getCurrentLocationId(req);
    let currentShiftId =  data?.shift? data?.shift:Request.getCurrentShiftId(req);

    const salesExist = await SaleSettlement.findOne({
      where: {
        store_id: currentLocationId,
        shift: currentShiftId,
        date: new Date(data.date),
        id: { [Op.ne]: id },
      },
    });

    if (salesExist) {
      return res.json(BAD_REQUEST, {
        message: "Sales Entry Already Exists",
      });
    }

    let updateData = {};

    if (Number.isNotNull(data.storeId)) updateData.store_id = data && data.storeId;
    if (data.date) updateData.date = data && data.date;
    if (Number.isNotNull(data && data.shift)) updateData.shift = data && data.shift;
    updateData.amount_cash = data && data.amount_cash;
    updateData.amount_upi = data && data.amount_upi;
    updateData.discrepancy_amount_cash = Number.Get(data && data.amount_cash) - Number.Get(saleSettlementData.order_cash_amount) ;

    updateData.discrepancy_amount_upi = Number.Get(data && data.amount_upi) - Number.Get(saleSettlementData.order_upi_amount) ;

    updateData.total_discrepancy_amount = Number.Get(updateData.discrepancy_amount_cash) + Number.Get(updateData.discrepancy_amount_upi);

    updateData.calculated_amount_cash = data && data.calculated_amount_cash &&  data.calculated_amount_cash ;

    updateData.calculated_amount_upi = data && data.calculated_amount_upi && data.calculated_amount_upi ;

    updateData.received_amount_upi = data && data.received_amount_upi &&  data.received_amount_upi ;

    updateData.received_amount_cash = data && data.received_amount_cash && data.received_amount_cash ;
    // update owner id
    updateData.owner_id = data && data.owner;

    //validate salesexecutive exist or not
    if (Number.isNotNull(data && data.salesExecutive)) {
      updateData.sales_executive = data && data.salesExecutive;
    }
    updateData.notes = data.notes;
    updateData.reviewer = data && data.reviewer && Number.Get(data.reviewer);
    if(data?.due_date) { 
      updateData.due_date = data && data?.due_date;
    }
    updateData.cash_in_store = data && data.cash_in_store;
    updateData.cash_to_office = data && data.cash_to_office ;
    updateData.total_amount = data && (Number.Get( data.amount_cash) + Number.Get(data && data.amount_upi));
    updateData.total_calculated_amount = data && (Number.Get( data.calculated_amount_cash) + Number.Get(data && data.calculated_amount_upi));
    updateData.total_received_amount =data &&  (Number.Get( data.received_amount_cash) + Number.Get(data && data.received_amount_upi));

    
    if (data && data.status) updateData.status = data && data.status.value;
    await SaleSettlement.update(updateData, {
      where: { id, company_id },
    });


    let logMessage = new Array();

    if(Number.isNotNull(updateData?.store_id)){
      if (Number.Get(updateData?.store_id) !== Number.Get(saleSettlementData?.store_id  )) {
      let locationName = await Location.findOne({
        where: { id: data.storeId },
      });
      logMessage.push(`Store Name changed to ${locationName.name}\n`);
    }
  }

    if (updateData && updateData?.date && updateData?.date !== saleSettlementData?.date) {
      logMessage.push(`Date changed to ${DateTime.shortMonthDate(updateData?.date)}\n`);
    }

    if (updateData && updateData?.due_date  &&DateTime.shortMonthDate(updateData?.due_date) !== DateTime.shortMonthDate(saleSettlementData?.due_date)) {
      logMessage.push(`Due Date changed to ${DateTime.shortMonthDate(updateData?.due_date)}\n`);
    }

    if(Number.isNotNull(updateData?.sales_executive)){
    if (Number.Get(updateData?.sales_executive) !== Number.Get(saleSettlementData?.sales_executive)) {
      let userDetail = await User.findOne({
        where: { id: data.salesExecutive },
      });
      let OldUserName = String.concatName(saleSettlementData?.salesExecutive?.name,saleSettlementData?.salesExecutive?.last_name)

      let userName = String.concatName(userDetail?.name,userDetail?.last_name);
      logMessage.push(`Sales Executive changed from ${OldUserName} to ${userName}\n`);
    }
  }
  

if(Number.isNotNull(updateData?.sales_executive)){
    if (Number.Get(updateData?.reviewer) !== Number.Get(saleSettlementData?.reviewer)) {
      let reviewerDetail = await User.findOne({
        where: { id: saleSettlementData?.reviewer },
      });
      let userDetail 
      if(Number.isNotNull(data?.reviewer)){
        userDetail = await User.findOne({
          where: { id: data?.reviewer },
        });
      }
     

      let OldUserName = String.concatName(reviewerDetail?.name,reviewerDetail?.last_name)
      let userName = String.concatName(userDetail?.name,userDetail?.last_name);
      logMessage.push(`Reviewer changed from ${OldUserName} to ${userName}\n`);
    }
    }

    if(Number.isNotNull(updateData.shift)){
    if (Number.Get(updateData?.shift) !== Number.Get(saleSettlementData?.shift)) {
      let shiftDetail = await Shift.findOne({
        where: { id: updateData.shift },
      });
      logMessage.push(`Shift changed from ${saleSettlementData?.shiftDetail?.name} to ${shiftDetail.name}\n`);
    }
  }

    if (updateData && updateData?.amount_cash && Number.GetFloat(updateData?.amount_cash) !== Number.GetFloat(saleSettlementData?.amount_cash) ) {
      logMessage.push(`Cash Amount changed to ${Currency.IndianFormat(updateData?.amount_cash)}\n`);
    }

    if (updateData && updateData?.amount_upi && Number.GetFloat(updateData?.amount_upi) !== Number.GetFloat(saleSettlementData?.amount_upi) ) {
      logMessage.push(`UPI Amount changed to ${Currency.IndianFormat(updateData?.amount_upi)}\n`);
    }

    if (updateData && updateData?.calculated_amount_cash && Number.GetFloat(updateData?.calculated_amount_cash) !== Number.GetFloat(saleSettlementData?.calculated_amount_cash) ) {
      logMessage.push(`Calculated Cash changed to ${Currency.IndianFormat(updateData?.calculated_amount_cash)}\n`);
    }

    if (updateData && updateData?.calculated_amount_upi && Number.GetFloat(updateData?.calculated_amount_upi) !== Number.GetFloat(saleSettlementData?.calculated_amount_upi) ) {
      logMessage.push(`Calculated UPI Amount changed fto ${Currency.IndianFormat(updateData?.calculated_amount_upi)}\n`);
    }

    if (updateData && updateData?.received_amount_cash && Number.GetFloat(updateData?.received_amount_cash) !== Number.GetFloat(saleSettlementData?.received_amount_cash) ) {
      logMessage.push(`Received Cash Amount changed to ${Currency.IndianFormat(updateData?.received_amount_cash)}\n`);
    }

    if (updateData && updateData?.received_amount_upi && Number.GetFloat(updateData?.received_amount_upi) !== Number.GetFloat(saleSettlementData?.received_amount_upi) ) {
      logMessage.push(`Received UPI Amount changed to ${Currency.IndianFormat(updateData?.received_amount_upi)}\n`);
    }

    if (updateData && updateData?.cash_in_store && Number.GetFloat(updateData?.cash_in_store) !== Number.GetFloat(saleSettlementData?.cash_in_store) ) {
      logMessage.push(`Cash In Store changed to ${Currency.IndianFormat(updateData?.cash_in_store)}\n`);
    }

    if (updateData && updateData?.cash_to_office && Number.GetFloat(updateData?.cash_to_office) !== Number.GetFloat(saleSettlementData?.cash_to_office) ) {
      logMessage.push(`Cash To Office changed to ${Currency.IndianFormat(updateData?.cash_to_office)}\n`);
    }

    if (updateData && updateData?.notes && (updateData?.notes) !==(saleSettlementData?.notes)) {
      const newNotes = String.Get(updateData?.notes);
      
      logMessage.push(`Notes changed to ${newNotes}\n`);
    }

    let orderCashMismatch=0
    let orderUpiMismatch=0
    let storeAmountMismatch=0
 
    

    if(Number.Get(data?.amount_cash) < Number.Get(saleSettlementData?.order_cash_amount)){
     orderCashMismatch = Number.Get(saleSettlementData?.order_cash_amount) - Number.Get(data?.amount_cash)
   }
   
   if(Number.Get(data?.amount_upi) < Number.Get(saleSettlementData?.order_upi_amount)){
     orderUpiMismatch = Number.Get(saleSettlementData?.order_upi_amount) - Number.Get(data?.amount_upi)
   }
   let getStoreDetail = await Location.findOne({ where: { id: saleSettlementData?.store_id, company_id: company_id } });
 
   if (Number.Get(data?.cash_in_store) < Number.Get(getStoreDetail?.cash_in_location)) {
     storeAmountMismatch = Number.Get(getStoreDetail?.cash_in_location) - Number.Get(data?.cash_in_store);
   }
    // systemLog
    res.json(Response.OK, {
      message: "Sales Settlement Data Updated",
      orderCash: orderCashMismatch,
      orderUpi: orderUpiMismatch,
      storeAmount: storeAmountMismatch
    });
    res.on("finish", async () => {
      //create system log for sale updation
      if (logMessage && logMessage.length > 0) {
        let message = logMessage.join();
        History.create(`${message}`, req, ObjectName.SALE_SETTLEMENT, id);
      }
      else {
        History.create("Sale Settlement Updated", req, ObjectName.SALE_SETTLEMENT, id);
      }
      if ((Number.isNotNull(saleSettlementData?.statusDetail?.notify_to_reviewer == Status.NOTIFY_TO_REVIEWER_ENABLED) && Number.isNotNull(saleSettlementData?.reviewer) && Number.Get(updateData?.reviewer) !== Number.Get(saleSettlementData?.reviewer))) {
        let locationDetail = await LocationService.getLocationDetails(saleSettlementData?.store_id, company_id);
        let shiftDetail = await ShiftService.getShiftById(saleSettlementData?.shift, company_id)
        let notifParams = {
          company_id: company_id,
          reviwer_id: updateData?.reviewer,
          SsId: id,
          data: { ...saleSettlementData, locationName: locationDetail?.name, shiftName: shiftDetail?.name }
        }
        await SaleSettlementNotification.sendReviwerChangeSlackNotification(notifParams)
      }
    });
  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = update;
