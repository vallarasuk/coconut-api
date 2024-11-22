const Permission = require("../../helpers/Permission");
const ProductPriceService = require("../../services/ProductPriceService");

/**
 * Product create route
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);

    await ProductPriceService.del(req,res,next)

};

module.exports = del;
