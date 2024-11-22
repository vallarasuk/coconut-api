const validator = require("../../lib/validator");
const { Attendance } = require("../../db").models;
const ObjectName = require("../../helpers/ObjectName");
const { Op } = require("sequelize");

const History = require("../../services/HistoryService");
const async = require("async");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Request = require("../../lib/request");

function bulkUpdate(req, res, next) {
	const data = req.body;
	let companyId = Request.GetCompanyId(req)
    let attendanceIds = data.ids;

   if (!attendanceIds) {
       return next(validator.validationError("Attendance Ids is required"));
   }

   async.eachSeries(
	        attendanceIds,
	       async (attendanceId, cb) => {
			   
			   const attendanceData = {};
	           if (data.type) {
	               attendanceData.type = data.type;
	           }
	           if (data?.days_count) {
					attendanceData.days_count = data?.days_count 
			   }
	           if (data.user) {
	               attendanceData.user_id = data.user;
	           }
	           if (data.attendance_status) {
	               attendanceData.status = data.attendance_status;
	           }
	           if (data.lateHoursStatus) {
	               attendanceData.late_hours_status = data.lateHoursStatus;
	           }
	           if (data.activityStatus) {
	               attendanceData.activity_status = data.activityStatus;
	           }
	           if (data.notes) {
	               attendanceData.notes = data.notes;
	           }
			   if (data.shift) {
				attendanceData.shift_id = data.shift.id;
			} if (data.location) {
				attendanceData.store_id = data.location.id;
			}
	           await Attendance.update(attendanceData, { where: { id: attendanceId, company_id: companyId } });
	           return cb();
	       },
	       () => {
	           //create system log for bulk updation
	           History.create("Products bulk updated", req,ObjectName.ATTENDANCE);
	           // API response
	           return res.json(OK, { message: "Products updated", });
	       })
	 }
	 module.exports = bulkUpdate;

