const { Op } = require("sequelize");
const { BAD_REQUEST } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");
const Request = require("../../lib/request");
const String = require("../../lib/string");
const { Salary, User, status: statusModal } = require("../../db").models;
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator");
const Permission = require("../../helpers/Permission");
const Month = require("../../lib/Month");
const ObjectHelper = require("../../helpers/ObjectHelper");
const Number = require("../../lib/Number");
const Response = require("../../helpers/Response");
const UserHelper = require("../../helpers/User");
const StatusService = require('../../services/StatusService');
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");
const Where = require('../../lib/Where');
const { getSettingValue } = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");


async function list(req, res, next) {
  try {
    let { page, pageSize, search, sort, user, sortDir, pagination, month, year, showTotalAmount, status } =
      req.query;

    const salaryManageOthers = await Permission.Has(
      Permission.SALARY_MANAGE_OTHERS,
      req
    );

    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = Request.GetCompanyId(req);

    const validOrder = ["ASC", "DESC"];

    const sortableFields = {
      id: "id",
      working_days: "working_days",
      worked_days: "worked_days",
      additional_days: "additional_days",
      additional_hours: "additional_hours",
      additional_hours_salary: "additional_hours_salary",
      basic: "basic",
      user_id: "user_id",
      status: "status",
      gratuity: "gratuity",
      hra: "hra",
      leave: "leave",
      medical_insurance: "medical_insurance",
      net_salary: "net_salary",
      professional_tax: "professional_tax",
      standard_allowance: "standard_allowance",
      unPaid_leaves: "unPaid_leaves",
      special_allowance: "special_allowance",
      worked_days_salary: "worked_days_salary",
      other_allowance: "other_allowance",
      fine: "fine",
      leave_salary: "leave_salary",
      other_deductions: "other_deductions",
      salary_number: "salary_number",
      monthly_salary: "monthly_salary",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      month: "month",
      year: "year",
      user_name: "user_name",
      tds: "tds",
      provident_fund: "provident_fund"
    };

    const sortParam = sort || "salary_number";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, {
        message: `Unable to sort salary by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const where = {};

    where.company_id = companyId;
    if (!salaryManageOthers) {
      let completedStatus = await StatusService.Get(ObjectName.SALARY, Status.GROUP_COMPLETED, companyId)
      where.user_id = req.user.id;
      Where.id(where, "status", completedStatus?.id)
    }

    if (month) {
      where.month = month;
    }

    if (user) {
      where.user_id = user;
    }

    if (year) {
      where.year = year;
    }

    if (Number.isNotNull(status) && salaryManageOthers) {
      Where.id(where, "status", status)
    }

    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          "$user.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$user.last_name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    let order = [];

    if (sort == "user_name") {
      order.push([{ model: User, as: "user" }, "name", sortDirParam]);
    }

    if (sort !== "user_name" && sort) {
      order.push([sortableFields[sortParam], sortDirParam]);
    }

    const query = {
      attributes: { exclude: ["deletedAt"] },
      order,
      where,
      include: [
        {
          required: true,
          model: User,
          as: "user",
          attributes: ["name", "last_name", "media_url", "status"],
        },
        {
          required: false,
          model: statusModal,
          as: "statusDetail",
          attributes: ["name", "id", "color_code"],
        },
      ],
    };

    if (validator.isEmpty(pagination)) {
      pagination = true;
    }

    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    // Get Salary list and count
    const getSalaryList = await Salary.findAndCountAll(query);

    const totalAmountQuery = {
      attributes: { exclude: ["deletedAt"] },
      where,
      include: [
        {
          required: true,
          model: User,
          as: "user",
          attributes: ["name", "last_name", "media_url"],
        },
        {
          required: false,
          model: statusModal,
          as: "statusDetail",
          attributes: ["name", "id", "color_code"],
        },
      ],
    };

    const salaryDataPromises = getSalaryList.rows.map(async (values) => {
      let { user } = values.get();
      const salaryList = { ...values.get() };

      return {
        id: salaryList.id,
        user: String.concatName(user?.name, user?.last_name),
        first_name: user && user?.name,
        last_name: user && user?.last_name,
        image_url: user && user?.media_url,
        working_days: salaryList.working_days,
        worked_days: salaryList.worked_days,
        additional_days: salaryList.additional_days,
        basic: salaryList.basic,
        gratuity: salaryList.gratuity,
        additional_day_allowance: salaryList?.additional_day_allowance,
        other_deductions: salaryList?.other_deductions,
        professional_tax: salaryList?.professional_tax,
        absent: salaryList?.absent,
        hra: salaryList.hra,
        leave: salaryList.leave,
        medical_insurance: salaryList.medical_insurance,
        net_salary: salaryList.net_salary,
        company_id: companyId,
        professional_tax: salaryList.professional_tax,
        standard_allowance: salaryList.standard_allowance,
        special_allowance: salaryList.special_allowance,
        salary_number: salaryList.salary_number,
        user_id: salaryList.user_id,
        monthly_salary: salaryList.monthly_salary,
        provident_fund: salaryList.provident_fund,
        leave_salary: salaryList.leave_salary,
        fine: salaryList.fine,
        bonus: salaryList.bonus,
        tds: salaryList.tds,
        salary_per_day: salaryList.salary_per_day,
        additional_hours: DateTime.getFormattedHour(
          salaryList.additional_hours
        ),
        additionalHourAmount: salaryList.additional_hours_salary,
        month: Month.get(salaryList.month),
        monthValue: salaryList.month,
        year: salaryList.year,
        worked_days_salary: salaryList.worked_days_salary,
        other_allowance: salaryList.other_allowance,
        status:
          salaryList &&
          salaryList?.statusDetail &&
          salaryList?.statusDetail?.name,
        statusId:
          salaryList &&
          salaryList?.statusDetail &&
          salaryList?.statusDetail?.id,
        colorCode:
          salaryList &&
          salaryList?.statusDetail &&
          salaryList?.statusDetail?.color_code,
        salaryDate: DateTime.getMonthStartEndDates(
          salaryList.month,
          salaryList.year,
          Request.getTimeZone(req)
        ),
        attendanceCount: String.isNotNull(salaryList?.attendance) ? JSON.parse(salaryList?.attendance) : [],
        enableAddtionalDayCalculation: await getSettingValue(Setting.ENABLE_SALARY_ADDITIONAL_HOURS, companyId) == "true" ? true : false,
        ...(user?.status == UserHelper.STATUS_INACTIVE && { user_status: UserHelper.STATUS_INACTIVE_TEXT })
      };
    });

    let salaryData = await Promise.all(salaryDataPromises);

    // Sort data by first name if necessary
    if (sortParam === "first_name") {
      salaryData = salaryData.sort((a, b) => a.first_name.localeCompare(b.first_name));
    }

    if (showTotalAmount) {
      const totalSalarydetails = await Salary.findAll(totalAmountQuery);

      const columnSums = {
        basic: 0,
        gratuity: 0,
        hra: 0,
        medical_insurance: 0,
        net_salary: 0,
        professional_tax: 0,
        special_allowance: 0,
        monthly_salary: 0,
        standard_allowance: 0,
        bonus: 0,
        salary_per_day: 0,
        tds: 0,
        provident_fund: 0,
        other_deductions: 0,
        leave_salary: 0,
        additional_day_allowance: 0,
        fine: 0,
        additional_hours_salary: 0,
        worked_days_salary: 0,
        other_allowance: 0,
      };

      totalSalarydetails.forEach((value) => {
        columnSums.basic += Number.Get(value.get("basic"));
        columnSums.gratuity += Number.Get(value.get("gratuity"));
        columnSums.hra += Number.Get(value.get("hra"));
        columnSums.medical_insurance += Number.Get(value.get("medical_insurance"));
        columnSums.net_salary += Number.Get(value.get("net_salary"));
        columnSums.professional_tax += Number.Get(value.get("professional_tax"));
        columnSums.special_allowance += Number.Get(value.get("special_allowance"));
        columnSums.monthly_salary += Number.Get(value.get("monthly_salary"));
        columnSums.standard_allowance += Number.Get(value.get("standard_allowance"));
        columnSums.bonus += Number.Get(value.get("bonus"));
        columnSums.salary_per_day += Number.Get(value.get("salary_per_day"));
        columnSums.tds += Number.Get(value.get("tds"));
        columnSums.provident_fund += Number.Get(value.get("provident_fund"));
        columnSums.other_deductions += Number.Get(value.get("other_deductions"));
        columnSums.leave_salary += Number.Get(value.get("leave_salary"));
        columnSums.additional_day_allowance += Number.Get(value.get("additional_day_allowance"));
        columnSums.fine += Number.Get(value.get("fine"));
        columnSums.additional_hours_salary += Number.Get(value.get("additional_hours_salary"));
        columnSums.worked_days_salary += Number.Get(value.get("worked_days_salary"));
        columnSums.other_allowance += Number.Get(value.get("other_allowance"));
      });

      if (salaryData && salaryData?.length > 0) {
        let lastReCord = ObjectHelper.createEmptyRecord(salaryData[0]);
        lastReCord.basic = columnSums.basic;
        lastReCord.hra = columnSums.hra;
        lastReCord.medical_insurance = columnSums.medical_insurance;
        lastReCord.net_salary = columnSums.net_salary;
        lastReCord.professional_tax = columnSums.professional_tax;
        lastReCord.special_allowance = columnSums.special_allowance;
        lastReCord.monthly_salary = columnSums.monthly_salary;
        lastReCord.standard_allowance = columnSums.standard_allowance;
        lastReCord.bonus = columnSums.bonus;
        lastReCord.salary_per_day = columnSums.salary_per_day;
        lastReCord.tds = columnSums.tds;
        lastReCord.provident_fund = columnSums.provident_fund;
        lastReCord.other_deductions = columnSums.other_deductions;
        lastReCord.leave_salary = columnSums.leave_salary;
        lastReCord.additional_day_allowance = columnSums.additional_day_allowance;
        lastReCord.fine = columnSums.fine;
        lastReCord.additionalHourAmount = columnSums.additional_hours_salary;
        lastReCord.worked_days_salary = columnSums.worked_days_salary;
        lastReCord.other_allowance = columnSums.other_allowance;
        salaryData.push(lastReCord);
      }
    }

    return res.json(Response.OK, {
      totalCount: getSalaryList.count,
      currentPage: page,
      pageSize,
      data: salaryData,
      sort,
      search,
      sortDir,
    });
  } catch (err) {
    console.log(err);
    return res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = list;
