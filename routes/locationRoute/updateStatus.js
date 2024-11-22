/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const service = require("../../services/LocationService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

/**
 * Product update route
 */
async function updateStatus(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.LOCATION_STATUS_UPDATE,
    req
  );

 

  const data = req.body;
  const { id } = req.params;

  try {
    const save = await service.updateStoreByStatus(id, data);

    // API response
    res.json(UPDATE_SUCCESS, {
      message: "Location updated",
      data: save,
    });

    res.on("finish", async () => {
      // Creating system log for store status updation.
      History.create(
        `Location status Updated to ${data?.status}`,
        req,
        ObjectName.LOCATION,
        id
      );
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = updateStatus;
