const errors = require("restify-errors");
const utils = require("../../lib/utils");
const validator = require("../../lib/validator");
const { Op } = require("sequelize");
const Permission = require("../../helpers/Permission");
const Number = require("../../lib/Number");
const { Attendance, Shift, User: UserModel, Location, Media } = require("../../db").models;
const DateTime = require("../../lib/dateTime");
const ObjectName = require("../../helpers/ObjectName");
const History = require("../../services/HistoryService");
const Request = require("../../lib/request");
const { sendAttendenceAddNotification } = require("../../services/notifications/attendance");
const { getMediaUrl } = require("../../lib/utils");
const ActivityService = require("../../services/ActivityService");
const ArrayList = require('../../lib/ArrayList');
const UserService = require("../../services/UserService");
const ValidationService = require("../../services/ValidationService");
const companyService = require("../../services/CompanyService");
const SlackService = require("../../services/SlackService");
const AttendanceService = require("../../services/AttendanceService");
const String = require("../../lib/string");
const AttendanceTypeService = require("../../services/AttendanceTypeService");

async function createAuditLog(oldData, updatedData, req, id) {
  let auditLogMessage = [];

  const companyId = Request.GetCompanyId(req);


  if (updatedData?.type && Number.Get(updatedData?.type) !== Number.Get(oldData?.type)) {
    if (oldData?.type !== Number.Get(updatedData?.type)) {
      auditLogMessage.push(`Type Changed To ${updatedData?.type}\n`);
    }
  }

  if (updatedData?.location && Number.Get(updatedData?.location) !== Number.Get(oldData?.store_id)) {
    if (oldData?.store_id !== updatedData?.location) {
      let locationName = await Location.findOne({
        where: { id: updatedData.location },
      });
      auditLogMessage.push(`Location Updated to ${locationName.name}\n`);
    }
  }

  if (updatedData?.notes && updatedData?.notes !== oldData?.notes) {
    if (oldData?.notes !== updatedData?.notes) {
      auditLogMessage.push(`Notes Updated to ${updatedData?.notes}\n`);
    }
  }

  if (updatedData?.shift && Number.Get(updatedData?.shift) !== Number.Get(oldData?.shift_id)) {
    let shiftDetail = await Shift.findOne({
      where: { id: updatedData?.shift, company_id: companyId },
    });
    auditLogMessage.push(`Shift Updated to ${shiftDetail.name}\n`);
  }

  if (Number.isNotNull(updatedData?.user)) {
    if (Number.isNotNull(updatedData?.user) !== Number.Get(oldData?.user_id)) {
      let userData = await UserService.get(updatedData?.user, companyId);
      auditLogMessage.push(`User Updated to ${String.concatName(userData?.name, userData?.last_name)}\n`);
    }
  }

  if (validator.isNotEmpty(updatedData?.date)) {
    let date = DateTime.GetDate(updatedData?.date, "YYYY-MM-DD");
    if (date && date !== oldData?.date) {
      auditLogMessage.push(`Date Updated to ${date}\n`);
    }
  }

  if (auditLogMessage.length > 0) {
    let message = auditLogMessage.join('');
    History.create(message, req, ObjectName.ATTENDANCE, id);
  } else {
    History.create("Attendance Updated", req, ObjectName.ATTENDANCE, id);
  }
};

