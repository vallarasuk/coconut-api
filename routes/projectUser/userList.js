const Request = require("../../lib/request");
const { OK } = require("../../helpers/Response");
const UserService = require("../../services/UserService");
const ArrayList = require("../../lib/ArrayList");
const { ProjectUser,Project,User } = require("../../db").models;

async function userList(req, res, next) {
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

  let projectUserList = await ProjectUser.findAll({company_id : companyId, project_id : params?.projectId});
  params.excludeIds = ArrayList.isArray(projectUserList) && projectUserList.map((value=> value?.user_id)) || null

  let data = await UserService.getList(params);

  res.send(OK, data);
}

module.exports = userList;
