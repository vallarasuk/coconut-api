const errors = require("restify-errors");

// Validator
const validator = require("../../lib/validator");

// Models
const { SalaryMonthly } = require("../../db").models;

function del(req, res, next) {
 

  const salaryId = req.params.salaryId;
  if (!validator.isInteger(salaryId)) {
    return next(new errors.BadRequestError("Invalid salary id"));
  }

  SalaryMonthly.findOne({
    attributes: ["id"],
    where: { id: salaryId },
  })
    .then((salaryMonthly) => {
      if (!salaryMonthly) {
        return next(new errors.NotFoundError("Salary not found"));
      }

      salaryMonthly
        .destroy()
        .then(() => {
          res.json({ message: "Salary deleted" });
        })
        .catch((err) => {
          req.log.error(err);
          return next(err);
        });
    })
    .catch((err) => {
      console.log(err);
      req.log.error(err);
      return next(err);
    });
}

module.exports = del;
