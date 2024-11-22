
const Permission = require("../../helpers/Permission");

// Models
const { StockEntryProduct } = require("../../db").models;

const StoreProductService = require('../../service/storeProductService')


const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.Has(
            Permission.STOCK_PRODUCT_ENTRY_ADD,
            req
        );
        

        //get company Id from request
        let body = req.body;

        const { stockEntryId, stockProducts } = body;

        //validate transfer ID exist or not
        if (!stockEntryId) {
            res.json(400, { message: "Stock Entry Id Is Required" });
        }

        if (stockProducts && stockProducts.length > 0) {

            for (let i = 0; i < stockProducts.length; i++) {
                const {
                    stock_entry_id,
                    product_id,
                    quantity,
                    company_id,
                    store_id
                } = stockProducts[i]

                await StoreProductService.update(quantity, product_id, company_id, store_id)

                await StockEntryProduct.create({
                    stock_entry_id, product_id, quantity, company_id
                })


            }
        }

        //return response
        res.json(200, {
            message: "Stock Entry Product Added",
        });


    } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
