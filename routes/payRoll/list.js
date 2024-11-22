const errors = require("restify-errors");
const utils = require("../../lib/utils");

const { Payroll, User } = require("../../db").models;

const processPayroll = require("./processPayroll");

function list(req, res, next) {
  const data = req.query;

  const page = data.page ? parseInt(data.page, 10) : 1;
  if (isNaN(page)) {
    return next(new errors.BadRequestError("Invalid page"));
  }

  const pageSize = data.pageSize ? parseInt(data.pageSize, 10) : 20;

  if (isNaN(pageSize)) {
    return next(new errors.BadRequestError("Invalid page size"));
  }

  const payrollWhereCondition = {};
  const isAdmin = req.isAdmin;
  const userId = isAdmin ? data.userId : req.user.id;
  if (userId) {
    payrollWhereCondition.user_id = userId;
  }

  const query = {
    order: [["user_id", "ASC"]],
    include: [
      {
        required: true,
        model: User,
        as: "user",
        attributes: ["name"],
      },
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    where: payrollWhereCondition,
  };

  Payroll.findAndCountAll(query)
    .then((payrolls) => {
      const { count, currentPage, lastPage, pageStart, pageEnd } =
        utils.getPageDetails(payrolls.count, page, pageSize, payrolls.length);
      payrolls = payrolls.rows.map(processPayroll);

      res.json({
        count,
        currentPage,
        lastPage,
        pageStart,
        pageEnd,
        payrolls,
      });
    })
    .catch((err) => {
      req.log.error(err);
      next(err);
    });
}

module.exports = list;