/**
 * Attendance Update
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
async function update(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.ATTENDANCE_EDIT, req);



    const attendanceId = req.params.attendanceId;

    if (!validator.isInteger(attendanceId)) {
      return next(new errors.BadRequestError("Invalid Attendance Id"));
    }

    const data = req.body;

    let login = data?.login ? data?.login : null;

    let updateData = {};

    const companyId = Request.GetCompanyId(req);

    const userId = Request.getUserId(req);

    const roleId = Request.getUserRole(req);

    let date = data.date;

    const user_id = req.user.id;

    if (!user_id) {
      return next(new errors.BadRequestError("User Id is required"));
    }

    let isLeaveType =[]

    if(data?.type){
      let typeWhare = {
        id: data?.type, 
        [Op.or]: [
          { is_leave: true },
          { is_additional_leave: true }
        ]
      };
      
      isLeaveType = await AttendanceTypeService.getAttendanceTypeId(typeWhare);
    }


    date = DateTime.GetDate(date, "YYYY-MM-DD");

    let shiftData;

    if (!ArrayList.isArray(isLeaveType) && data.shift) {
      shiftData = await Shift.findOne({
        where: { company_id: companyId, id: data.shift },
      });
    }

    const { start_time, end_time } = shiftData || {};

    let attendance = await Attendance.findOne({
      where: { id: attendanceId },
    });

    let ownerId = attendance.user_id;

    let attendanceDate = DateTime.shortMonthDate(attendance.date);

    if (!attendance) {
      return next(new errors.NotFoundError("Attendance not found"));
    }

    let count;

    // Check if data.shift is not empty before including it in the query
    const WhereCondition = {};

    if(attendance?.user_id){
      WhereCondition.user_id = Number.Get(attendance?.user_id)
    }

    WhereCondition.company_id = Number.Get(companyId)

    if(date){
      WhereCondition.date = date
    }

    WhereCondition.id = { [Op.ne]: Number.Get(attendanceId) }


    if (data.shift) {
      WhereCondition.shift_id = Number.Get(data.shift);
    }

    count = await Attendance.count({ where: WhereCondition });

    let companyDetail = await companyService.getCompanyDetailById(companyId);

    if (count > 0) {
      return next(new errors.BadRequestError("Attendance already exists"));
    }

      updateData.notes = data?.notes;


    if (data?.status) {
      updateData.status = data?.status;
    }

    const late_hours =
      start_time < DateTime.formateTime(login)
        ? DateTime.getTimeDifference(start_time, DateTime.formateTime(login))
        : 0;
    updateData.late_hours = DateTime.convertHoursToMinutes(late_hours);

    updateData.late_hours_status = String.Get(data?.late_hours_status);

    if (data?.activityStatus) {
      updateData.activity_status = data?.activityStatus;
    }

    if (data?.nonProductiveCost) {
      updateData.non_productive_cost = data?.nonProductiveCost;
    }

    updateData.logout = data?.logout ? DateTime.formateDateAndTime(data?.logout) : null;

    updateData.login = DateTime.formateDateAndTime(login);

    if (data?.date) {
      updateData.date = data?.date;
    }

    if (data?.location) {
      updateData.store_id = data?.location;
    }

    if (data?.user) {
      updateData.user_id = data?.user;
    }

    if (data?.shift && !ArrayList.isArray(isLeaveType)) {
      updateData.shift_id = data?.shift;
    }

    if (data?.check_in_media_id) {
      updateData.check_in_media_id = data?.check_in_media_id;
    }

    // Store the original value of allow_early_checkout before making any updates
    const originalAllowEarlyCheckout = attendance.allow_early_checkout;
    updateData.allow_early_checkout = data?.allow_early_checkout || false;

    updateData.allow_goal_missing = data?.allow_goal_missing || false;

    updateData.approve_late_check_in = data?.approve_late_check_in || false;


    const start_additional_hours =
      DateTime.formateTime(data.login) < start_time
        ? DateTime.getTimeDifference(DateTime.formateTime(data.login), start_time)
        : "00:00";
    const end_additional_hours =
      end_time < DateTime.formateTime(data.logout)
        ? DateTime.getTimeDifference(end_time, DateTime.formateTime(data.logout))
        : "00:00";
    const additional_hours = DateTime.sumTimes(start_additional_hours, end_additional_hours);

    updateData.additional_hours = DateTime.convertHoursToMinutes(additional_hours);

    if(data?.days_count){
      updateData.days_count = data?.days_count ? data?.days_count : null;

    }
    if (data?.type) {
      let daysCount = await AttendanceTypeService.getDaysCountById({id: data?.type, company_id: companyId })
      updateData.type = data?.type;
      if(attendance?.days_count == Number.Get(data?.days_count)){
        updateData.days_count = daysCount ? daysCount : null
      }
    }

    updateData.ip_address = data?.ip_address ? data?.ip_address: Request.getIpAddress(req, res);

    let attendanceDetail = await Attendance.update(updateData, {
      where: { id: attendance.id, company_id: companyId },
      returning: true,
      plain: true,
    });

    attendanceDetail = ArrayList.isNotEmpty(attendanceDetail) && attendanceDetail[1];

    // Check if allow_early_checkout changed from false to true
    if (attendanceDetail && attendanceDetail.allow_early_checkout) {
      // Code for updating attendance and sending Slack message for early checkout
      var params = {
        id: attendanceId,
        companyId: companyId,
        user_id: user_id,
        companyDetail: companyDetail,
        ownerId: ownerId,
        attendanceDate: attendanceDate,
      };
      await sendEarlyCheckoutSlackNotification(params, data.allow_early_checkout); // Pass the allow_early_checkout flag
    }

    /* ✴---Send Goal Missing Salck Message---✴ */
    if (attendanceDetail && attendanceDetail.allow_goal_missing) {
      var params = {
        id: attendanceId,
        companyId: companyId,
        user_id: user_id,
        companyDetail: companyDetail,
        ownerId: ownerId,
        attendanceDate: attendanceDate,
      };
      await AttendanceService.sendGoalMissingSlackNotification(params, data.allow_goal_missing);
    }

    if (attendanceDetail && attendanceDetail.approve_late_check_in) {
      var params = {
        id: attendanceId,
        companyId: companyId,
        user_id: user_id,
        companyDetail: companyDetail,
        ownerId: ownerId,
        attendanceDate: attendanceDate,
      };
      await AttendanceService.sendLateCheckInSlackNotification(params, data.approve_late_check_in);
    }

    if (data.mobileCheckIn) {
      const userDetails = await UserModel.findOne({
        where: { id: data?.user, company_id: companyId },
      });
      const locationDetails = await Location.findOne({
        where: { id: data?.location, company_id: companyId },
      });
      const mediaDetails = await Media.findOne({
        where: { id: data.check_in_media_id, company_id: companyId },
      });

      let messageObject = {
        companyId,
        name: userDetails?.name + " " + userDetails?.last_name,
        media_url: getMediaUrl(mediaDetails?.file_name, data?.check_in_media_id),
        locationName: locationDetails.name,
        checkIn: true,
      };

      await sendAttendenceAddNotification(messageObject);
    }

    if (!attendance.logout && data?.logout) {
      ActivityService.createCheckoutActivity(userId, companyId);
    }
    // Send the response message
    res.json({
      message: "Attendance Updated",
      attendanceId: attendanceDetail.get("id"),
    });

    res.on("finish", async () => {
      await createAuditLog(attendance, data, req, attendanceId);
    });
  } catch (err) {
    return res.send(400, { message: err.message });
  }
}

// Define the sendEarlyCheckoutSlackNotification function outside of the update function
async function sendEarlyCheckoutSlackNotification(params, allowEarlyCheckout) {
  let { id, companyId, ownerId, attendanceDate } = params;

  try {
    let getSlackId = await UserService.getSlack(ownerId, companyId);

    if (allowEarlyCheckout && getSlackId) {
      const text = unescape(
        `<@${getSlackId?.slack_id}> Your ${attendanceDate} Attendance is Allowed for Early Checkout`
      );
      SlackService.sendMessageToUser(companyId, getSlackId?.slack_id, text);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = update;
