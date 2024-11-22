
const Permission = require("../../helpers/Permission");
const VisitorService  = require("../../services/VisitorService");

async function create(req, res, next) {
    try{
        const hasPermission = await Permission.Has(Permission.VISITOR_ADD, req);

        VisitorService.create(req, res, next)
  } catch(err){
      console.log(err);
  }
  };
  
  module.exports = create;