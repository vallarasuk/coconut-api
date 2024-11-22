
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Request = require("../../lib/request");
const { CandidateService } = require("../../services/candidateService");


async function get(req, res, next) {
  const { id } = req.params;
  const companyId = Request.GetCompanyId(req);
  if (!id) {
    return res.json(BAD_REQUEST, { message: "Candidate Id is required" });
  }
 let data = await CandidateService.get({id, companyId});
 if(data){
   res.json(OK, { data: data });
 }
}

module.exports = get;
