// Status
const { BAD_REQUEST, OK }  = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const orderService = require("../../services/OrderService");
const Request = require("../../lib/request");
const Response = require("../../helpers/Response");

 async function search(req, res, next){

    const companyId = Request.GetCompanyId(req);

    const params = req.query;
    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }

    try {
        const data = await orderService.searchOrder(params,req);
        res.json(data);
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, {
            message: err.message 
       });
    }
};
module.exports = search;
