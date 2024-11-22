const Permission = require("../../helpers/Permission");
const PurchaseRecommededProductService = require('../../services/PurchaseRecommendedProductService');

async function search(req, res, next) {
  try {
    const params = req.query;

    let companyId = req.user && req.user.company_id;

    const hasPermission = await Permission.Has(Permission.PURCHASE_RECOMMENDATION_REPORT_VIEW, req);


    let response = await PurchaseRecommededProductService.search(params, companyId,req);

    //return response
    return res.json(200, {
      data: response.data,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      pageSize: response.pageSize,
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
}

module.exports = search;
