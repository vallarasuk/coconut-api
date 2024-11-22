/**
 * Module dependencies
 */
const { BAD_REQUEST, DELETE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

const { productBrand } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");

/**
 * Brand delete route by brand id
 */
async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.BRAND_DELETE, req);
 
  
    const { id } = req.params;
    let company_id = Request.GetCompanyId(req);

    try {

        // Validate brand id
        if (!id) {
            return res.json(BAD_REQUEST, { message: "Brand id is required", });
        }

        // Validate brand is exist or not
        const productBrandDetails = await productBrand.findOne({ where: { id, company_id } });
        if (!productBrandDetails) {
            return res.json(BAD_REQUEST, { message: "Brand not found", });

        }

        // Delete brand
        await productBrandDetails.destroy();

        res.on("finish", async () => {
            History.create("Brand deleted", req,ObjectName.PRODUCT_BRAND,id);
          });

        res.json(DELETE_SUCCESS, { message: "Brand deleted", });
        // API response
    } catch (err) {
        console.log(err);
    }
};

module.exports = del;
