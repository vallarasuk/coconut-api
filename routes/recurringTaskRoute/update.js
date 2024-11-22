const recurringService = require("../../services/RecurringTaskService");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");

const update = async (req, res) => {
  const hasPermission = await Permission.Has(Permission.RECURRING_TASK_EDIT, req);
  
  try{
  recurringService.update(req, res);
  }catch(err){
    console.log(err);
  }
};
module.exports = update;