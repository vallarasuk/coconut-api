const errors = require("restify-errors");

const Sequelize = require("sequelize");

// Utils
const utils = require("../../lib/utils");

// Models
const { SalaryMonthly, User } = require("../../db").models;

function list(req, res, next) {
  const query = req.query;

  const page = query.page ? parseInt(query.page, 10) : 1;
  if (isNaN(page)) {
    return next(new errors.BadRequestError("Invalid page"));
  }

  const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;
  if (isNaN(pageSize)) {
    return next(new errors.BadRequestError("Invalid page size"));
  }

  const userId = req.params.userId;

  const where = {};

  if (!req.isAdmin && !req.isManager) {
    where.user_id = userId;
    where.status = "Published";
  } else if (query.userId) {
    where.user_id = query.userId;
  }

  if (query.year) {
    where.year = query.year;
  }

  if (query.month) {
    where.month = query.month;
  }

  SalaryMonthly.findAndCountAll({
    where,
    order: [[Sequelize.literal("SalaryMonthly.created_at"), "ASC"]],
    limit: pageSize,
    include: [
      {
        required: true,
        model: User,
        as: "user",
        attributes: ["name"],
      },
    ],
    offset: (page - 1) * pageSize,
  }).then((salaryMonthly) => {
    const salaryMonthlyList = [];

    salaryMonthly.rows.forEach((salaryMonth) => {
      salaryMonth = salaryMonth.get();

      salaryMonthlyList.push({
        id: salaryMonth.id,
        userId: salaryMonth.user_id,
        userName: salaryMonth.user.get().name,
        date: `${utils.getMonthName(salaryMonth.month)}, ${salaryMonth.year}`,
        month: salaryMonth.month,
        year: salaryMonth.year,
        basicSalary: salaryMonth.basic_salary,
        houseRentAllowance: salaryMonth.house_rent_allowance,
        conveyance: salaryMonth.conveyance,
        medicalAllowance: salaryMonth.medical_allowance,
        telephoneAllowance: salaryMonth.telephone_allowance,
        leaveTravelAllowance: salaryMonth.leave_travel_allowance,
        specialAllowance: salaryMonth.special_allowance,
        nightShiftAllowance: salaryMonth.night_shift_allowance,
        medicalInsurance: salaryMonth.medical_insurance,
        providentFund: salaryMonth.provident_fund,
        userStateInsurance: salaryMonth.user_state_insurance,
        gratuity: salaryMonth.gratuity,
        costToCompany: salaryMonth.cost_to_company,
        additionalDays: salaryMonth.additional_days,
        additionalDaysAllowance: salaryMonth.additional_days_allowance,
        additionalBonus: salaryMonth.additional_bonus,
        absentDays: salaryMonth.absent_days,
        lopForAbsent: salaryMonth.lop_for_absent,
        lateHoursDays: salaryMonth.late_hours_days,
        lateHoursDeduction: salaryMonth.late_hours_deduction,
        loanDeduction: salaryMonth.loan_deduction,
        grossSalary: salaryMonth.gross_salary,
        professionalTax: salaryMonth.professional_tax,
        tds: salaryMonth.tds,
        netSalary: salaryMonth.net_salary,
        notes: salaryMonth.notes,
        status: salaryMonth.status,
      });
    });

    const { count, currentPage, lastPage, pageStart, pageEnd } =
      utils.getPageDetails(
        salaryMonthly.count,
        page,
        pageSize,
        salaryMonthlyList.length
      );

    res.json({
      count,
      currentPage,
      lastPage,
      pageStart,
      pageEnd,
      salaryMonthlyList,
    });
  });
}

module.exports = list;
