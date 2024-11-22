const ProductPriceService = require("../../services/ProductPriceService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const Response = require("../../helpers/Response");
const productService = require("../../services/ProductService");
const History = require("../../services/HistoryService");

/**
 * Product create route
 */
async function updateIsDefault(req, res, next) {

    const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);


    let response =  await ProductPriceService.updateIsDefaultPrice(req,res,next)
    if (response && response.statusCode == Response.OK) {
        await productService.reindex(response && response?.product_id, req.user.company_id);
        res.json(Response.OK, {
            message: "Product Price Set As Default",
        }) &&
        res.on("finish", async () => {
            History.create("Product Price Set As Default", req, ObjectName.PRODUCT, req.params.id);
        })
    }
   

};

module.exports = updateIsDefault;