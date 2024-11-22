/**
 * Module dependencies
 */
const {
    BAD_REQUEST,
    DELETE_SUCCESS,
    UNAUTHORIZED,
} = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const service = require("../../services/LocationService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

/**
 * Location delete route
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.LOCATION_DELETE, req);


    // Validate user
    const { id } = req.params;

    try {
        const detail = await service.deleteStore(id);
        // API response
        res.json(DELETE_SUCCESS, { message: "Location Deleted", });

        res.on("finish", async () => {
            // create a log for error
            History.create("Location Deleted", req, ObjectName.LOCATION, detail);
        });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message, })
    }
};

module.exports = del;
