const Permission = require("../../helpers/Permission");

const ReplenishmentService = require("../../services/ReplenishmentService")

async function search(req, res, next) {

    const hasPermission = await Permission.Has(Permission.REPLENISHMENT_VIEW, req);

   

    ReplenishmentService.search(req, res);
}
module.exports = search;
