const errors = require("restify-errors");
const { Payroll } = require("../../db").models;
function payrollIsExists(user_id, month, year, callback) {
  Payroll.findOne({
    where: { user_id, month, year },
  }).then((isExist) => {
    if (isExist) {
      return callback("Payroll already updated by given month and year");
    }

    return callback();
  });
}
function create(req, res, next) {

  const { userId, month, year } = req.body;

  payrollIsExists(userId, month, year, (err) => {
    if (err) {
      return next(new errors.BadRequestError(err));
    }
    return Payroll.create({
      user_id: userId,
      month,
      year,
    })
      .then(() => {
        res.json(201, {
          message: "Payroll created",
        });
      })
      .catch((err) => {
        req.log.error(err);
        next(err);
      });
  });
}
module.exports = create;
