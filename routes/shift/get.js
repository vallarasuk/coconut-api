// Model
const { Shift } = require("../../db").models;

const saleSettlement = require("../../helpers/SaleSettlement");
const Setting = require("../../helpers/Setting");
const DateTime = require("../../lib/dateTime");
//Lib
const Request = require("../../lib/request");
const { settingService, getSettingValue } = require("../../services/SettingService");

async function Get(req, res, next) {
  const { id } = req.params;

  try {
    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }
    let userDefaultTimeZone = Request.getTimeZone(req);
    const ShiftData = await Shift.findOne({
      where: {
        id: id,
        company_id: company_id,
      },
    });

    if (!ShiftData) return res.json(200, { message: "No Records Found" });

    let { name, status, start_time, end_time, checkin_allowed_from, checkin_allowed_till, grace_period, cutoff_time } = ShiftData.get();

    let data = {
      name,
      status,
      start_time: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(start_time,new Date(),userDefaultTimeZone),
      end_time: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(end_time,new Date(),userDefaultTimeZone),
      checkin_allowed_from: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(checkin_allowed_from,new Date(),userDefaultTimeZone),
      checkin_allowed_till: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(checkin_allowed_till,new Date(),userDefaultTimeZone),
      grace_period: grace_period,
      cutoff_time: cutoff_time

    };

    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
}

module.exports = Get;