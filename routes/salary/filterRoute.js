const Request = require('../../lib/request');
const Response = require('../../helpers/Response');
const SalaryService = require('../../services/SalaryService');
const Number = require("../../lib/Number");
const Currency = require("../../lib/currency");
const history = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const { Salary } = require("../../db").models;
async function filterRoute(req, res) {
  try {
    const companyId = Request.GetCompanyId(req);
    let body =  req.body

    let salaryDetail = await Salary.findOne({ where: { id: body?.id, company_id: companyId } });

    let params = {
      data: salaryDetail,
      companyId: companyId,
      timeZone:Request.getTimeZone(req)
    };

    let filterData = await SalaryService.getCalculatedData(params);
    let historyMessage = new Array();
    let createCalculatedData = {};
        createCalculatedData.working_days = filterData[0].totalWorkingDays;
        createCalculatedData.worked_days = filterData[0].worked;
        createCalculatedData.leave = filterData[0].leave;
        createCalculatedData.absent = filterData[0].absent;
        createCalculatedData.additional_days = filterData[0].additional;
        createCalculatedData.basic = Number.GetFloat(filterData[0].basic);
        createCalculatedData.hra = Number.GetFloat(filterData[0].hra);
        createCalculatedData.special_allowance = Number.GetFloat(filterData[0].special_allowance);
        createCalculatedData.net_salary = Number.roundOff(filterData[0].net_salary);
        createCalculatedData.monthly_salary = Number.GetFloat(filterData[0].monthlySalary);
        createCalculatedData.additional_day_allowance = Number.GetFloat(filterData[0].additional_day_allowance);
        createCalculatedData.bonus = Number.GetFloat(filterData[0].bonus);
        createCalculatedData.salary_per_day = Number.GetFloat(filterData[0].salaryPerDay);
        createCalculatedData.leave_salary = Number.GetFloat(filterData[0].leave_salary);
        createCalculatedData.fine = Number.GetFloat(filterData[0].fine);
        createCalculatedData.additional_hours = Number.GetFloat(filterData[0].totalMinutes);
        createCalculatedData.additional_hours_salary = Number.GetFloat(filterData[0].additionalHourAmount);
        createCalculatedData.worked_days_salary = Number.GetFloat(filterData[0]?.worked_days_salary),
        createCalculatedData.other_allowance = Number.GetFloat(filterData[0]?.other_allowance)
        createCalculatedData.other_deducations = Number.GetFloat(filterData[0]?.other_deductions)
        createCalculatedData.attendance =filterData[0]?.attendanceCount

        await Salary.update(createCalculatedData,{where:{id:body?.id, company_id:companyId}});

        if (Number.Get(salaryDetail?.working_days) !== Number.Get(createCalculatedData?.working_days)) {
          historyMessage.push(
            `Working Days changed to ${createCalculatedData?.working_days}`
          );
        }
        if (Number.Get(salaryDetail?.worked_days) !== Number.Get(createCalculatedData?.worked_days)) {
          historyMessage.push(
            `Worked Days changed to ${createCalculatedData?.worked_days}`
          );
        }
        if (Number.Get(salaryDetail?.leave) !== Number.Get(createCalculatedData?.leave)) {
          historyMessage.push(
            `Leave changed to ${createCalculatedData?.leave}`
          );
        }
        if (Number.Get(salaryDetail?.absent) !== Number.Get(createCalculatedData?.absent)) {
          historyMessage.push(
            `Absent changed to ${createCalculatedData?.absent}`
          );
        }
        if (
          Number.Get(salaryDetail?.additional_days) !==
          Number.Get(createCalculatedData?.additional_days)
        ) {
          historyMessage.push(
            `Additional Days changed to ${createCalculatedData?.additional_days}`
          );
        }
        if (Number.Get(salaryDetail?.basic) !== Number.Get(createCalculatedData?.basic)) {
          historyMessage.push(
            `Basic changed to ${Currency
            .IndianFormat(createCalculatedData?.basic)}`
          );
        }
        if (Number.Get(salaryDetail?.hra) != Number.Get(createCalculatedData?.hra)) {
          historyMessage.push(
            `Hra changed to ${Currency.IndianFormat(createCalculatedData?.hra)}`
          );
        }
        if (
          Number.Get(salaryDetail?.special_allowance) !==
          Number.Get(createCalculatedData?.special_allowance)
        ) {
          historyMessage.push(
            `Special Allowance changed to ${Currency.IndianFormat(createCalculatedData?.special_allowance)}`
          );
        }
        if (Number.Get(salaryDetail?.net_salary) !== Number.Get(createCalculatedData?.net_salary)) {
          historyMessage.push(
            `Net Salary changed to ${Currency.IndianFormat(createCalculatedData?.net_salary)}`
          );
        }
        if (
          Number.Get(salaryDetail?.monthly_salary) !== Number.Get(createCalculatedData?.monthly_salary)
        ) {
          historyMessage.push(
            `Monthly Salary changed to ${Currency.IndianFormat(createCalculatedData?.monthly_salary)}`
          );
        }
        if (
          Number.Get(salaryDetail?.additional_day_allowance) !==
          Number.Get(createCalculatedData?.additional_day_allowance)
        ) {
          historyMessage.push(
            `Additional Aay allowance changed to ${Currency.IndianFormat(createCalculatedData?.additional_day_allowance)}`
          );
        }
        if (Number.Get(salaryDetail?.bonus) !== Number.Get(createCalculatedData?.bonus)) {
          historyMessage.push(
            `Bonus changed to ${Currency.IndianFormat(createCalculatedData?.bonus)}`
          );
        }
        if (
          Number.Get(salaryDetail?.salary_per_day) !== Number.Get(createCalculatedData?.salary_per_day)
        ) {
          historyMessage.push(
            `Salary per day changed to ${Currency.IndianFormat(createCalculatedData?.salary_per_day)}`
          );
        }
        if (Number.Get(salaryDetail?.leave_salary) != Number.Get(createCalculatedData?.leave_salary)) {
          historyMessage.push(
            `Leave salary changed to ${Currency.IndianFormat(createCalculatedData?.leave_salary)}`
          );
        }
        if (Number.Get(salaryDetail?.fine) != Number.Get(createCalculatedData?.fine)) {
          historyMessage.push(
            `Fine changed to ${Currency.IndianFormat(createCalculatedData?.fine)}`
          );
        }
        if (
          Number.Get(salaryDetail?.additional_hours) !=
          Number.Get(createCalculatedData?.additional_hours)
        ) {
          historyMessage.push(
            `Additional Hours changed to ${createCalculatedData?.additional_hours}`
          );
        }
        if (
          Number.Get(salaryDetail?.additional_hours_salary) !=
          Number.Get(createCalculatedData?.additional_hours_salary)
        ) {
          historyMessage.push(
            `Additional Hours Salary changed to ${Currency.IndianFormat(createCalculatedData?.additional_hours_salary)}`
          );
        }
        if (
          Number.Get(salaryDetail?.worked_days_salary) !=
          Number.Get(createCalculatedData?.worked_days_salary)
        ) {
          historyMessage.push(
            `Worked Days Salary changed to ${Currency.IndianFormat(createCalculatedData?.worked_days_salary)}`
          );
        }
        if (
          Number.Get(salaryDetail?.other_allowance) != Number.Get(createCalculatedData?.other_allowance)
        ) {
          historyMessage.push(
            `Other Allowance changed to ${Currency.IndianFormat(createCalculatedData?.other_allowance)}`
          );
        }
        
     res.json(Response.OK, { message: 'Salary Data Updated' });

     res.on("finish", async () => {
      if (historyMessage && historyMessage.length > 0) {
        let message = historyMessage.join();
        history.create(
          `${message}`,
          { user: { id: salaryDetail?.user_id, company_id: companyId } },
          ObjectName.SALARY,
          salaryDetail?.id
        );
      }
  });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
}
module.exports = filterRoute;
