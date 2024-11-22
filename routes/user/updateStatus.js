const {
    BAD_REQUEST,
    UPDATE_SUCCESS,
} = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { User } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const UserService = require("../../services/UserService");
const Request = require("../../lib/request");

/**
 * Product update route
 */
async function updateStatus(req, res, next) {
    const hasPermission = await Permission.Has(Permission.USER_EDIT, req);

  
    let companyId = Request.GetCompanyId(req);
    // Validate user
    const data = req.body;
    const { id } = req.params;

    data.status = data.status == "Active" ? 1 : data.status == "InActive" ? 2 : "";

    try {
        const save = await User.update(data, { where: { id } });

        //update system log for product update

        // API response
        res.json(UPDATE_SUCCESS, { message: "User Updated", data: save })

        res.on("finish", async () => {
            History.create("User Updated", req, ObjectName.USER, id);
            await UserService.reindex(id,companyId)
            });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message })
    }
};
module.exports = updateStatus