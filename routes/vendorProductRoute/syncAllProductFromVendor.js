/**
 * Module dependencies
 */
const { Op } = require("sequelize");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const supplierProductService = require("../../services/VendorProductService");
const moment = require("moment");

const VendorProduct = require("../../helpers/VendorProduct");

// Models
const { vendor_product, account } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");

/**
 * Sync all the products from account
 *
 * @param {*} products
 */
const syncProduct = async (products, companyId) => {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_SYNC_PRODUCTS_FROM_VENDOR,
    req
  );

 
  // Sync each product from account
  for (let product of products) {
    try {
      // Get account product details
      const productDetails =
        await supplierProductService.getVendorProductFromUrl(
          product.url,
          product.account.url,
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
        importedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
        importStatus: VendorProduct.VENDOR_PRODUCT_IMPORT_STATUS_COMPLETED,
      };

      await supplierProductService.updateProduct(
        product.id,
        updateData,
        companyId
      );
    } catch (err) {
      await supplierProductService.updateProduct(product.id, {
        importStatus: err.statusCode ? `Error: ${err.statusCode}` : err.message,
        lastUpdatedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
        companyId,
      });
      continue;
    }
  }
};

/**
 * Sync All account products route
 */
async function syncAllProductFromVendor(req, res, next) {
  try {
    const companyId = req.user.company_id;

    // Get products
    const products = await vendor_product.findAll({
      where: {
        url: { [Op.not]: null },
        import_status: {
          [Op.ne]: VendorProduct.VENDOR_PRODUCT_IMPORT_STATUS_COMPLETED,
        },
        company_id: companyId,
      },
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

    res.json(OK, { message: "Product(s) synced" });
    res.on("finish", async () => await syncProduct(products, companyId));
  } catch (err) {
console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = syncAllProductFromVendor;
