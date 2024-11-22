const PurchaseService = require("../../services/services/purchaseService");

const Permission = require("../../helpers/Permission");

async function update(req, res, next) {
  
  const hasPermission = await Permission.Has(Permission.PURCHASE_EDIT, req);



  PurchaseService.update(req, res, next);
}

module.exports = update;
