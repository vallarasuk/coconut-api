// Module Dependencies
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { Tag } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const TagStatus = require("../../helpers/TagStatus");
const Request = require("../../lib/request");

// Tag Status update route
async function updateTagStatus (req, res, next) {
    const hasPermission = await Permission.Has(Permission.TAG_STATUS_UPDATE, req);
 

    try {
        const data = req.body;
        const { id } = req.params;
        let company_id = Request.GetCompanyId(req)

        // Validate tag id
        if (!id) {
            return res.json(BAD_REQUEST, { message: "Tag id is required" })
        }

        // Validate tag status
        if(!data.status) {
            return res.json(BAD_REQUEST, { message: "Tag status is required" })
        }

        // Update tag status
        const updateStatus = {
            status : data.status == "Active" ? TagStatus.ACTIVE : TagStatus.INACTIVE,
        };

        await Tag.update(updateStatus, { where: { id, company_id } });

        History.create("Tag Updated", req);

        res.json(UPDATE_SUCCESS, { message: "Tag Updated" })
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message })
    }
}
module.exports = updateTagStatus;