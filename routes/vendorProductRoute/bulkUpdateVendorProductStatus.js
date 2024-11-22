/**
 * Module dependencies
 */
const {   BAD_REQUEST, UPDATE_SUCCESS } =  require("../../helpers/Response");

const async = require("async");

// Services
const supplierProductService = require("../../services/VendorProductService");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");

/**
 * Update vendor products route
 */
async function bulkUpdateVendorProduct(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_BULK_UPDATE_STATUS,
    req
  );

 
  const { ids, status } = req.body;
  try {
    const companyId = req.user.company_id;

    const products = await supplierProductService.findAllProducts(
      ids,
      companyId
    );

    const updateData = { status };
    products.forEach(async product => {
      await supplierProductService.updateProduct(
              product.id,
              updateData,
              companyId
            );
    });
    res.json(UPDATE_SUCCESS, { message: "Product Status Updated" })

   
  } catch (err) {
console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = bulkUpdateVendorProduct;
