
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const salesGstService = require("../../services/SalesGstReportService")
async function search(req, res) {
  try {
 
    await salesGstService.search(req, res);

  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = search;
