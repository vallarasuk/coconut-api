const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const LeadService = require("../../services/LeadService");


async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.LEADS_VIEW, req);
  if (!hasPermission) {

    return res.json(Response.BAD_REQUEST, { message: "Permission Denied" });
  }
  LeadService.search(req, res, next);
}

module.exports = search;