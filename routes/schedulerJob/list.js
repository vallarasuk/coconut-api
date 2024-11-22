const Permission = require("../../helpers/Permission");

const schedulerService = require("../../services/SchedulerService");


async function list(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SCHEDULER_JOBS_VIEW,
    req
  );

  schedulerService.search(req, res,next);
    
    
    
}

module.exports = list;
