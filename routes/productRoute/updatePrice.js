// Services
const productService = require("../../services/ProductService");

//History
const Permission = require("../../helpers/Permission");

async function updatePrice(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);

 

  await productService.updatePrice(req, res, next)
}
module.exports = updatePrice;
