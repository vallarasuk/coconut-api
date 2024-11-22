
const PurchaseService = require("../../services/services/purchaseService");

const Permission = require("../../helpers/Permission");
const { OK } = require("../../helpers/Response");
const UserService = require("../../services/UserService");
const Request = require("../../lib/request");

async function list(req, res, next) {
  try{
    const validation = await UserService.validatePermissions(req, res,Permission.PURCHASE_VIEW,Permission.PURCHASE_MANAGE_OTHERS);
  
    const { companyId, manageOthers } = validation;
  req.query.companyId = companyId
  req.query.purchase_manage_others = manageOthers
  req.query.userId = req.user.id
  req.query.timeZone = Request.getTimeZone(req)

  let data =  await PurchaseService.search(req.query, res);
  res.json(OK,data);
}catch(err){
  console.log(err);
}
}

module.exports = list;
