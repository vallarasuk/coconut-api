const errors = require("restify-errors");
const db = require("../../db");
// Service
const RoleService = require("../../service/role");
function list(req, res, next) {
 
  const role = new RoleService(db);
  role.list((err, roles) => {
    if (err) {
      return next(err);
    }
    res.json(roles);
  });
}
module.exports = list;