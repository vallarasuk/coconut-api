// Services
const productService = require("../../services/ProductService");

//History
const Permission = require("../../helpers/Permission");

async function update(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_EDIT, req);

 

  await productService.update(req, res, next)
}
module.exports = update;
