/**
 * Module dependencies
 */
const { BAD_REQUEST, CREATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const service = require("../../services/LocationService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

const locationProductService = require("../../services/locationProductService");
const StoreStatus = require("../../helpers/StoreStatus");

/**
 * Location create route
 */
async function create(req, res, next) {
  const hasPermission = await Permission.Has(Permission.LOCATION_ADD, req);

  

  let companyId = req.user && req.user.company_id;
  const data = req.body;

  if (!companyId) {
    return res.send(404, { message: "Company Id Not Found" });
  }

  const { name, status } = data;

  try {
    const isExist = await service.isExistByName(name, companyId);
    if (isExist) {
      return res.json(BAD_REQUEST, { message: "Location name already exist" });
    }

    const createData = {
      name,
      status: status ? status : StoreStatus.STATUS_ACTIVE,
      companyId,
    };

    // Create Location
    const data = await service.createStore(createData);
    // API response
    res.json(CREATE_SUCCESS, { message: "Location Created" });

    res.on("finish", async () => {
      // Create system log for store creation
      History.create("Location Created", req, ObjectName.LOCATION, data?.id);

      if (data) {
        locationProductService.creatStoreProductByStoreId(data.id, companyId);
      }
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = create;
