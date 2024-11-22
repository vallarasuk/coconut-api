
// Status
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");

// Services

//systemLog
const History = require("../../services/HistoryService");
const AccountEntryService = require("../../services/AccountEntryService");


const Request = require("../../lib/request");
const { AccountEntry } = require("../../db").models;



/**
 * Customer update route
 */
async function update(req, res, next) {
    const hasPermission = await Permission.Has(Permission.ACCOUNT_ENTRY_EDIT, req);
 


    AccountEntryService.update(req, res, next)
};
module.exports = update;