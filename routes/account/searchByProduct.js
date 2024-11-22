// Utils
const AccountService = require("../../services/AccountService")
const Permission = require("../../helpers/Permission");

/**
* Vendor search route
*/
async function searchByProduct(req, res, next) {
    const hasPermission = await Permission.Has(Permission.VENDOR_VIEW, req);
   

 
    try{
        
        AccountService.searchByProduct(req, res,next)
    }catch(err){
        console.log(err);
    }
    
}
module.exports = searchByProduct;
