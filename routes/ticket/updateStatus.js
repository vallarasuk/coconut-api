const ticketService = require("../../services/TicketService");


const Permission = require("../../helpers/Permission");

async function updateStatus(req, res, next) {

  const hasPermission = await Permission.Has(Permission.TICKET_EDIT, req);



  ticketService.updateStatus(req, res, next);
}

module.exports = updateStatus;
