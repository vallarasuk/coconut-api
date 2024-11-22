const { BAD_REQUEST, OK } = require("../../helpers/Response");
const { product } = require("../../db").models;
const productImageService = require("../../services/ProductImageService");
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const ProductService = require("../../services/ProductService");

async function bulkDelete(req, res, next) {
const hasPermission = await Permission.Has(Permission.PRODUCT_BULK_DELETE, req);
 

    try {
        const data = req.body;
        const productIds = data.ids;
        let company_id = Request.GetCompanyId(req);

        // Validate product id
        if (!productIds && productIds.length < 0) {
            return res.json(BAD_REQUEST, { message: "Product id is required", });
        }

        for (let i = 0; i < productIds.length; i++) {
            const productId = productIds[i];
            const productDetails = await product.findOne({
                where: { id: productId, company_id },
            });

            if(productDetails){
                // delete product
                await product.destroy({ where: { id: productId, company_id } });
                await ProductService.reindex(productId,company_id)
    
                // Delete respective product images
                await productImageService.deleteAllImageByProductId(productId,company_id);
            }

        }

        History.create("Products bulk deleted", req,ObjectName.PRODUCT);
        return res.json(OK, { message: "Products Delete", });
    } catch (err) {
        console.log(err);
    }
};

module.exports = bulkDelete;
