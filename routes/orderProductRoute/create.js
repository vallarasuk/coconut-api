// Permission
const Permission = require("../../helpers/Permission");

// Lib
const Request = require("../../lib/request");

const OrderProductService = require("../../services/OrderProductService")
/**
 * orderProduct create route
 */
async function create(req, res, next) {

  const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_ADD, req);

 

  //get body data
  const data = req.body;

  //get companyId
  const companyId = Request.GetCompanyId(req);

  const userId = Request.getUserId(req);

  if (userId) {
    data.userId = userId;
  }

  if (companyId) {
    data.companyId = companyId;
  }

  OrderProductService.create(data,req, res);

}

module.exports = create;
