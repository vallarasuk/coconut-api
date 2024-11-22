

const Request = require("../../lib/request");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const AccountService = require("../../services/AccountService")


/**
 * Create vendor route
 */
async function createVendor(req, res, next) {
    const hasPermission = await Permission.Has(Permission.VENDOR_ADD, req);

  
    try {

        AccountService.create(req, res, next)
    } catch (err) {
        console.log(err);
    }
};
module.exports = createVendor;
