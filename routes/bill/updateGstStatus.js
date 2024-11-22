const { BillService } = require("../../services/services/billService");

const Permission = require("../../helpers/Permission");

async function updateGstStatus(req, res, next) {

  const hasPermission = await Permission.Has(Permission.PURCHASE_EDIT, req);

  

  BillService.updateGstStatus(req, res, next);
}

module.exports = updateGstStatus;
