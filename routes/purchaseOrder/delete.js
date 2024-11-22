const purchaseOrderService = require("../../services/PurchaseOrderService");
const Permission = require("../../helpers/Permission");

 
async function del(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PURCHASE_ORDER_DELETE, req);
  
    purchaseOrderService.del(req, res, next)
  }
  
  module.exports = del;
  