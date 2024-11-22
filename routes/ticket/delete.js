/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const ticketService = require("../../services/TicketService");

// Models


const Permission = require("../../helpers/Permission");


async function del(req, res, next) {

    const hasPermission = await Permission.Has(Permission.TICKET_DELETE, req);

    

    const { id } = req.params;

    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(BAD_REQUEST, { message: "Ticket id is required" });
    }

    let params={
        id,
        company_id
    }

   await ticketService.del(params,req);
    res.json(DELETE_SUCCESS, { message: "Ticket deleted" });
    
};
module.exports = del;
