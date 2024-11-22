// Verify Token
const verifySchedulerAuthorization = require("../../middleware/verifySchedulerAuthorization");
const verifyToken = require("../../middleware/verifyToken");

const noActivityNotification = require("./slack/noActivityNotification.js");
const noCheckinActivityReport = require("./reports/noCheckinActivityReport.js");
const AttendanceAddAbsent = require("./attendance/AttendanceAddAbsent.js");

// Jira Sync
const goalStatusNotification = require("./slack/goalStatusNotification.js");

const createDefaultRecord = require("./setup/createDefaultRecord.js");

const country = require("./sync/country.js");
const vendorProductProductSync = require("./sync/vendorProductSync.js");

// Sale Job

const ProductIndex = require("./product/productIndex.js");

const userRole = require("./user/userRole.js");

const SaleDiscrepancyJob = require("./saleSettlement/saleDiscrepancyUpdateJob.js");
const productMedia = require("./product/productMediaToMediaMigration.js");
const SalesReportMail = require("./sale/saleReportEmailJob.js");
const updatePrice = require("./product/priceUpdate.js");
const regenerateSaleNumber = require("./saleSettlement/regenerateSaleNumber.js");
const regenerateBillNumber = require("./bill/regenerateBillNumber.js");
const syncAttendanceFromTracker = require("./sync/syncAttendanceFromTracker.js");
const updateAttendanceLateAndOvertimeHours = require("./attendance/updateAttendanceLateAndOvertimeHours.js");
const sendAttendanceMissingReportEmail = require("./attendance/sendAttendanceMissingReportEmail.js");
const createDefaultRecordJob = require("./setup/createDefaultRecord.js");
const storeShortageProductNofitication = require("./locationProduct/storeShortageProductNofitication.js");
const storeExcessProductNofitication = require("./locationProduct/storeExcessProductNofitication.js");
const updatePurchaseProductStoreId = require("./purchaseProduct/updatePurchaseProductStoreId.js");
const dailyOrderReportEmail = require("./reports/dailyOrderReportEmail.js");
const storeProductUpdateMinMaxQuantity = require("./locationProduct/storeProductUpdateMinMaxQuantity.js");
const dailyProductSaleReportEmail = require("./reports/dailyProductSaleReportMail.js");
const stockEntryCreateBasedOnLocation = require("./stockEntry/stockEntryCreateBasedOnLocation.js");
const storeNoCheckInNotification = require("./location/storeNoCheckInNotification.js");
const updateReplenishment = require("./replenish/updateReplenishment.js");
const createReplenishment = require("./replenish/createReplenishment.js");
const returnTransferForExcessQuantity = require("./transfer/returnTransferForExcessQuantity.js");
const noOrderReport = require("./reports/noOrderReport.js");
const attendanceDailyReportNotification = require("./attendance/attendanceReport.js");
const stockEntryDailyReport = require("./stockEntry/stockEntryDailyReport.js");
const salesSettlementMisssingReport = require("./saleSettlement/salesSettlementMisssingReport.js");
const ticketIndex = require("./ticket/ticketIndex.js");
const noInProgressTicketNotification = require("./ticket/noIProgressTicketNotification.js.js");
const cancelledOrders = require("./order/cancelledOrderNotification.js");
const locationProductReindex = require("./locationProduct/locationProductReindex.js");
const createSaleMissingTicekt = require("./saleSettlement/createMissingSaleSettlementticket.js");
const orderProductTop50report = require("./reports/orderProductTop50report.js");
const orderTop50Report = require("./reports/orderTop50Report.js");
const stockEntryProductStatusUpdateJob = require("./stockEntryProduct/stockEntryProductStatusUpdateJob.js");
const summaryReport = require("./reports/storeSummaryReport.js");
const RecurringTaskJob = require("./recurringTask/RecurringTaskJob.js");
const LocationOpeningReport = require("./reports/LocationOpeningReport.js");
const purchaseOrderCreate = require("./purchaseOrder/purchaseOrderCreate.js");
const AddMonthlyLeaveBalance = require("./user/AddMonthlyLeaveBalance.js");
const AddUserProfilePictureFromAttendance = require("./user/AddUserProfilePictureFromAttendance.js");
const UserReindex = require("./user/UserReindex.js");
const UserStartdateAndEnddateFromAttendance = require("./user/AddUserStartdateAndEnddateFromAttendance.js");
const locationProductAddMissingProducts = require("./locationProduct/LocationProductAddMissingProducts.js");
const billPendingreport = require("./reports/billPendingreport.js");
const purchasePendingreport = require("./reports/purchasePendingreport.js");
const paymentPendingreport = require("./reports/paymentPendingreport.js");
const accountProductUpdateFromPurchaseProduct = require("./accountProduct/accountProductUpdateFromPurchaseProduct.js");
const addMissingAttendanceRecord = require("./attendance/AddMissedAttendanceRecord.js");
const transferProductDailyExpireReturnProductsReport = require("./transfer/transferProductDailyExpireReturnProductsReport.js");
const RecurringMissingTaskJob = require("./recurringMissingTask/RecurringMissingTaskJob.js");
const orderQuantityUpdate = require("./productIndex/updateOrderQuantity.js");
const cashInLocationMismatch = require("./location/cashInLocationMismatch.js");
const draftOrderReport = require("./order/draftOrderReport.js");
const ProductPriceReindex = require("./productPrice/productPriceReindex.js");
const addFineForNoStockEntry = require("./stockEntry/addFineForNoStockEntry.js");
const userAutoLogout = require("./user/UserAutoLogout.js");
const updateOrderAmount = require ("./saleSettlement/updateOrderAmount.js")
const replenishmentAllocation = require ("./replenish/replenishmentAllocation.js")
const userIncompleteProfile = require("./user/userInCompleteProfileReportEmail.js")
const updateAverageOrderQuantity = require("./locationProduct/updateAverageOrderQuantity.js")
const updateMinMaxOrderQuantityByAverageOrderQty = require("./locationProduct/updateMinMaxQuantityByAverageOrderQty.js");
const AddFineForLateCheckIn = require("./attendance/AddFineForLateCheckIn.js");
const createSaleSettlementMissingFine = require("./saleSettlement/createMissingFine.js");
const createUserAccount = require("./account/createUserAccount.js");
const updateCategoryOrderQuantity = require("./category/updateOrderQuantity.js");
const deleteZeroOrders = require("./order/deleteZeroOrders.js");
const orderReport = require("./order/orderReport.js");
const locationNoCheckInReportEmail = require("./location/locationNoCheckInReportEmail.js");
const locationPendingCheckOut = require("./location/locationPendingCheckOut.js");
const cancelledReportNotification = require("./orderProduct/cancelledReportNotification.js");
const orderVerifyUpiPaymentScreenshot = require("./order/orderVerifyUpiPaymentScreenshot.js");
const enquiryTicket = require("./ticket/enquiryTicket");
const AddFineForCheckoutMIssing = require("./attendance/AddFineForCheckoutMIssing.js");
const AddBonusForLateCheckout = require("./attendance/AddBonusForLateCheckout.js");

