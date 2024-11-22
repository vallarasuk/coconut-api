const Permission = require("../../helpers/Permission");

const orderProductService = require("../../services/OrderProductService");

// Lib
const Request = require("../../lib/request");

/**
 * orderProduct create route
 */
async function update(req, res, next) {
   
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_EDIT, req);



    const data = req.body;

    const { id } = req.params;

    const companyId = Request.GetCompanyId(req);

    orderProductService.update(id, data, companyId, res,req);


}

module.exports = update;
