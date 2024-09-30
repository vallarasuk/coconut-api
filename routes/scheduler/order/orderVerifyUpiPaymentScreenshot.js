
const productService = require("../../../services/ProductService");
const Request = require("../../../lib/request");
const History = require("../../../services/HistoryService");
const schedulerJobCompanyService = require("../schedularEndAt");
const ObjectName = require("../../../helpers/ObjectName");
const {SchedulerJob} = require("../../../db").models;
const OrderService = require("../../../services/OrderService");
const DateTime = require("../../../lib/dateTime");

module.exports = async function (req, res) {

	try {
		let companyId = Request.GetCompanyId(req);


		res.send(200, { message: "Upi Payment Verified Started" });

		res.on("finish", async () => {
			let  id  = req.query.id;
		
			const schedularData = await SchedulerJob.findOne({ where: { id: id, company_id: companyId } });

			let start_date = schedularData?.start_date ?  schedularData?.start_date : new Date()
			let end_date = schedularData?.end_date ? schedularData?.end_date : new Date()
			let params = { 
				companyId: companyId,
				 id: id,
				  startDate: DateTime.toGetISOStringWithDayStartTime(start_date) ,
				  endDate: DateTime.toGetISOStringWithDayEndTime(end_date) 
				 };

		
			History.create(`${schedularData?.name} Job Started`,req, ObjectName.SCHEDULER_JOB, id);
		
			  await schedulerJobCompanyService.setStatusStarted(params, (err) => {
				if (err) {
				  throw new err();
				}
			  });
			  
            await OrderService.verifyUpiPaymentScreenshot(params);
		
            History.create("Order: Upi Payment Verified Completed", req);
	 //Set Scheduler Status Completed
	 await schedulerJobCompanyService.setStatusCompleted(params, err => {
		if (err) {
			throw new err();
		}
	});
	History.create(`${schedularData?.name} Job Completed`,req, ObjectName.SCHEDULER_JOB, id);

		});

	} catch (err) {
		console.log(err);
	}
}