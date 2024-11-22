// Status

const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const PurchaseService = require("../../services/services/purchaseService");
async function search(req, res, next) {
  try {

    const hasPermission = await Permission.Has(Permission.PURCHASE_REPORT_VENDOR_WISE_VIEW, req);


    let params =  req.query

    const companyId = Request.GetCompanyId(req);
    const timeZone = Request.getTimeZone(req);
    params.timeZone = timeZone

    let data = await PurchaseService.report(params,companyId);

    res.json(data)
  } catch (err) {
    console.log(err);
  }
}
module.exports = search;
