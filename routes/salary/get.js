const { Salary, status: StatusModel, User } = require("../../db").models;
const Setting = require("../../helpers/Setting");
const Month = require("../../lib/Month");
const DateTime = require("../../lib/dateTime");
const Request = require("../../lib/request");
const String = require("../../lib/string");
const { getSettingValue } = require("../../services/SettingService");

async function get(req, res, next) {
  const { id } = req.params;
  try {
    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, {
        message: "Invalid Id",
      });
    }

    const salaryData = await Salary.findOne({
      where: {
        id: id,
        company_id: company_id,
      },
      include: [
        {
          required: false,
          model: StatusModel,
          as: "statusDetail",
          attributes: ["name", "id", "color_code"],
        },
        {
          required: true,
          model: User,
          as: "user",
          attributes: ["name", "last_name", "media_url"],
        },
      ],
    });

    if (!salaryData)
      return res.json(200, {
        message: "No Records Found",
      });

    let {
      user_id,
      working_days,
      worked_days,
      additional_days,
      basic,
      gratuity,
      hra,
      leave,
      medical_insurance,
      net_salary,
      professional_tax,
      standard_allowance,
      unPaid_leaves,
      special_allowance,
      salary_number,
      monthly_salary,
      salary_per_day,
      bonus,
      tds,
      provident_fund,
      other_deductions,
      leave_salary,
      additional_day_allowance,
      absent,
      status,
      fine,
      notes,
      month,
      year,
      additional_hours,
      additional_hours_salary,
      worked_days_salary,
      other_allowance,
      statusDetail,
      user,
      attendance
    } = salaryData.get();

    let data = {
      id,
      user_id,
      working_days,
      worked_days,
      additional_days,
      basic,
      gratuity,
      hra,
      leave,
      medical_insurance,
      net_salary,
      professional_tax,
      standard_allowance,
      unPaid_leaves,
      special_allowance,
      salary_number,
      monthly_salary,
      salaryPerDay: salary_per_day,
      bonus,
      tds,
      provident_fund,
      other_deductions,
      leave_salary,
      additional_day_allowance,
      absent,
      status: statusDetail?.name,
      statusId: statusDetail?.id,
      fine,
      notes,
      month,
      year,
      additional_hours:DateTime.getFormattedHour(
        additional_hours),
      additional_hours_salary,
      worked_days_salary,
      other_allowance,
      salaryDate: DateTime.getMonthStartEndDates(
        month,
        year,
        Request.getTimeZone(req)
      ),
      user: String.concatName(user?.name, user?.last_name),
      first_name: user?.name,
      last_name: user?.last_name,
      monthValue: Month.get(month),
      attendanceCount:  String.isNotNull(attendance) ? JSON.parse(attendance):[],
      enableAddtionalDayCalculation: await getSettingValue(Setting.ENABLE_SALARY_ADDITIONAL_HOURS,company_id) == "true"?true:false
    };
   
   
    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
}
module.exports = get;
