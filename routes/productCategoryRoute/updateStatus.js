/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { productCategory } = require("../../db").models;

const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Product category update route
 */
async function updateStatus(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_CATEGORY_UPDATE, req);
 

    const data = req.body;
    const { id } = req.params;

    let company_id = Request.GetCompanyId(req); 
    // Validate product category id
    if (!id) {
        return res.json(BAD_REQUEST, { message: "Product category id is required" });
    }

    // Validate product category is exist or not
    const productCategoryDetails = await productCategory.findOne({
        where: { id, company_id },
    });
    if (!productCategoryDetails) {
        return res.json(BAD_REQUEST, { message: "Invalid product category id" });
    }

    // Update product details
    const updateProductCategoryStatus = {
        status: data.status,
    };

    try {
        const save = await productCategoryDetails.update(
            updateProductCategoryStatus, data
        );
        
        //create a log
        History.create("Product Category Updated", req,ObjectName.CATEGORY,id);

        // API response
        res.json(UPDATE_SUCCESS, { message: "Product Category Updated Sccessfully", data: save.get(), });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = updateStatus;
