// Permission
const Permission = require("../../helpers/Permission");

// Lib
const Request = require("../../lib/request");

const OrderProductService = require("../../services/OrderProductService")
/**
 * orderProduct create route
 */
async function bulkCancel(req, res, next) {

    try {
        const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_EDIT, req);


        //get body data
        const data = req.body;

        //get companyId
        const companyId = Request.GetCompanyId(req);

        await OrderProductService.bulkCancel(data, companyId);

        res.json(200, {
            message: "Product Cancelled",
        });
    } catch(err){
        console.log(err);
        res.json(400, { message:err.message });
    }

}

module.exports = bulkCancel;
