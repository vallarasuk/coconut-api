const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const stockEntryService = require("../../services/StockEntryService");
const History = require("../../services/HistoryService");
const Number = require("../../lib/Number");

async function create(req, res, next) {
  try {
    const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }


    let currentShiftId = req?.user?.current_shift_id
    let body = req.body;

    if (!body.storeId) {
      return res.json(Response.BAD_REQUEST, { message: "Location IsRequired" });
    }

    const ownerId = Request.getUserId(req);
    req.body.companyId = companyId;
    req.body.owner_id = ownerId;
    
    if(Number.isNotNull(currentShiftId)){
      req.body.shiftId = currentShiftId
    }
    let stockDetails = await stockEntryService.create(req.body);

    const stockEntryId = stockDetails.dataValues.id;

    res.json(Response.OK, {
      message: "Stock Entry Added",
      stockEntryDetails: stockDetails,
    });
    res.on("finish", async () => {
      History.create("StockEntry Added", req, ObjectName.STOCK_ENTRY, stockEntryId);
    });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = create;
