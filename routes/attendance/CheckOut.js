
const Request = require("../../lib/request");

const { Attendance, Shift: ShiftModal, User,order } = require("../../db").models;

const DateTime = require("../../lib/dateTime");

const AttendanceService = require("../../services/AttendanceService");

const ObjectName = require("../../helpers/ObjectName");

const History = require("../../services/HistoryService");

const WhatsappService = require("../../services/WhatsAppService");
const { getSettingValue, getSettingValueByObject } = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");
const ValidationService = require("../../services/ValidationService");
const UserService = require("../../services/UserService");
const Response = require("../../helpers/Response");
const Currency = require("../../lib/currency");

const CheckOut = async (req, res) => {
  try {


    const { attendanceId } = req.body;
    let userDefaultTimeZone = Request.getTimeZone(req)
    const companyId = Request.GetCompanyId(req);
    let roleId = Request.getUserRole(req)
    let attendanceDetail = await Attendance.findOne({
      where: { id: attendanceId, company_id: companyId },
      include: [
        {
          required: true,
          model: ShiftModal,
          as: "shift",
        },
      ]
    })
    if (!attendanceDetail) {
      return res.json(Response.BAD_REQUEST, { message: "Attendance Not Found" });
    }


    const ip_address = Request.getIpAddress(req, res);

    let isValidateShiftTimeOnAttendanceCheckOutEnabled = await getSettingValueByObject(
      Setting.VALIDATE_IP_ADDRESS_ON_CHECKOUT,
      companyId,
      roleId,
      ObjectName.ROLE
    );


    if(isValidateShiftTimeOnAttendanceCheckOutEnabled == "true"){
    await ValidationService.ValidateLocation (roleId, ip_address, companyId, 'checkOut')
    }

    let { login, shift, store_id } = attendanceDetail;

  let additional_hours = AttendanceService.getAdditionalHour(login, shift && shift.start_time, shift && shift.end_time)
  const end_additional_hours = shift?.end_time < DateTime.formateTime(new Date()) ? DateTime.getTimeDifference(shift?.end_time, DateTime.formateTime(new Date())) : "00:00";
  const early_hours = DateTime.formateTime(new Date()) < shift && shift?.end_time  ? DateTime.getTimeDifference(shift?.end_time, DateTime.formateTime(new Date())) : "00:00";
    const data = {
      logout: new Date(),
      company_id: companyId,
      additional_hours: DateTime.convertHoursToMinutes(additional_hours),
    }

    let calculateAdditionalHours =  DateTime.formateTime(new Date()) > shift?.end_time  ? DateTime.getTimeDifference(shift?.end_time,DateTime.formateTime(new Date())) : "00:00";
    let additionalHoursValue = DateTime.convertHoursToMinutes(calculateAdditionalHours)
    let endAdditionalHours = DateTime.convertHoursToMinutes(end_additional_hours)
   
    await Attendance.update(data, { where: { id: attendanceId, company_id: companyId } })

    //No/Low Stock Entry Fine
    let noStockEntryParams = {
      user_id: attendanceDetail.user_id,
      date: attendanceDetail?.date,
      timeZone: userDefaultTimeZone,
      shift: shift,
      store_id: store_id,
      roleId: roleId,
      companyId: companyId,
      req: req,
      object_id:attendanceId
    }
   let noStockEntryFineAddResponse =  await AttendanceService.findAddForNoStockEntry(noStockEntryParams);
    //Add Extra Stock Entry Bonus 
   let extraStockEntryBonusAddResponse = await AttendanceService.bonusAddForExtraStockEntry(attendanceDetail.user_id,attendanceDetail?.date,userDefaultTimeZone,shift, store_id, roleId,companyId,attendanceId);
    // Fine Add For Minimum Replenish Count 
    let replenishmentMissingParams = {
      user_id: attendanceDetail.user_id,
      date: attendanceDetail?.date,
      shift: shift,
      roleId: roleId,
      companyId,
      req,
      object_id:attendanceId
    }
    let minimumReplenishmentCountFineAddResponse = await AttendanceService.findAddForMinimumReplenishmentCount(replenishmentMissingParams);
     // Bonus Add For Extra Replenish Count 
     let extraReplenishmentBonusAddResponse = await AttendanceService.bonusAddForExtraReplenishmentCount(attendanceDetail.user_id,attendanceDetail?.date,shift, roleId,companyId,attendanceId);
     // Bonus Add For Additional Hours
    let additionalHoursBonusResponse = await AttendanceService.addBonusForAdditionalHours(attendanceDetail.user_id,additionalHoursValue,shift?.end_time,roleId, userDefaultTimeZone,companyId,attendanceId);
    // Fine Add For Early CheckOut
    let earlyCheckOutParams = {
      attendanceDetail,
      roleId,
      timeZone: userDefaultTimeZone,
      companyId,
      early_hours: DateTime.convertHoursToMinutes(early_hours),
      user_id: attendanceDetail.user_id,
      req,
      object_id:attendanceId
    }
    let earlyCheckoutFineAddResponse = await AttendanceService.addFineForEarlyCheckOut(earlyCheckOutParams);

    let endTimeValue = DateTime.addMinutesToTime(shift?.end_time ? shift?.end_time : "00:00", shift?.cutoff_time)
    let currentTime = DateTime.getGmtHoursAndMinutes(new Date())
    let lateCheckOutResponse = null
    if (DateTime.isValidDate(shift?.end_time)) {
      if (currentTime > endTimeValue) {
        lateCheckOutResponse = await AttendanceService.addBonusForLateCheckOut(attendanceDetail.user_id, shift?.end_time, endAdditionalHours, userDefaultTimeZone, companyId, new Date(), new Date(attendanceDetail?.date), new Date(attendanceDetail?.date), attendanceId);
      }
    }


    //Bonus Add For Late CheckOut
    res.json(Response.OK, { 
      message: "Successfully Checked Out",
       ...(noStockEntryFineAddResponse ? {noStockEntryFineAdd: noStockEntryFineAddResponse}:{}),
       ...(extraStockEntryBonusAddResponse ? {extraStockEntryBonusAdd: extraStockEntryBonusAddResponse}:{}),
       ...(minimumReplenishmentCountFineAddResponse ? {minimumReplenishmentCountFineAdd: minimumReplenishmentCountFineAddResponse}:{}),
       ...(extraReplenishmentBonusAddResponse ? {extraReplenishmentBonusAdd: extraReplenishmentBonusAddResponse}:{}),
       ...((additionalHoursBonusResponse && additionalHoursValue > 0) ? {additionalHoursBonus: Currency.IndianFormat(additionalHoursBonusResponse?.amount), additionalHours: DateTime.HoursAndMinutes(additionalHoursValue)} :{}),
       ...(earlyCheckoutFineAddResponse ? {earlyCheckOutFineAdd: {...earlyCheckoutFineAddResponse,earlyCheckOutTime: DateTime.HoursAndMinutes(DateTime.convertHoursToMinutes(early_hours)) }}:{}),
       ...((lateCheckOutResponse && endAdditionalHours > 0) ? {endAdditionalHoursBonus: lateCheckOutResponse?.bonusAmount, endAdditionalHours: DateTime.HoursAndMinutes(endAdditionalHours)} :{}),

      });

    res.on("finish", async () => {

      if(attendanceDetail){
        await User.update(
          { current_shift_id: null, current_location_id: null,last_checkin_at:null }, 
          { where : { id: attendanceDetail.user_id, company_id: companyId}});
      }
    
      UserService.reindex( attendanceDetail.user_id, companyId);

      History.create("CheckOut Added", req,
        ObjectName.ATTENDANCE, attendanceId
      );

      WhatsappService.sendAttendanceNotification(`${req.user.name} Checked Out`, companyId);
     
    });

  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });

  }

}

module.exports = CheckOut;
