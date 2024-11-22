const Permission = require("../../helpers/Permission");

const PurchaseService = require("../../services/services/purchaseService");

async function del(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PURCHASE_DELETE, req);

 

  PurchaseService.delete(req, res, next);
}

module.exports = del;
