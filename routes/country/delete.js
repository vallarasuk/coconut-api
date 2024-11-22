// Module Dependencies
const Permission = require("../../helpers/Permission");


// Library
const CountryService = require("../../services/CountryService");

// Country Delete Route
async function del (req, res, next) {
    const hasPermission = await Permission.Has(Permission.COUNTRY_DELETE, req);
 
 
   await CountryService.delete(req,res,next);
  }
module.exports = del;