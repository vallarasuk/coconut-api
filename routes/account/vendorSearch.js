const Permission = require("../../helpers/Permission");

const Response = require("../../helpers/Response");

const AccountService = require("../../services/AccountService");

async function vendorSearch(req, res, next) {
    const hasPermission = await Permission.Has(Permission.VENDOR_VIEW, req);

  
    try {

        AccountService.vendorSearch(req, res, next)
    } catch (err) {
        console.log(err);
    }
}

module.exports = vendorSearch;