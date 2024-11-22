const restify = require("restify");
const errors = require("restify-errors");

// Models
const { AccountVendor } = require("../../db").models;

function del(req, res, next) {
  const vendorId = req.params.id;


  AccountVendor.findOne({
    attributes: ["id"],
    where: { id: vendorId },
  }).then((VendorDetails) => {
    if (!VendorDetails) {
      return next(new errors.BadRequestError("Vendor not found"));
    }

    AccountVendor.destroy({ where: { id: vendorId } })
      .then(() => {
        res.json({ message: "Vendor Deleted" });
      })
      .catch((err) => {
        req.log.error(err);
        return next(err);
      });
  });
}

module.exports = del;
