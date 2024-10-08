
const Permission = require("../../helpers/Permission");

const Response = require("../../helpers/Response");

const AccountService = require("../../services/AccountService")


async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.ACCOUNT_VIEW, req);


  try{
        
    AccountService.search(req, res,next)
}catch(err){
    console.log(err);
}
  
}
module.exports = search;
