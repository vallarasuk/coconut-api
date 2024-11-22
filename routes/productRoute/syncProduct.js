/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

const { updateProducts } = require("../../services/ProductService");
// import updateVendorImportedProduct from "./updateVendorImportedProduct";
// import async from "async";

const { product,vendorProduct,} = require("../../db").models;
/**
 * Sync product from vendor product route
 */
async function syncProduct (req, res, next){
    const hasPermission = await Permission.Has(Permission.PRODUCT_SYNC, req);
 

    const { id } = req.params;

    const companyId = req.user.company_id;

    // Validate id
    if (!id) {
        return res.json(BAD_REQUEST, {message: "Product id is required"});
    }

    try {
        // Get vendor product
        const vendorProducts = await vendorProduct.findOne({
            where: { product_id: id, company_id : companyId },
        });
        if (!vendorProducts) {
            return res.json(BAD_REQUEST, {  message: "Vendor Product for found" });
        }

        // Get product
        const productDetails = await product.findOne({
            where: { id, company_id : companyId },
        });
        if (!productDetails) {
            return res.json(BAD_REQUEST, {  message: "Product for found" });
        }

        const {
            name,
            description,
            brand_id,
            category_id,
            price,
            sale_price,
            barcode,
        } = vendorProducts;

        // Sync Data
        const syncData = {
            name,
            description,
            brand_id,
            category_id,
            price,
            sale_price,
            barcode,
        };

        // Sync product from vendor product
        updateProducts(id, syncData,companyId, () => {
            res.json(OK, {  message: "Product synced"});
        });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, {  message: err.message});
    }
};

module.exports = syncProduct;
