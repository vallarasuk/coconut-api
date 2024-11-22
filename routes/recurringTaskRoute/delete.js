const recurringService = require("../../services/RecurringTaskService");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");

const del = async (req, res) => {
  const hasPermission = await Permission.Has(Permission.RECURRING_TASK_DELETE, req);
 
  try{
  recurringService.del(req, res);
  }catch(err){
    console.log(err);
  }
};
module.exports = del;