/**
 * Module dependencies
 */
const models = require("../../db/models");
const { BAD_REQUEST, OK } = require("../../helpers/Response");

const TagStatus = require("../../helpers/TagStatus");

// Lib
const Request = require("../../lib/request");

// Models
const { Tag } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName =require("../../helpers/ObjectName");
const Number = require("../../lib/Number");
/**
 * Create tag route
 */
async function create(req, res, next) {
    const hasPermission = await Permission.Has(Permission.TAG_ADD, req);
 
  
    const data = req.body;

    const companyId = Request.GetCompanyId(req);

    // Validate name
    if (!data?.name) {
        return res.json(BAD_REQUEST, { message: "Name is required", })
    }

    // Tag data
    const tagData = {
        name: data.name,
        default_amount:data?.default_amount ? data?.default_amount :null,
        status: data.status || TagStatus.ACTIVE,
        type: data.type || "",
        company_id: companyId,
    };

    try {
        const name = data.name.trim();

        // Validate duplicate Tag name
        const productExist = await Tag.findOne({
            where: { name ,type:data.type, company_id: companyId },
        });
        if (productExist) {
            return res.json(BAD_REQUEST, { message: `${data.type === "Mobile" ? "Version":"Tag"} Name Already Exist `, })
        }
        // Create tag
        const tagDetail=await Tag.create(tagData);

        //create a log
        res.on('finish', async () => {
            History.create("Tag Created", req,ObjectName.TAG,tagDetail?.id);
          })
        // API response
        res.json(OK, { message: `${data.type === "Mobile" ? "Version":"Tag"} Added`, })
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message, })
    }
};
module.exports = create;
