const { BillService } = require("../../services/services/billService");

const Permission = require("../../helpers/Permission");

async function update(req, res, next) {

  const hasPermission = await Permission.Has(Permission.PURCHASE_EDIT, req);

  

  BillService.update(req, res, next);
}

module.exports = update;
