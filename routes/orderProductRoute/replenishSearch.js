// Status
const { BAD_REQUEST } = require("../../helpers/Response");

const Permission = require("../../helpers/Permission");

// Services
const orderProductService = require("../../services/OrderProductService");


async function replenishSearch(req, res, next) {
  const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_VIEW, req);

 

  try {
    await orderProductService.replenishSearch(req, res, next);
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message
    });
  }
};
module.exports = replenishSearch;
