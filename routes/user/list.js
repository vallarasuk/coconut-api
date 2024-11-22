const Request = require("../../lib/request");
const { OK } = require("../../helpers/Response");
const UserService = require("../../services/UserService");
async function list(req, res, next) {
  const companyId = Request.GetCompanyId(req);

  const userId = Request.getUserId(req);
  let params = {
    companyId,
    userId,
    ...req.query,
  };

  if (!companyId) {
    return res.json(404, { message: "Company Id Not Found" });
  }

  let data = await UserService.getList(params);

  res.send(OK, data);
}

module.exports = list;
