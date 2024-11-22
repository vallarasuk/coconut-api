const errors = require("restify-errors");
const Permission = require("../../helpers/Permission");
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

// Models
const { SchedulerJob } = require("../../db").models;

async function del(req, res, next) {
  
  const hasPermission = await Permission.Has(Permission.SCHEDULER_JOBS_DELETE, req);
 
  
  const id = req.params.id;
  const company_id = Request.GetCompanyId(req);

  if (!id) {
    return next(new errors.BadRequestError("Scheduler Job id is required"));
  }

  SchedulerJob.findOne({where : {id : id,company_id}})
    .then((schedulerJob) => {
      if (!schedulerJob) {
        return next(new errors.NotFoundError("Scheduler Job not found"));
      }

      return schedulerJob
        .destroy()
        .then(() =>
         res.json({ message: "Scheduler Job Deleted" }),
         res.on('finish', async () => {
          History.create(
            "Scheduler Job Deleted",
            req,
            ObjectName.SCHEDULER_JOB,id
          );
        })
        );
    })
    .catch((err) => {
     console.log(err);
      next(err);
    });
}

module.exports = del;
