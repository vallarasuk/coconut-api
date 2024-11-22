const Permission = require("../../helpers/Permission");

// Models
const { User } = require("../../db").models;

//systemLog
const UserService = require("../../services/UserService");

/**
 * Product update route
 */
async function bulkUpdate(req, res, next) {
    
    const hasPermission = await Permission.Has(Permission.USER_EDIT, req);


    UserService.bulkUpdate(req, res);

};
module.exports = bulkUpdate