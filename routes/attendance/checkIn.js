
/**
 * Module dependencies
 */
// Status
const { BAD_REQUEST, CREATE_SUCCESS } = require("../../helpers/Response");

// Models
const { Attendance: AttendanceModal, Shift, User } = require("../../db").models;
const History = require("../../services/HistoryService");
// Lib
const Request = require("../../lib/request");
const statuses = require("./statuses");
const ObjectName = require("../../helpers/ObjectName");
const { Op } = require("sequelize");
const DateTime = require("../../lib/dateTime");
const Attendance = require("../../helpers/Attendance");
const Response = require("../../helpers/Response");
const WhatsappService = require("../../services/WhatsAppService");
const ValidationService = require("../../services/ValidationService");
const ActivityService = require("../../services/ActivityService");
const { getSettingValueByObject, getSettingValue } = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");
const UserService = require("../../services/UserService");
const { addFineForLateCheckIn, addBonusForEarlyCheckIn } = require("../../services/AttendanceService");
const AttendanceService = require("../../services/AttendanceService");
const Number = require("../../lib/Number");
const AttendanceTypeService = require("../../services/AttendanceTypeService");
const ArrayList = require("../../lib/ArrayList");


async function checkIn(req, res, next) {
  try {
  

    let data = req.body;
    const companyId = Request.GetCompanyId(req);

    const user = Request.getUserId(req)

    let timeZone = Request.getTimeZone(req)
    const roleId = Request.getUserRole(req)
    if (!data?.shift_id) {
      return res.json(Response.BAD_REQUEST,{message:"Shift Id Is Required"});
    }
    const ip_address = Request.getIpAddress(req, res);

    let isEnableFineAddForLateCheckIn = await getSettingValueByObject(
      Setting.FINE_ADD_FOR_ATTENDANCE_LATE_CHECKIN,
      companyId,
      roleId,
      ObjectName.ROLE
    );
    
    let isValidateShiftTimeOnAttendanceCheckInEnabled = await getSettingValueByObject(
      Setting.VALIDATE_IP_ADDRESS_ON_CHECKIN,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let isEnableBonusAddForEarlyCheckIn = await getSettingValueByObject(
      Setting.BONUS_ADD_FOR_ATTENDANCE_EARLY_CHECKIN,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let workingDayIds=null
    if(data?.is_working_day){
     workingDayIds = await AttendanceTypeService.getAttendanceTypeId({is_working_day:true, company_id: companyId})
    }

    if(isValidateShiftTimeOnAttendanceCheckInEnabled == "true"){
    await ValidationService.ValidateLocation (roleId, ip_address, companyId, 'checkIn')
    }
    let checkInValidate = await ValidationService.checkInValidation(companyId, roleId, user)
    let pendingCheckOutDates = checkInValidate && checkInValidate.length > 0 && checkInValidate.map(value => DateTime.Format(value?.dataValues?.date));
    if (checkInValidate && checkInValidate!==undefined && checkInValidate.length > 0) {
      return res.json(Response.BAD_REQUEST, { message: `You Have Pending CheckOut On : ${pendingCheckOutDates && pendingCheckOutDates.join(', ')}`});
    }

    let login = new Date()

    let date = new Date();

    let late_hours;
    let additional_hours;

    const attendanceDetail = await AttendanceModal.findOne({
      where: { user_id: user, shift_id: data?.shift_id, date: date, company_id: companyId },
    });

    if (attendanceDetail) {
      return res.json(Response.BAD_REQUEST, { message: "Record Already Exists" });
    }
    const shiftData = await Shift.findOne({
      where: { company_id: companyId, id: data?.shift_id },
    });

    let { start_time, end_time } = shiftData


    late_hours = start_time < DateTime.formateTime(login) ? DateTime.getTimeDifference(start_time, DateTime.formateTime(login)) : 0;
    additional_hours = start_time > DateTime.formateTime(login) ? DateTime.getTimeDifference(DateTime.formateTime(login),start_time) : "00:00";

    let attendanceData = {
      user_id: user,
      date: DateTime.defaultDateFormat(date),
      ip_address: Request.getIpAddress(req, res),
      status: statuses.APPROVED,
      store_id: data?.store ? data?.store : null,
      shift_id: data?.shift_id ? data?.shift_id : null,
      company_id: companyId,
      login: DateTime.formateDateAndTime(login),
      late_hours: DateTime.convertHoursToMinutes(late_hours),
      allow_early_checkout:false
    };

    let attendanceExist = await AttendanceModal.findOne({
      where: { user_id: user, date: date, company_id: companyId, login: { [Op.ne]: null }, logout: { [Op.ne]: null } },
    })

    let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true, company_id: companyId})
    if(attendanceExist && Number.isNotNull(workingDayIds[0]) && !leaveIds?.includes(workingDayIds[0])){
      let additionalDayIds = await AttendanceTypeService.getAttendanceTypeId({is_additional_day:true, company_id: companyId})
      if(ArrayList.isArray(additionalDayIds)){
        attendanceData.type = additionalDayIds[0];
      }
    } else {
      attendanceData.type = workingDayIds[0];
    }
  
    const attendance = await AttendanceModal.create(attendanceData);

    if(attendance && attendance?.id){
      await User.update(
        { current_shift_id: attendance?.shift_id, current_location_id: attendance?.store_id,last_checkin_at:attendance?.login }, 
        { where : { id: attendance?.user_id, company_id: companyId}});
        
    UserService.reindex( attendance?.user_id, companyId);
    }

    let fineResponse=null;
    let bonusResponse=null

    let additionalDayIds = await AttendanceTypeService.getAttendanceTypeId({is_additional_day:true, company_id: companyId})


    if ((Number.isNotNull(isEnableFineAddForLateCheckIn) && isEnableFineAddForLateCheckIn == "true" && !additionalDayIds?.includes(attendanceData?.type))) {
      let lateCheckInParams = {
        user_id: user,
        late_hours: attendanceData?.late_hours,
        startTime: shiftData?.start_time,
        gracePeriod: shiftData?.grace_period,
        login: attendance?.login,
        timeZone: timeZone,
        companyId: companyId,
        location_id: attendanceData?.store_id,
        shift_id: attendanceData?.shift_id,
        req,
        roleId,
        object_id: attendance?.id
      }
      fineResponse = await addFineForLateCheckIn(lateCheckInParams);
    }


    if ((Number.isNotNull(isEnableBonusAddForEarlyCheckIn) && isEnableBonusAddForEarlyCheckIn == "true")) {
      bonusResponse = await addBonusForEarlyCheckIn(user,DateTime.convertHoursToMinutes(additional_hours),shiftData?.start_time,shiftData?.grace_period,roleId, attendance?.login, timeZone,companyId);
    }
      let additionalHours = DateTime.convertHoursToMinutes(additional_hours)
    // Create Order product
    res.json(CREATE_SUCCESS, {
      message: "CheckIn Added",
      attendance: attendance,
      ...(fineResponse ? {fineAmount: fineResponse?.amount, lateHours:attendanceData?.late_hours > 0 ? DateTime.HoursAndMinutes(attendanceData?.late_hours):"", minutes:attendanceData?.late_hours > 0 ? attendanceData?.late_hours:"",}:{}),
      additionalMinutes: additionalHours ? additionalHours :"",
      additionalHours:additionalHours > 0 ? DateTime.HoursAndMinutes(additionalHours):"",
      ...(bonusResponse ? {bonusAmount: bonusResponse?.amount}:{}),

    });

    res.on("finish", async () => {
      //create system log for product updation
      History.create("CheckIn Added", req,
        ObjectName.ATTENDANCE, attendance?.id
      );

      if(attendance){
      await ActivityService.createActivityOnUserCheckIn(req,attendanceData,companyId)
      WhatsappService.sendAttendanceNotification(`${req.user.name} Checked In`, companyId);
      }

    });
  } catch (err) {
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = checkIn;