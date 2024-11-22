
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const purchaseGstService = require("../../services/purchaseGstReportService")
async function search(req, res) {
  try {
    const hasPermission = await Permission.Has(Permission.PURCHASE_GST_REPORT_VIEW, req);

    await purchaseGstService.search(req, res);

  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = search;
