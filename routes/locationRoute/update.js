/**
 * Module dependencies
 */
const {
    BAD_REQUEST,
    UPDATE_SUCCESS,
    UNAUTHORIZED,
} = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const service = require("../../services/LocationService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Product update route
 */
async function update(req, res, next) {
    const hasPermission = await Permission.Has(Permission.LOCATION_EDIT, req);


    // Validate user
    const data = req.body;
    const { id } = req.params;
     let companyId = Request.GetCompanyId(req)
    try {
         await service.updateStoreById(id, data,companyId,req ,res);
    
       
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message })
    }
};
module.exports = update;
