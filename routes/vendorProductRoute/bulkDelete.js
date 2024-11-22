/**
 * Module dependencies
 */
const async = require("async");

const { BAD_REQUEST, OK, DELETE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const supplierProductService = require("../../services/VendorProductService");

//systemLog
const History = require("../../services/HistoryService");

/**
 * Product bulk delete route
 */
async function bulkDelete(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_BULK_DELETE,
    req
  );

  
  try {
    const data = req.body;
    const productIds = data.ids;
    const companyId = req.user.company_id;

    // Validate product id
    if (!productIds) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    async.eachSeries(
      productIds,
      async (productId, cb) => {
        try {
          await supplierProductService.deleteProduct(productId, companyId);
          return cb();
        } catch (err) {
          res.status(BAD_REQUEST).send(err);
          return next(err);
        }
      },
      () => {
        // API response
        res.json(DELETE_SUCCESS, { message: "Products Deleted" });
      }
    );

    History.create("Vendor product  bulk updated", req);
  } catch (err) {
  console.log(err);
  }
}
module.exports = bulkDelete;
