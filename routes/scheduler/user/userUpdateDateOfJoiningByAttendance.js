const { SchedulerJob } = require("../../../db").models;

const ObjectName = require("../../../helpers/ObjectName");
// Lib
const Request = require("../../../lib/request");

const History = require("../../../services/HistoryService");

const schedulerJobCompanyService = require("../schedularEndAt");

const Response = require("../../../helpers/Response");
const UserService = require("../../../services/UserService");

module.exports = async function (req, res) {
  try {
    let company_id = Request.GetCompanyId(req);

    res.send(Response.OK, { message: "Job started" });

    res.on("finish", async () => {
      let id = req.query.id;

      let params = { companyId: company_id, id: id };

      const schedularData = await SchedulerJob.findOne({ where: { id: id, company_id: company_id } });

      History.create(`${schedularData?.name} Job Started`, req, ObjectName.SCHEDULER_JOB, id);

      await schedulerJobCompanyService.setStatusStarted(params, (err) => {
        if (err) {
          throw new err();
        }
      });

      await UserService.updatDateOfJoiningByAttendnace(company_id);

      await schedulerJobCompanyService.setStatusCompleted(params, (err) => {
        if (err) {
          throw new err();
        }
      });

      History.create(`${schedularData?.name} Job Completed`, req, ObjectName.SCHEDULER_JOB, id);
    });
  } catch (err) {
    console.log(err);
  }
};
