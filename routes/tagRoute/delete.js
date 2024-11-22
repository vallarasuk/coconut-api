/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { Tag } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Tag delete route by tag Id
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.TAG_DELETE, req);
 
  
    const { id } = req.params;
    let company_id = Request.GetCompanyId(req);

    try {

        // Validate tag id
        if (!id) {
            return res.json(BAD_REQUEST, { message: "Tag id is required", })
        }

        // Validate tag is exist or not
        const tagDetails = await Tag.findOne({
            where: { id, company_id },
        });
        if (!tagDetails) {
            return res.json(BAD_REQUEST, { message: "Tag not found", })
        }

        // Delete tag
        await tagDetails.destroy();

        res.on("finish", async () => {
            History.create("Tag deleted", req,ObjectName.TAG,id);
          });
        res.json(DELETE_SUCCESS, { message: "Tag deleted", })
    } catch (err) {
        console.log(err);
    }
};
module.exports = del;
