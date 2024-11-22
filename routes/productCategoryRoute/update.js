/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { productCategory, productIndex } = require("../../db").models;

const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const DataBaseService = require("../../lib/dataBaseService");
const ProductIndexService = require("../../services/ProductIndexService");
const Category = require("../../helpers/Category");


/**
 * Product category update route
 */
async function update(req, res, next) {

    const hasPermission = await Permission.Has(Permission.PRODUCT_CATEGORY_EDIT, req);


    const data = req.body;
    const { id } = req.params;
    const name = data.name;
    const companyId = Request.GetCompanyId(req)
    // Validate product category id
    if (!id) {
        return res.json(BAD_REQUEST, { message: "Product category id is required" });
    }

    // Validate product category is exist or not
    const productCategoryDetails = await productCategory.findOne({
        where: { id, company_id: companyId },
    });
    if (!productCategoryDetails) {
        return res.json(BAD_REQUEST, { message: "Invalid product category id" });
    }

    // Validate product brand name is exist or not
    const productCategoryDetail = await productCategory.findOne({
        where: { name, company_id: companyId },
    });
    if (
        productCategoryDetail &&
        productCategoryDetail.name !== productCategoryDetails.name
    ) {
        return res.json(BAD_REQUEST, { message: "Category name already exist" });
    }
    // Update product details
    let updateProductCategory = {
        name: data.name,
        status: data.status,
    };

    if(data.allow_online != undefined){
        updateProductCategory.allow_online =  data.allow_online ? Category.ALLOW_ONLINE : Category.DENY_ONLINE
    }

    try {

        const save = await productCategoryDetails.update(
            updateProductCategory
        );

        if (data && data.name) {
            ProductIndexService.updateCategoryName(companyId, id, data.name)
        }

        History.create("Product Category Updated", req, ObjectName.CATEGORY, id);

        // API response
        res.json(UPDATE_SUCCESS, { message: "Product Category Updated", data: save.get(), });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = update;
