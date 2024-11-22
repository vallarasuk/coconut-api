const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");

const ProductPriceService = require("../../services/ProductPriceService");
const History = require("../../services/HistoryService");
const productService = require("../../services/ProductService");
const StatusService = require('../../services/StatusService');


/**
 * Product create route
 */
async function updateStatus(req, res, next) {

    const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);

    let response =  await ProductPriceService.updateStatus(req,res,next)
    if (response && response.statusCode == Response.OK) {
        await productService.reindex(response && response?.product_id, req.user.company_id);
        res.json(Response.OK, {
            message: "Product Price Status Updated",
        }) &&
        res.on("finish", async () => {
            const data = req.body;
            let statusData = await StatusService.getData(data?.status, req.user.company_id)
            History.create(`Product Price Status Updated to ${statusData?.name}`, req, ObjectName.PRODUCT, response?.product_id);
        })
    }

};

module.exports = updateStatus;
