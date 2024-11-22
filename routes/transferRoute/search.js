const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const transferService = require("../../services/TransferService");

async function search(req, res, next) {
   // validate permission exiist or not
   const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }

  try{
    transferService.search(req, res, next)
} catch(err){
    console.log(err);
}
};

module.exports = search;