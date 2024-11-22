const { BAD_REQUEST, OK } = require("../../helpers/Response");

//systemLog
const { AccountEntry } = require("../../db").models;
const AccountEntryService = require("../../services/AccountEntryService");
const Permission = require("../../helpers/Permission");

/**
 * acountentry create route
 */
async function add(req, res, next) {
    const hasPermission = await Permission.Has(Permission.ACCOUNT_ENTRY_ADD, req);

  
    AccountEntryService.create(req, res, next)
}
module.exports = add;
