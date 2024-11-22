//systemLog
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const activityService = require("../../services/ActivityService");

/**
 * Create Activity Type route
 */
async function create(req, res, next) {
  const hasPermission = await Permission.Has(Permission.ACTIVITY_ADD, req);


  const company_id = Request.GetCompanyId(req);
     let userId = Request.getUserId(req);
     let currentLocationId = Request.getCurrentLocationId(req);

  let params ={
    userId: userId,
    company_id: company_id,
    location_id: currentLocationId,
    ...req.body
  }

  let activityResponseData = await activityService.create(params);
  if(activityResponseData){
    return res.json(200, { message: "Activity Created" ,activity_id : activityResponseData.id});
  }

};

module.exports = create;
