const Permission = require("../../helpers/Permission");
const ProductPriceService = require("../../services/ProductPriceService");

/**
 * Product create route
 */
async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_VIEW, req);

    await ProductPriceService.search(req,res,next)

};

module.exports = search;
