/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");

// Services
const supplierProductService = require("../../services/VendorProductService");

//systemLog
const History = require("../../services/HistoryService");

/**
 * Vendor product delete route by product id
 */
async function del(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_DELETE,
    req
  );

  
  const { id } = req.params;
  const companyId = req.user.company_id;

  try {
    await supplierProductService.deleteProduct(id, companyId);

    History.create("Vendor Product Deleted", req, ObjectName.SUPPLIER_PRODUCT, id);

    res.json(DELETE_SUCCESS, { message: "Vendor Product Deleted" });
  } catch (err) {
    //create system log for product deletion
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = del;
