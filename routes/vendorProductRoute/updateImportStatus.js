/**
 * Module dependencies
 */
const moment = require("moment");
const { Op } = require("sequelize");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const vendorProductService = require("../../services/VendorProductService");
//systemLog
const History = require("../../services/HistoryService");
// Models
const { vendor_product } = require("../../db").models;
/**
 * Update vendor products import status
 */
async function updateImportStatus(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_UPDATE_IMPORT_STATUS,
    req
  );


  const { importStatus } = req.params;
  const companyId = req.user.company_id;
  try {
    if (!importStatus) {
      return res.json(BAD_REQUEST, {
        message: "Vendor product import status required",
      });
    }

    // Get products
    const products = await vendor_product.findAll({
      where: { url: { [Op.not]: null } },
    });

    if (!products) {
      return res.json(BAD_REQUEST, { message: "Product not found" });
    }

    products.forEach(async (product) => {
      await vendorProductService.updateProduct(product.id, {
        importStatus,
        lastUpdatedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
        companyId,
      });
    });

    //create system log for update
    History.create("Vendor product import status updated", req);

    res.json(OK, {
      message: "Vendor product import status updated",
    });
  } catch (err) {
console.log(err);

    return next(err);
  }
}
module.exports = updateImportStatus;
