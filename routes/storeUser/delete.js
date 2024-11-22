/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { StoreUser } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Request = require("../../lib/request");

/**
 * Tag delete route by tag Id
 */
async function del(req, res, next) {
    // const hasPermission = await Permission.Has(Permission.TAG_DELETE, req);
 

    let company_id = Request.GetCompanyId(req)
    try {
        const { id } = req.params;

        // Validate tag id
        if (!id) {
            return res.json(BAD_REQUEST, { message: "Location User Id Is Required", })
        }

        // Validate tag is exist or not
        const locationDetails = await StoreUser.findOne({
            where: { id, company_id },
        });
        if (!locationDetails) {
            return res.json(BAD_REQUEST, { message: "Location User not found", })
        }

        // Delete tag
        await locationDetails.destroy();

        History.create("Location deleted", req);

        res.json(DELETE_SUCCESS, { message: "Team Member Deleted", })
    } catch (err) {
        console.log(err);
    }
};
module.exports = del;
