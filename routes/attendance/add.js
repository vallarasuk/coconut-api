


/**
 * Module dependencies
 */
// Status
const { BAD_REQUEST, CREATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { Attendance : AttendanceModal, Shift,attendanceType } = require("../../db").models;
const History = require("../../services/HistoryService");


// Lib
const Request = require("../../lib/request");
const statuses = require("./statuses");
const ObjectName = require("../../helpers/ObjectName");
const { Op } = require("sequelize");
const utils = require("../../lib/utils");
const moment = require("moment");
const DateTime = require("../../lib/dateTime");
const Attendance = require("../../helpers/Attendance");
const AttendanceService = require("../../services/AttendanceService");
const { getSettingValue } = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");
const Number = require("../../lib/Number");
const Response = require("../../helpers/Response");
const AttendanceTypeService = require("../../services/AttendanceTypeService");
const ArrayList = require("../../lib/ArrayList");


/**
 * orderProduct create route
 */
async function add(req, res, next) {
  const hasPermission = await Permission.Has(Permission.ATTENDANCE_ADD, req);



  const data = req.body;
  const companyId = Request.GetCompanyId(req);

  let date = data?.date ? data?.date : new Date();


  try {

    let login = data?.login ? data?.login : null

    if (!date) {
      return res.json(400, { message: "Date is required" });
    }
    let late_hours
    let start_additional_hours
    let end_additional_hours
    let additional_hours


if (data.shift) {


  const isAttendanceExist = await AttendanceModal.findOne({
    where: { user_id: data.user, shift_id: data.shift, date: date, company_id: companyId },
  });
  
  if(isAttendanceExist){
    return res.json(400, { message: "Duplicate Entry" });
  }


  const shiftData = await Shift.findOne({
    where: { company_id: companyId, id: data.shift },
  });
  let { start_time, end_time } = shiftData;


  if(data && data?.late_hours){
    late_hours =data?.late_hours 
  }else{
    late_hours =
    start_time < DateTime.formateTime(login) ? DateTime.getTimeDifference(start_time, DateTime.formateTime(login)) : "00:00";
  }

  start_additional_hours =
    DateTime.formateTime(login) < start_time ? DateTime.getTimeDifference(DateTime.formateTime(login), start_time) + 1 : "00:00";

  end_additional_hours =
    end_time < DateTime.formateTime(data.logout) ? DateTime.getTimeDifference(end_time, DateTime.formateTime(data.logout)) : "00:00";


  if(data && data?.additional_hours){
    additional_hours = data?.additional_hours;
  }else{
    additional_hours = DateTime.sumTimes(start_additional_hours, end_additional_hours);
  }
}

if(data?.leaveType){

  try{
  const totalCount = await AttendanceModal.count({
    where: {  date: date, company_id: companyId, type:data?.type },
  });

  const isAttendanceExist = await AttendanceModal.findOne({
    where: { user_id: data.user, date: date, shift:data?.shift,company_id: companyId },
  });

  if(isAttendanceExist){
  return res.json(Response.BAD_REQUEST, { message: "Record Exists" });
   }

  let leaveTypeData = await attendanceType.findOne({where:{id:data?.leaveType, company_id:companyId}})

  if(Number.Get(totalCount) >= Number.Get(leaveTypeData?.maximum_leave_allowed)){

    return res.json(Response.BAD_REQUEST, { message: "Not Eligible To Apply Leave" });
    
  }
}catch(err){
  console.log(err);
}
}

    let attendanceData = {
      user_id: data.user,
      date:DateTime.defaultDateFormat(date),
      notes: data.notes,
      type: data.type,
      ip_address: Request.getIpAddress(req, res),
      status: statuses.APPROVED,
      store_id: data?.location ? data?.location : null,
      shift_id: data?.shift ? data?.shift : null,
      company_id: companyId,
      login: DateTime.formateDateAndTime(login),
      logout: DateTime.formateDateAndTime(data.logout),
      late_hours: DateTime.convertHoursToMinutes(late_hours),
      additional_hours:  DateTime.convertHoursToMinutes(additional_hours),
      late_hours_status: data?.late_hours_status ? data?.late_hours_status: "",
      allow_early_checkout : data.allow_early_checkout,
      days_count: data?.days_count ? data?.days_count : null
    };

    let attendanceExist = await AttendanceModal.findOne({
      where: { user_id: data.user, date: date, company_id: companyId , login : { [Op.ne] : null} , logout : { [Op.ne] : null}},
    })

    let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true, company_id: companyId})
    let absentIds = await AttendanceTypeService.getAttendanceTypeId({is_absent:true, company_id: companyId})

    if(attendanceExist && data?.type && !leaveIds?.includes(data?.type)){
      let additionalDayIds = await AttendanceTypeService.getAttendanceTypeId({is_additional_day:true, company_id: companyId})
      if(ArrayList.isArray(additionalDayIds)){
        attendanceData.type = additionalDayIds[0];
      }
    } else {
      attendanceData.type = data?.type;
    }

    const attendance = await AttendanceModal.create(attendanceData);
    // Create Order product
    res.json(CREATE_SUCCESS, {
      message: "Attendance Added",
      id: attendance.id
    });
    res.on("finish", async () => {
        if (leaveIds?.includes(data?.type) || absentIds?.includes(data?.type)) {
          let channelId = await getSettingValue(Setting.ATTENDANCE_LEAVE_NOTIFICATION_CHANNEL, companyId);
          if(channelId && channelId !==""){
            AttendanceService.SendMessge(null, attendance?.id, companyId, data.type, attendance?.created_at, null, channelId);
          }
          History.create(`${data.type} Added`, req,
          ObjectName.ATTENDANCE, attendance.id
        );
        }else{
          History.create("Attendance Added", req,
          ObjectName.ATTENDANCE, attendance.id
        );
        }
   
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = add;