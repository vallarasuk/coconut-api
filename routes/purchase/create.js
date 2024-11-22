
const PurchaseService = require("../../services/services/purchaseService")

const Permission = require("../../helpers/Permission");
const UserService = require("../../services/UserService");

async function create(req, res, next) {
 
  PurchaseService.create(req, res, next);
}

module.exports = create;