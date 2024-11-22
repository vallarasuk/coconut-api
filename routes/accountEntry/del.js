const { AccountEntry } = require("../../db").models;
const AccountEntryService = require("../../services/AccountEntryService");
const Permission = require("../../helpers/Permission");

async function deleteAccountEntry(req, res, next) {
  const hasPermission = await Permission.Has(Permission.ACCOUNT_ENTRY_DELETE, req);

  AccountEntryService.del(req, res, next)
}

module.exports = deleteAccountEntry;
