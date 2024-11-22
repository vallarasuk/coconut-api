const Permission = require("../../helpers/Permission");

const Request = require("../../lib/request");

// Models
const { TransferProduct } = require("../../db").models;

const TransferService = require("../../services/services/transferService");

const StoreProductService = require('../../service/storeProductService')


const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.GetValueByName(
            Permission.TRANSFER_PRODUCT_EDIT,
            req.role_permission
        );
     

        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //get company Id from request
        let body = req.body;

        const { transferProducts } = body;

        if (transferProducts && transferProducts.length > 0) {
            for (let i = 0; i < transferProducts.length; i++) {
                const {
                    transfer_product_id,
                    quantity,
                    amount,
                    transfer_id,
                    product_id,
                    toLocationId,
                    fromLocationId,
                } = transferProducts[i];

                let transferProductDetail = await TransferProduct.findOne({
                    where: { id: transfer_product_id, company_id: companyId }
                })

                if (transferProductDetail) {
                    await TransferProduct.update({
                        quantity,
                        amount,
                    }, { where: { company_id: companyId, id: transfer_product_id } })

                    await StoreProductService.decreaseQuantity(quantity, product_id, companyId, fromLocationId)

                    await StoreProductService.increaseQuantity(quantity, product_id, companyId, toLocationId)
                    
                }

            }
        }

        //return response
        res.json(200, {
            message: "Transfer Product Updated",
        });

    } catch (err) {
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
