
const Permission = require("../../helpers/Permission");

const AccountService = require("../../services/AccountService")
/**
 * Vendor delete route by tag Id
 */
 async function del(req, res, next){
    const hasPermission = await Permission.Has(Permission.ACCOUNT_DELETE, req);

    try{
        
        AccountService.del(req, res,next)
    }catch(err){
        console.log(err);
    }

};
module.exports = del;
