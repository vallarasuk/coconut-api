const AccountService = require("../../services/AccountService")
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");



/**
 * Tag update route
 */
 async function update (req, res, next){
    const hasPermission = await Permission.Has(Permission.ACCOUNT_EDIT, req);

    try{
        
        AccountService.update(req, res,next)
    }catch(err){
        console.log(err);
    }
   
};
module.exports = update;
