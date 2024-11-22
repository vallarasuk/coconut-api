const restify = require("restify");
const errors = require("restify-errors");

module.exports = (req, res, next) => {
  if (!req.isAdmin && !req.isManager) {
    return null;
  }

  return next();
};
