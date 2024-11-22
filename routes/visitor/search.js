const Permission = require("../../helpers/Permission");
const VisitorService  = require("../../services/VisitorService");


async function search(req, res, next) {
    try{
        const hasPermission = await Permission.Has(Permission.VISITOR_VIEW, req);

        await VisitorService.search(req, res, next)
    } catch(err){
        
        console.log(err);
    }
};

module.exports = search;