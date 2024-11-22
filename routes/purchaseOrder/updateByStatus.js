const Permission = require("../../helpers/Permission");

const purchaseOrderService = require("../../services/PurchaseOrderService");

async function updateStatus(req, res, next) {
    try {
      const hasPermission = await Permission.Has(Permission.PURCHASE_ORDER_STATUS_UPDATE, req);

  
        purchaseOrderService.updateByStatus(req, res, next)
       
      } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
      }
}

module.exports = updateStatus;
