/**
 * Module dependencies
 */
const models = require("../../db/models");

const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");

const { productCategory } = require("../../db").models;

const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Product category delete route by product id
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_CATEGORY_DELETE, req);
 

    const { id } = req.params;

    let company_id = Request.GetCompanyId(req);

    try {

        // Validate product category id
        if (!id) {
            return res.json(BAD_REQUEST, { message: "Product category id is required" });
        }

        // Validate product category is exist or not
        const productCategoryDetails = await productCategory.findOne({
            where: { id, company_id },
        });
        if (!productCategoryDetails) {
            return res.json(BAD_REQUEST, { message: "Product category not found" });
        }

        // Delete product category
        await productCategoryDetails.destroy();

        History.create("Product Category Deleted", req ,ObjectName.CATEGORY,id);

        // API response
        return res.json(DELETE_SUCCESS, { message: "Product Category Deleted" });

    } catch (err) {
        console.log(err);
    }
};

module.exports = del;
