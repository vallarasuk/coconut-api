const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const LeadService = require("../../services/LeadService");


async function del(req, res, next) {
  const hasPermission = await Permission.Has(Permission.LEADS_DELETE, req);
  if (!hasPermission) {
    return res.json(Response.BAD_REQUEST, { message: "Permission Denied" });
  }
  LeadService.del(req, res, next);
}

module.exports = del;