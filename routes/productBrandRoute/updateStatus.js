/**
 * Module dependencies
 */
const {
    BAD_REQUEST,
    UPDATE_SUCCESS,
    UNAUTHORIZED,
} = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { productBrand } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Product update route
 */
async function updateStatus(req, res, next) {
    const hasPermission = await Permission.Has(Permission.BRAND_STATUS_UPDATE, req);



    let company_id = Request.GetCompanyId(req);
    const data = req.body;
    const { id } = req.params;

    try {
        const save = await productBrand.update(data, { where: { id, company_id } });

        res.on("finish", async () => {
            History.create("Brand Updated", req, ObjectName.PRODUCT_BRAND, id);
        });

        // API response
        res.json(UPDATE_SUCCESS, { message: "Brand Updated", data: save })
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message })
    }
};
module.exports = updateStatus