module.exports = (server) => {
  // Schedular Api
  server.post("/v1/scheduler/slack/noActivityEmail", noActivityNotification);
  server.post("/v1/scheduler/slack/noActivityEmail/manualRun", noActivityNotification);

  server.post("/v1/scheduler/slack/goalStatusEmail", goalStatusNotification);
  server.post("/v1/scheduler/slack/goalStatusEmail/manualRun", goalStatusNotification);

  server.post("/v1/scheduler/attendance/autoAbsentAdd", verifySchedulerAuthorization, AttendanceAddAbsent);
  server.post("/v1/scheduler/attendance/autoAbsentAdd/manualRun", verifyToken, AttendanceAddAbsent);

  //Default Job
  server.post("/v1/scheduler/setup/createDefaultRecord", verifySchedulerAuthorization, createDefaultRecord);
  server.post("/v1/scheduler/setup/createDefaultRecord/manualRun", verifyToken, createDefaultRecord);

  //Country Job
  server.post("/v1/scheduler/sync/country", verifySchedulerAuthorization, country);
  server.post("/v1/scheduler/sync/country/manualRun", verifyToken, country);

  // SupplierProducts Sync Job
  server.post("/v1/scheduler/sync/vendorProduct", verifySchedulerAuthorization, vendorProductProductSync);
  server.post("/v1/scheduler/sync/vendorProduct/manualRun", verifyToken, vendorProductProductSync);

  // ProductIndex
  server.post("/v1/scheduler/product/productIndex", verifySchedulerAuthorization, ProductIndex);
  server.post("/v1/scheduler/product/productIndex/manualRun", verifyToken, ProductIndex);

  server.post("/v1/scheduler/productIndex/updateOrderQuantity", verifySchedulerAuthorization, orderQuantityUpdate);
  server.post("/v1/scheduler/productIndex/updateOrderQuantity/manualRun", verifyToken, orderQuantityUpdate);

  // Sale Discrepancy Update
  server.post("/v1/scheduler/saleSettlement/saleDiscrepancyUpdate", verifySchedulerAuthorization, SaleDiscrepancyJob);
  server.post("/v1/scheduler/saleSettlement/saleDiscrepancyUpdate/manualRun", verifyToken, SaleDiscrepancyJob);

  server.post("/v1/scheduler/media/productMediaToMediaMigration", verifySchedulerAuthorization, productMedia);
  server.post("/v1/scheduler/media/productMediaToMediaMigration/manualRun", verifyToken, productMedia);

  // user Role
  server.post("/v1/scheduler/user/userRole", verifySchedulerAuthorization, userRole);
  server.post("/v1/scheduler/user/userRole/manualRun", verifyToken, userRole);

  server.post("/v1/scheduler/user/userAutoLogout", verifySchedulerAuthorization, userAutoLogout);
  server.post("/v1/scheduler/user/userAutoLogout/manualRun", verifyToken, userAutoLogout);

  server.post("/v1/scheduler/user/userIncompleteProfileReportEmail", verifySchedulerAuthorization, userIncompleteProfile);
  server.post("/v1/scheduler/user/userIncompleteProfileReportEmail/manualRun", verifyToken, userIncompleteProfile);

  server.post("/v1/scheduler/sales/salesReportMail", verifySchedulerAuthorization, SalesReportMail);
  server.post("/v1/scheduler/sales/salesReportMail/manualRun", verifyToken, SalesReportMail);

  // sales reports notification
  server.post("/v1/scheduler/product/updatePrice", verifySchedulerAuthorization, updatePrice);
  server.post("/v1/scheduler/product/updatePrice/manualRun", verifyToken, updatePrice);
  server.post("/v1/scheduler/bill/regenerateBillNumber", verifySchedulerAuthorization, regenerateBillNumber);
  server.post("/v1/scheduler/bill/regenerateBillNumber/manualRun", verifyToken, regenerateBillNumber);

  server.post("/v1/scheduler/saleSettlement/regenerateSaleNumber", verifySchedulerAuthorization, regenerateSaleNumber);
  server.post("/v1/scheduler/saleSettlement/regenerateSaleNumber/manualRun", verifyToken, regenerateSaleNumber);

  server.post("/v1/scheduler/sync/syncAttendanceFromTracker", verifySchedulerAuthorization, syncAttendanceFromTracker);
  server.post("/v1/scheduler/sync/syncAttendanceFromTracker/manualRun", verifyToken, syncAttendanceFromTracker);

  // Update Attendance Late Hours
  server.post("/v1/scheduler/attendance/updateAttendanceLateAndOvertimeHours",verifySchedulerAuthorization,updateAttendanceLateAndOvertimeHours);
  server.post("/v1/scheduler/attendance/updateAttendanceLateAndOvertimeHours/manualRun", verifyToken, updateAttendanceLateAndOvertimeHours);

  server.post(
    "/v1/scheduler/attendance/sendAttendanceMissingReportEmail",
    verifySchedulerAuthorization,
    sendAttendanceMissingReportEmail
  );
  server.post(
    "/v1/scheduler/attendance/sendAttendanceMissingReportEmail/manualRun",
    verifyToken,
    sendAttendanceMissingReportEmail
  );

  // MIssing sale reports mail job

  server.post("/v1/scheduler/setup/createDefaultRecords", verifySchedulerAuthorization, createDefaultRecordJob);
  server.post("/v1/scheduler/setup/createDefaultRecords/manualRun", verifyToken, createDefaultRecordJob);

  server.post(
    "/v1/scheduler/locationProduct/shortageQuantityReportEmail",
    verifySchedulerAuthorization,
    storeShortageProductNofitication
  );
  server.post(
    "/v1/scheduler/locationProduct/shortageQuantityReportEmail/manualRun",
    verifyToken,
    storeShortageProductNofitication
  );

  server.post(
    "/v1/scheduler/locationProduct/excessQuantityReportEmail",
    verifySchedulerAuthorization,
    storeExcessProductNofitication
  );
  server.post(
    "/v1/scheduler/locationProduct/excessQuantityReportEmail/manualRun",
    verifyToken,
    storeExcessProductNofitication
  );

  server.post(
    "/v1/scheduler/purchaseProduct/updatePurchaseProductStoreId",
    verifySchedulerAuthorization,
    updatePurchaseProductStoreId
  );
  server.post(
    "/v1/scheduler/purchaseProduct/updatePurchaseProductStoreId/manualRun",
    verifyToken,
    updatePurchaseProductStoreId
  );

  server.post("/v1/scheduler/reports/dailyOrderReportEmail", verifySchedulerAuthorization, dailyOrderReportEmail);
  server.post("/v1/scheduler/reports/dailyOrderReportEmail/manualRun", verifyToken, dailyOrderReportEmail);

  server.post(
    "/v1/scheduler/locationProduct/updateMinMaxOrderQuantity",
    verifySchedulerAuthorization,
    storeProductUpdateMinMaxQuantity
  );
  server.post(
    "/v1/scheduler/locationProduct/updateMinMaxOrderQuantity/manualRun",
    verifyToken,
    storeProductUpdateMinMaxQuantity
  );

  server.post(
    "/v1/scheduler/sale/dailyProductSaleReportEmail",
    verifySchedulerAuthorization,
    dailyProductSaleReportEmail
  );
  server.post("/v1/scheduler/sale/dailyProductSaleReportEmail/manualRun", verifyToken, dailyProductSaleReportEmail);

  server.post(
    "/v1/scheduler/stockEntry/stockEntryCreateBasedOnLocation",
    verifySchedulerAuthorization,
    stockEntryCreateBasedOnLocation
  );
  server.post(
    "/v1/scheduler/stockEntry/stockEntryCreateBasedOnLocation/manualRun",
    verifyToken,
    stockEntryCreateBasedOnLocation
  );

  server.post("/v1/scheduler/location/noCheckInEmail", verifySchedulerAuthorization, storeNoCheckInNotification);
  server.post("/v1/scheduler/location/noCheckInEmail/manualRun", verifyToken, storeNoCheckInNotification);

  server.post("/v1/scheduler/replenishment/create", verifySchedulerAuthorization, createReplenishment);
  server.post("/v1/scheduler/replenishment/create/manualRun", verifyToken, createReplenishment);

  server.post("/v1/scheduler/replenishment/update", verifySchedulerAuthorization, updateReplenishment);
  server.post("/v1/scheduler/replenishment/update/manualRun", verifyToken, updateReplenishment);

  server.post(
    "/v1/scheduler/transfer/returnTransferForExcessQuantity",
    verifySchedulerAuthorization,
    returnTransferForExcessQuantity
  );
  server.post(
    "/v1/scheduler/transfer/returnTransferForExcessQuantity/manualRun",
    verifyToken,
    returnTransferForExcessQuantity
  );
  server.post(
    "/v1/scheduler/transferProduct/dailyExpireReturnProductsReport",
    verifySchedulerAuthorization,
    transferProductDailyExpireReturnProductsReport
  );
  server.post(
    "/v1/scheduler/transferProduct/dailyExpireReturnProductsReport/manualRun",
    verifyToken,
    transferProductDailyExpireReturnProductsReport
  );

  server.post("/v1/scheduler/reports/noOrderReport", verifySchedulerAuthorization, noOrderReport);
  server.post("/v1/scheduler/reports/noOrderReport/manualRun", verifyToken, noOrderReport);

  server.post("/v1/scheduler/attendance/dailyReport", verifySchedulerAuthorization, attendanceDailyReportNotification);
  server.post("/v1/scheduler/attendance/dailyReport/manualRun", verifyToken, attendanceDailyReportNotification);

  server.post("/v1/scheduler/stockEntry/stockEntryDailyReport", verifySchedulerAuthorization, stockEntryDailyReport);
  server.post("/v1/scheduler/stockEntry/stockEntryDailyReport/manualRun", verifyToken, stockEntryDailyReport);

  server.post(
    "/v1/scheduler/saleSettlement/salesSettlementMisssingReport",
    verifySchedulerAuthorization,
    salesSettlementMisssingReport
  );
  server.post(
    "/v1/scheduler/saleSettlement/salesSettlementMisssingReport/manualRun",
    verifyToken,
    salesSettlementMisssingReport
  );

  server.post("/v1/scheduler/order/cancelledOrders", verifySchedulerAuthorization, cancelledOrders);
  server.post("/v1/scheduler/order/cancelledOrders/manualRun", verifyToken, cancelledOrders);

  server.post(
    "/v1/scheduler/saleSettlement/createSaleSettlementMissingTicket",
    verifySchedulerAuthorization,
    createSaleMissingTicekt
  );
  server.post(
    "/v1/scheduler/saleSettlement/createSaleSettlementMissingTicket/manualRun",
    verifyToken,
    createSaleMissingTicekt
  );

  server.post("/v1/scheduler/ticket/noInprogressTicket", verifySchedulerAuthorization, noInProgressTicketNotification);
  server.post("/v1/scheduler/ticket/noInprogressTicket/manualRun", verifyToken, noInProgressTicketNotification);

  server.post("/v1/scheduler/ticket/ticketIndex", verifyToken, ticketIndex);
  server.post("/v1/scheduler/ticket/ticketIndex/manualRun", verifyToken, ticketIndex);

  // Manual Run

  server.post("/v1/scheduler/user/noCheckinActivityReport/manualRun", verifyToken, noCheckinActivityReport);
  server.post("/v1/scheduler/user/noCheckinActivityReport", verifySchedulerAuthorization, noCheckinActivityReport);

  server.post("/v1/scheduler/locationProduct/reindex/manualRun", verifyToken, locationProductReindex);
  server.post("/v1/scheduler/locationProduct/reindex", verifySchedulerAuthorization, locationProductReindex);

  server.post("/v1/scheduler/reports/orderProductTop50Report/manualRun", verifyToken, orderProductTop50report);
  server.post("/v1/scheduler/reports/orderProductTop50Report", verifySchedulerAuthorization, orderProductTop50report);

  server.post(
    "/v1/scheduler/stockEntryProduct/UpdateStockEntryProductStatusFromNotMatchedToAccepted/manualRun",
    verifyToken,
    stockEntryProductStatusUpdateJob
  );
  server.post(
    "/v1/scheduler/stockEntryProduct/UpdateStockEntryProductStatusFromNotMatchedToAccepted",
    verifySchedulerAuthorization,
    stockEntryProductStatusUpdateJob
  );

  server.post("/v1/scheduler/reports/orderTop50Report/manualRun", verifyToken, orderTop50Report);
  server.post("/v1/scheduler/reports/orderTop50Report", verifySchedulerAuthorization, orderTop50Report);

  server.post("/v1/scheduler/reports/summaryReport/manualRun", verifyToken, summaryReport);
  server.post("/v1/scheduler/reports/summaryReport", verifySchedulerAuthorization, summaryReport);

  server.post("/v1/scheduler/recurringTask/recurringTaskCreate/manualRun", verifyToken, RecurringTaskJob);
  server.post("/v1/scheduler/recurringTask/recurringTaskCreate", verifySchedulerAuthorization, RecurringTaskJob);

  server.post("/v1/scheduler/location/locationOpeningReport/manualRun", verifyToken, LocationOpeningReport);
  server.post("/v1/scheduler/location/locationOpeningReport", verifySchedulerAuthorization, LocationOpeningReport);

  server.post("/v1/scheduler/purchseorder/purchaseOrderCreate/manualRun", verifyToken, purchaseOrderCreate);
  server.post("/v1/scheduler/purchseorder/purchaseOrderCreate", verifySchedulerAuthorization, purchaseOrderCreate);

  server.post("/v1/scheduler/user/userMonthlyLeaveBalanceAdd/manualRun", verifyToken, AddMonthlyLeaveBalance);
  server.post("/v1/scheduler/user/userMonthlyLeaveBalanceAdd", verifySchedulerAuthorization, AddMonthlyLeaveBalance);

  server.post("/v1/scheduler/user/addUserProfilePictureFromAttendance/manualRun", verifyToken, AddUserProfilePictureFromAttendance);
  server.post("/v1/scheduler/user/addUserProfilePictureFromAttendance", verifySchedulerAuthorization, AddUserProfilePictureFromAttendance);

  server.post("/v1/scheduler/user/reindex/manualRun", verifyToken, UserReindex);
  server.post("/v1/scheduler/user/reindex", verifySchedulerAuthorization, UserReindex);

  server.post("/v1/scheduler/user/addUserStartdateAndEnddateFromAttendance/manualRun", verifyToken, UserStartdateAndEnddateFromAttendance);
  server.post("/v1/scheduler/user/addUserStartdateAndEnddateFromAttendance", verifySchedulerAuthorization, UserStartdateAndEnddateFromAttendance);

  server.post(
    "/v1/scheduler/locationProduct/addMissingProducts/manualRun",
    verifyToken,
    locationProductAddMissingProducts
  );
  server.post(
    "/v1/scheduler/locationProduct/addMissingProducts",
    verifySchedulerAuthorization,
    locationProductAddMissingProducts
  );

  server.post("/v1/scheduler/reports/billPendingReport/manualRun", verifyToken, billPendingreport);
  server.post("/v1/scheduler/reports/billPendingReport", verifySchedulerAuthorization, billPendingreport);

  server.post("/v1/scheduler/reports/purchasePendingReport/manualRun", verifyToken, purchasePendingreport);
  server.post("/v1/scheduler/reports/purchasePendingReport", verifySchedulerAuthorization, purchasePendingreport);

  server.post("/v1/scheduler/reports/paymentPendingReport/manualRun", verifyToken, paymentPendingreport);
  server.post("/v1/scheduler/reports/paymentPendingReport", verifySchedulerAuthorization, paymentPendingreport);

  server.post(
    "/v1/scheduler/accountProduct/updateFromPurchaseProduct/manualRun",
    verifyToken,
    accountProductUpdateFromPurchaseProduct
  );
  server.post(
    "/v1/scheduler/accountProduct/updateFromPurchaseProduct",
    verifySchedulerAuthorization,
    accountProductUpdateFromPurchaseProduct
  );

  server.post(
    "/v1/scheduler/attendance/addMissingRecords/manualRun",
    verifyToken,
    addMissingAttendanceRecord
  );
  server.post(
    "/v1/scheduler/attendance/addMissingRecords",
    verifySchedulerAuthorization,
    addMissingAttendanceRecord
  );

  server.post("/v1/scheduler/recurringTask/createMissingRecurringTask/manualRun", verifyToken, RecurringMissingTaskJob);
  server.post("/v1/scheduler/recurringTask/createMissingRecurringTask", verifySchedulerAuthorization, RecurringMissingTaskJob);

  /* ✴---Location Cash Mismatched Mail Report---✴ */
  server.post("/v1/scheduler/location/cashInLocationMismatchReport", verifySchedulerAuthorization, cashInLocationMismatch);
  server.post("/v1/scheduler/location/cashInLocationMismatchReport/manualRun", verifyToken, cashInLocationMismatch);

  /* ✴---Draft Order Mail Report---✴ */
  server.post("/v1/scheduler/order/draftOrdersReport/manualRun", verifyToken, draftOrderReport);
  server.post("/v1/scheduler/order/draftOrdersReport", verifySchedulerAuthorization, draftOrderReport);

  /* ✴---Product Price Refresh---✴ */
    server.post("/v1/scheduler/productPrice/reindex", verifySchedulerAuthorization, ProductPriceReindex);
    server.post("/v1/scheduler/productPrice/reindex/manualRun", verifyToken, ProductPriceReindex);

    /* ✴---Fine For No StockEntry---✴ */
    server.post("/v1/scheduler/stockEntry/addFineForNoStockEntry", verifySchedulerAuthorization, addFineForNoStockEntry);
    server.post("/v1/scheduler/stockEntry/addFineForNoStockEntry/manualRun", verifyToken, addFineForNoStockEntry);

    /* ✴---Sale Settlement Update Order Amount---✴ */
    server.post("/v1/scheduler/saleSettlement/updateOrderAmount", verifySchedulerAuthorization, updateOrderAmount);
    server.post("/v1/scheduler/saleSettlement/updateOrderAmount/manualRun", verifyToken, updateOrderAmount);

    /* ✴---Replenishment Allocation---✴ */
    server.post("/v1/scheduler/replenishmentAllocationCreate", verifySchedulerAuthorization, replenishmentAllocation);
    server.post("/v1/scheduler/replenishmentAllocationCreate/manualRun", verifyToken, replenishmentAllocation);

    server.post("/v1/scheduler/locationProduct/updateAverageOrderQuantity", verifySchedulerAuthorization, updateAverageOrderQuantity);
    server.post("/v1/scheduler/locationProduct/updateAverageOrderQuantity/manualRun", verifyToken, updateAverageOrderQuantity);

    server.post("/v1/scheduler/locationProduct/updateMinMaxOrderQuantityByAverageOrderQuantity", verifySchedulerAuthorization, updateMinMaxOrderQuantityByAverageOrderQty);
    server.post("/v1/scheduler/locationProduct/updateMinMaxOrderQuantityByAverageOrderQuantity/manualRun", verifyToken, updateMinMaxOrderQuantityByAverageOrderQty);


    /* ✴---Add Fine For Late CheckIn---✴ */
    server.post("/v1/scheduler/attendance/addFineForLateCheckIn", verifySchedulerAuthorization, AddFineForLateCheckIn);
    server.post("/v1/scheduler/attendance/addFineForLateCheckIn/manualRun", verifyToken, AddFineForLateCheckIn);

    server.post("/v1/scheduler/saleSettlement/createMissingFine", verifySchedulerAuthorization, createSaleSettlementMissingFine);
    server.post("/v1/scheduler/saleSettlement/createMissingFine/manualRun", verifyToken, createSaleSettlementMissingFine);

    server.post("/v1/scheduler/account/createUserAccount", verifySchedulerAuthorization, createUserAccount);
    server.post("/v1/scheduler/account/createUserAccount/manualRun", verifyToken, createUserAccount);
  
    server.post("/v1/scheduler/category/updateOrderQuantity", verifySchedulerAuthorization, updateCategoryOrderQuantity);
    server.post("/v1/scheduler/category/updateOrderQuantity/manualRun", verifyToken, updateCategoryOrderQuantity);

    // Delete Zero Orders job
    server.post("/v1/scheduler/order/deleteZeroOrders", verifySchedulerAuthorization, deleteZeroOrders);
    server.post("/v1/scheduler/order/deleteZeroOrders/manualRun", verifyToken, deleteZeroOrders);

    /* ✴---Add Fine For Late CheckIn---✴ */
    server.post("/v1/scheduler/order/orderReport", verifySchedulerAuthorization, orderReport);
    server.post("/v1/scheduler/order/orderReport/manualRun", verifyToken, orderReport);

    /*--Cancelled Order Product Report--*/ 
    server.post("/v1/scheduler/orderProduct/cancelledReport", verifySchedulerAuthorization, cancelledReportNotification);
    server.post("/v1/scheduler/orderProduct/cancelledReport/manualRun", verifyToken, cancelledReportNotification);

    server.post("/v1/scheduler/location/noCheckIn", verifySchedulerAuthorization, locationNoCheckInReportEmail);
    server.post("/v1/scheduler/location/noCheckIn/manualRun", verifyToken, locationNoCheckInReportEmail);

    server.post("/v1/scheduler/location/pendingCheckOut", verifySchedulerAuthorization, locationPendingCheckOut);
    server.post("/v1/scheduler/location/pendingCheckOut/manualRun", verifyToken, locationPendingCheckOut);

       /* ✴---Upi Payment Verified Job---✴ */
       server.post("/v1/scheduler/order/verfiyUpiPaymentScreenshot", verifySchedulerAuthorization, orderVerifyUpiPaymentScreenshot);
       server.post("/v1/scheduler/order/verfiyUpiPaymentScreenshot/manualRun", verifyToken, orderVerifyUpiPaymentScreenshot);

       /* ✴---Enquiry Ticket---✴ */
    server.post("/v1/scheduler/ticket/enquiryTicket", verifyToken, enquiryTicket);
    server.post("/v1/scheduler/ticket/enquiryTicket/manualRun", verifyToken, enquiryTicket);

    /* ✴---Add Fine For Check-out Missing---✴ */
    server.post("/v1/scheduler/attendance/addFineForCheckoutMissing", verifySchedulerAuthorization, AddFineForCheckoutMIssing);
    server.post("/v1/scheduler/attendance/addFineForCheckoutMissing/manualRun", verifyToken, AddFineForCheckoutMIssing);
   
  /* ✴---Add Bobus For Late Check-out ---✴ */
  server.post("/v1/scheduler/attendance/addBonusForLateCheckout", verifySchedulerAuthorization, AddBonusForLateCheckout);
  server.post("/v1/scheduler/attendance/addBonusForLateCheckout/manualRun", verifyToken, AddBonusForLateCheckout);
  };
