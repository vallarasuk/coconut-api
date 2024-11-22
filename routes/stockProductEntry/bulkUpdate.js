const Permission = require("../../helpers/Permission");

const Request = require("../../lib/request");

// Models
const { StockEntryProduct } = require("../../db").models;

const StoreProductService = require('../../service/storeProductService')


const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.GetValueByName(
            Permission.STOCK_ENTRY_STATUS_UPDATE,
            req.role_permission
        );
       

        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //get company Id from request
        let body = req.body;

        const { stockProducts } = body;

        if (stockProducts && stockProducts.length > 0) {
            for (let i = 0; i < stockProducts.length; i++) {
                const {
                    stock_entry_product_id,
                    quantity,
                    product_id,
                    company_id,
                    store_id,
                } = stockProducts[i];
                await StoreProductService.update(quantity, product_id, company_id, store_id)


                await StockEntryProduct.update({
                    quantity,
                }, { where: { company_id: companyId, id: stock_entry_product_id } })



            }
        }

        //return response
        res.json(200, {
            message: "Stock Entry Product Updated",
        });

    } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
