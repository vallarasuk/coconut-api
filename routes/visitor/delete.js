const Permission = require("../../helpers/Permission");
const VisitorService  = require("../../services/VisitorService");


async function del(req, res, next) {
  try{
    const hasPermission = await Permission.Has(Permission.VISITOR_DELETE, req);
  
    VisitorService.del(req, res, next)
} catch(err){
    console.log(err);
}
};

module.exports = del;