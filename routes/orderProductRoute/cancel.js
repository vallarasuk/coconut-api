const Permission = require("../../helpers/Permission");

// Services
const orderProductService = require("../../services/OrderProductService");

async function cancel(req, res, next) {


    orderProductService.cancel(req, res);
};

module.exports = cancel;
