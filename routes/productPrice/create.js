const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const ProductPriceService = require("../../services/ProductPriceService");
const productPrice = require("../../services/ProductService");
const History = require("../../services/HistoryService");

/**
 * Product create route
 */
async function create(req, res, next) {
  try {
    const hasPermission = await Permission.Has(
      Permission.PRODUCT_PRICE_ADD,
      req
    );


    const companyId = req.user && req.user.company_id;

    let response = await ProductPriceService.create(req, res, companyId);

    if (response) {
      res.json(Response.UPDATE_SUCCESS, {
        message: "Product Price Added",
        data: response.data,
      });
      res.on("finish", async () => {
        if (response && response.historyMessage && response.historyMessage.length > 0) {
          let message = response?.historyMessage.join();
          History.create(message, req,  ObjectName.PRODUCT, response.data);
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = create;
