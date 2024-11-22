
const PurchaseService = require("../../services/services/purchaseService");

const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");
const { OK } = require("../../helpers/Response");
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");
const StatusService = require("../../services/StatusService");
const Response = require("../../helpers/Response");
const UserService = require("../../services/UserService");

async function pending(req, res, next) {
  const validation = await UserService.validatePermissions(req, res,Permission.PURCHASE_VIEW,Permission.PURCHASE_MANAGE_OTHERS);

  const { companyId, manageOthers } = validation;
  let userId = Request.getUserId(req)
  let completedStatusDetail = await StatusService.Get(ObjectName.PURCHASE, Status.GROUP_COMPLETED, companyId);
  req.query.companyId = companyId
  req.query.excludeStatus = completedStatusDetail && completedStatusDetail?.id
  req.query.userId = userId
  req.query.purchase_manage_others = manageOthers

  let data =  await PurchaseService.search(req.query, res);
  res.json(OK,data);
}

module.exports = pending;
