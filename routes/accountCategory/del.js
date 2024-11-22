const restify = require("restify");
const errors = require("restify-errors");
// Models
const { AccountCategory } = require("../../db").models;

function del(req, res, next) {
  const accountCategoryId = req.params.id;



  AccountCategory.findOne({
    attributes: ["id"],
    where: { id: accountCategoryId },
  }).then((accountCategoryDetails) => {
    if (!accountCategoryDetails) {
      return next(new errors.BadRequestError("Category Name not found"));
    }

    AccountCategory.destroy({ where: { id: accountCategoryId } })
      .then(() => {
        res.json({ message: "Account Category deleted" });
      })
      .catch((err) => {
        req.log.error(err);
        return next(err);
      });
  });
}

module.exports = del;
