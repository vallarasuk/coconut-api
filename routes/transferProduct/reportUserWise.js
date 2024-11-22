const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const { OK } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");
const Request = require("../../lib/request");
const transferProductService = require("../../services/TransferProductService");

async function search(req, res, next) {

  const company_id = Request.GetCompanyId(req);
  if (!company_id) {
    return res.json(Response.BAD_REQUEST, "Company Not Found");
  }
  const hasPermission = await Permission.GetValueByName(
    Permission.TRANSFER_PRODUCT_REPORT_VIEW,
    req.role_permission
  );

  let timeZone = Request.getTimeZone(req);
  let {
    page,
    pageSize,
    search,
    sort,
    sortDir,
    pagination,
    user,
    location,
    date,
    startDate,
    endDate
  } = req.query;

  let customDate = DateTime.getCustomDateTime(date,timeZone)
 
  let params = {
    page,
    pageSize,
    search,
    sort,
    sortDir,
    pagination,
    user,
    location,
    company_id,
    startDate: customDate ? customDate?.startDate : startDate,
    endDate: customDate ? customDate?.endDate : endDate,
  };
  let data = await transferProductService.userWiseReport(params, res);
  res.json(OK, {
    totalCount: data.totalCount,
    currentPage: data.currentPage,
    totalProductCount: data.totalProductCount,
    pageSize: data.pageSize,
    data: data.data,
    search: data.search,
    sort: data.sort,
    sortDir: data.sortDir,
  });
}
module.exports = search;
