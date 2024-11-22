/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const {
    SYNC_NAME_EXPORT_TO_MASTER,
    SYNC_OBJECT_NAME_VENDOR_PRODUCT,
} = require("../../helpers/Sync");

// Services
const shopifyService = require("../../services/ShopifyService");
const productImageService = require("../../services/ProductImageService");
const syncService = require("../../services/SyncService");

// Models
const { product, vendorProduct } = require("../../db").models;
const Request = require("../../lib/request");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const productService = require("../../services/ProductService");


/**
 * Product delete route by product id
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_DELETE, req);
 

   await productService._delete(req, res, next)
}
module.exports = del;
