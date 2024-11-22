/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require('../../helpers/Response');


const { productCategory } = require('../../db').models;
const Category = require("../../helpers/Category");
const ObjectName = require("../../helpers/ObjectName");


//systemLog
const History = require('../../services/HistoryService');
const Permission = require('../../helpers/Permission');

/**
 * Create product category route
 */
async function create(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_CATEGORY_ADD, req);

 
  const data = req.body;

  // Validate name
  if (!data.name) {
    return res.json(BAD_REQUEST, { message: 'Name is required' });
  }

  const companyId = req.user && req.user.company_id;

  if (!companyId) {
    return res.json(400, { message: 'Company Not Found' });
  }

  // Product category data
  const productCategoryData = {
    name: data.name,
    status: data.status || Category.STATUS_ACTIVE,
    company_id: companyId,
  };

  try {
    const name =
      (data.name.trim() &&
        data.name.trim().toUpperCase() &&
        data.name.trim().toLowerCase() == productCategoryData.name.toUpperCase()) ||
      productCategoryData.name.toLowerCase() ||
      productCategoryData.name;

    // Validate duplicate product brand name
    const productExist = await productCategory.findOne({
      where: { name, company_id: companyId },
    });
    if (productExist) {
      return res.json(BAD_REQUEST, { message: 'Category name already exist' });
    }
    //create stock entry
    let categoryDetail = await productCategory.create(productCategoryData);
    const productCategoryId = categoryDetail?.dataValues?.id;

    History.create("Product Category Added", req, 
    ObjectName.CATEGORY, productCategoryId);

    res.json(OK, { message: 'Product Category Added' });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = create;
