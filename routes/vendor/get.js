const restify = require("restify");
const errors = require("restify-errors");

// Models
const { AccountVendor } = require("../../db").models;
const vendorDetails = require("./processList");

function get(req, res, next) {
  const id = req.params.id;


  AccountVendor.findOne({
    where: { id },
  })
    // eslint-disable-next-line new-cap
    .then((vendor) => res.json(vendorDetails(vendor)));
}
module.exports = get;
