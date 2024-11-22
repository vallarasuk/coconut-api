/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const supplierProductService = require("../../services/VendorProductService");
const moment = require("moment");

// Services
const syncService = require("../../services/SyncService");

const {
  SYNC_OBJECT_NAME_VENDOR_PRODUCT,
  SYNC_STATUS_COMPLETED,
  SYNC_STATUS_FAILED,
  SYNC_NAME_SYNC_FROM_VENDOR_URL,
} = require("../../helpers/Sync");

const { Op } = require("sequelize");

// Models
const { vendorProduct, account } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");

/**
 * Sync account products route
 */
async function syncProductFromVendor(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_SYNC_PRODUCTS_FROM_VENDOR,
    req
  );

  
  const ids = req.body;
  const companyId = req.user.company_id;
  // Validate ids
  if (!ids) {
    return res.json(BAD_REQUEST, { message: "Product id is required" });
  }

  try {
    // Get products
    const products = await vendorProduct.findAll({
      where: { id: { [Op.in]: ids }, company_id: companyId },
      include: [
        {
          required: true,
          model: account,
          as: "account",
        },
      ],
    });
    if (!products) {
      return res.json(BAD_REQUEST, { message: "Product not found" });
    }

    // Sync each product from account
    for (let product of products) {
      try {
        // Get account scraped data
        const productDetails =
          await supplierProductService.getVendorProductFromUrl(
            product.supplier_url,
            product.account.supplier_url,
            companyId
          );

        const updateData = {
          name: productDetails.name,
          description: productDetails.description,
          price: productDetails.mrp,
          salePrice: productDetails.price,
          brandName: productDetails.brandName,
          categoryName: productDetails.typeName,
          images: productDetails.images,
          lastUpdatedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
        };
        await supplierProductService.updateProduct(
          product.id,
          updateData,
          companyId
        );

        // Set sync status to COMPLETED
        await syncService.updateSyncByObjectId(
          product.id,
          SYNC_OBJECT_NAME_VENDOR_PRODUCT,
          SYNC_NAME_SYNC_FROM_VENDOR_URL,
          {
            status: SYNC_STATUS_COMPLETED,
            result: null,
          },
          companyId
        );
        res.json(OK, { message: "Vendor product updated" });
      } catch (err) {
        // Set sync status to FAILED
        await syncService.updateSyncByObjectId(
          product.id,
          SYNC_OBJECT_NAME_VENDOR_PRODUCT,
          SYNC_NAME_SYNC_FROM_VENDOR_URL,
          {
            status: SYNC_STATUS_FAILED,
            result: err.message,
          },
          companyId
        );
        res.json(OK, { message: err.message });
      }
    }
  } catch (err) {
console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = syncProductFromVendor;
