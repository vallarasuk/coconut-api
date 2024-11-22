/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");

const { productBrand } = require("../../db").models;

// Constant
const Category= require("../../helpers/Category");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const { Sequelize } = require("sequelize");

/**
 * Create Brand route
 */
async function create(req, res, next) {

    const hasPermission = await Permission.Has(Permission.BRAND_ADD, req);
 
 
    const data = req.body;

    // Validate name
    if (!data.name) {
        return res.json(BAD_REQUEST, { message: "Name is required" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
        return res.json(400, { message: "Company Not Found" });
    }

    try {
        const name = data.name.trim();

        // Validate duplicate product brand name
        const productExist = await productBrand.findOne({
            where: {
                company_id: companyId,
                [Sequelize.Op.or]: [
                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), name.toLowerCase()),
                ]
            }
        });
        
        if (productExist) {
            return res.json(BAD_REQUEST, { message: "Brand name already exists" });
        }

        // Brand data
        const brandData = {
            name: data.name,
            status: data.status || Category.STATUS_ACTIVE,
            company_id: companyId
        };
        // Create new Brand
      const detail=  await productBrand.create(brandData);


        res.on("finish", async () => {
            History.create("Brand added", req,ObjectName.PRODUCT_BRAND,detail?.id);
          });
        //create a log

        // API response
        res.json(OK, { message: "Brand added" });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = create;
