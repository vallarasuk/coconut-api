const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const history = require("../../services/HistoryService");
const projectuser = require("../../services/ProjectUserService");
const ArrayList = require("../../lib/ArrayList");

const create = async (req, res) => {
  let data = req.body;

  const company_id = Request.GetCompanyId(req);

  let projectDetails = await projectuser.bulkCreate(data, company_id, res);

  if (ArrayList.isArray(projectDetails)) {

    res.json(200, {
      message: "User Added",
      projectDetails: projectDetails,
    });

    res.on("finish", () => {

      for (let l = 0; l < projectDetails.length; l++) {
        const value = projectDetails[l];
        history.create("Project User Added", req, ObjectName.PROJECT, value?.id);
      }
    });
  }

};
module.exports = create;