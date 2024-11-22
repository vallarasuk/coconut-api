const transferProduct = require(".");
const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const TransferProductStatus = require("../../helpers/TransferProduct");
const Request = require("../../lib/request");

const TransferService = require("../../services/services/transferService");

const StoreProductService = require('../../service/storeProductService')

const StatusService = require("../../services/StatusService");

const Number = require("../../lib/Number");

// Models
const { TransferProduct,  Transfer: TransferModal } = require("../../db").models;

const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.GetValueByName(
            Permission.TRANSFER_PRODUCT_ADD,
            req.role_permission
        );
   

        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //get company Id from request
        let body = req.body;


        const { transferId, transferProducts } = body;

        //validate transfer ID exist or not
        if (!transferId) {
            res.json(400, { message: "Transfer Id IsRequired" });
        }

        //get transfer detail
        let transferDetail = await TransferModal.findOne({
            where: { id: transferId, company_id: companyId }
        })

        const status = await StatusService.getFirstStatus(ObjectName.TRANSFER_PRODUCT, companyId);


        if (transferProducts && transferProducts.length > 0) {

            for (let i = 0; i < transferProducts.length; i++) {
                const {
                    transfer_id: transferId,
                    transfer_product_id,
                    quantity,
                    product_id,
                    amount,
                    fromLocationId,
                    toLocationId
                } = transferProducts[i]


                let transferProductDetail = await TransferProduct.create({
                    transfer_id: transferId,
                    quantity,
                    product_id,
                    amount,
                    status: Number.Get(status),
                    company_id: companyId,
                    from_store_id: transferDetail && transferDetail.from_store_id,
                    to_store_id: transferDetail && transferDetail.to_store_id,
                    type: transferDetail && transferDetail.type,
                })

                if (transferProductDetail) {

                    await StoreProductService.decreaseQuantity(quantity, product_id, companyId, fromLocationId)

                    await StoreProductService.increaseQuantity(quantity, product_id, companyId, toLocationId)
                   
                }

            }

        }

        //return response
        res.json(200, {
            message: "Transfer Product Added",
        });


    } catch (err) {
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
