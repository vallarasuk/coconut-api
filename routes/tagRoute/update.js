/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { Tag } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Tags = require("../../helpers/Tag");
const TagStatus = require("../../helpers/TagStatus");
const ObjectName = require("../../helpers/ObjectName");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");

/**
 * Tag update route
 */
async function update(req, res, next) {
    const hasPermission = await Permission.Has(Permission.TAG_EDIT, req);

  
    const data = req.body;
    const { id } = req.params;
    const name = data?.name;
    let company_id = Request.GetCompanyId(req);
    // Validate tag id
    if (!id) {
        return res.json(BAD_REQUEST, { message: "Tag id is required", })
    }

    // Validate tag is exist or not
    const tagDetails = await Tag.findOne({
        where: { id, company_id },
    });

    if (!tagDetails) {
        return res.json(BAD_REQUEST, { message: "Invalid tag id", })
    }

    // Validate product brand name is exist or not
    const tagDetail = await Tag.findOne({
        where: { name, company_id },
    });

    if (tagDetail && tagDetail.name !== tagDetails.name) {
        return res.json(BAD_REQUEST, { message: `${tagDetails.type === "Mobile" ? "Version":"Tag"} name already exist`, })
    }
    // Update tag details
    const updateTag = {
        name: data?.name,
        default_amount: data?.default_amount ? data?.default_amount :null
    };

    try {
        const save = await tagDetails.update(updateTag);

        //create a log
        res.on("finish", async () => {
            History.create("Tag Updated", req,ObjectName.TAG,id);
          });
        // API response
        res.json(UPDATE_SUCCESS, { message: `${tagDetails.type === "Mobile" ? "Version":"Tag"} Updated`, data: save.get(), })
    } catch (err) {
console.log(err);
        res.json(BAD_REQUEST, { message: err.message, })
    }
};

module.exports = update;
