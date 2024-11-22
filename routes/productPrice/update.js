const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");

const ProductPriceService = require("../../services/ProductPriceService");
const productService = require("../../services/ProductService");
const History = require("../../services/HistoryService");

/**
 * Product create route
 */
async function update(req, res, next) {
    try {
        const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);


        let response = await ProductPriceService.update(req, res, next)
        if (response && response.statusCode == Response.OK) {
            await productService.reindex(response && response?.product_id, req.user.company_id);
            res.json(200, {
                message: " Product Price Updated",
            }) &&
            res.on("finish", async () => {
                if (response && response.historyMessage && response.historyMessage.length > 0) {
                  let message = response?.historyMessage.join();
                  History.create(message, req,  ObjectName.PRODUCT, response.product_id);
                }
              });
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = update;
