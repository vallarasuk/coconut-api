
const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const { OK } = require("../../helpers/Response");
const Status = require("../../helpers/Status");
const Request = require("../../lib/request");
const StatusService = require("../../services/StatusService");
const ticketService = require("../../services/TicketService");
 
async function getPendingTicket(req, res, next) {
  const hasPermission = await Permission.Has(Permission.TICKET_VIEW, req);
  

  const manageOtherPermission = await Permission.Has(
    Permission.TICKET_MANAGE_OTHERS,
    req
  );

  req.query.manageOtherPermission = manageOtherPermission
  req.query.group_id = Status.GROUP_COMPLETED
  let statusList = await StatusService.getPendingStatuses(req, res)
  const statusIds = statusList && statusList.data && statusList.data.map(item => item.id);
  req.query.excludeStatus = statusIds
 let data = await ticketService.search(req, res);
 res.json(OK,data);
}
module.exports = getPendingTicket;