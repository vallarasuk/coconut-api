const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const activityService = require("../../services/ActivityService");


async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.ACTIVITY_DELETE, req);



    activityService.del(req, res, next)
};
module.exports = del;
