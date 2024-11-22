
const Permission = require("../../helpers/Permission");


// // Models
// const { SchedulerJob } = require("../../db").models;
const schedulerService = require("../../services/SchedulerService");

async function create(req, res, next) {
  const hasPermission = await Permission.Has(Permission.SCHEDULER_JOBS_ADD, req);

   
   schedulerService.create(req, res);

  
}

module.exports = create;
