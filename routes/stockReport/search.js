const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const StockReportService = require('../../services/StockReportService');

async function search(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.STOCK_REPORT_VIEW, req);

  
    const params = req.query;

    let companyId = req.user && req.user.company_id;
    let response = await StockReportService.search(params, companyId);

    //return response
    return res.json(Response.OK, {
      data: response.data,
    });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = search;
