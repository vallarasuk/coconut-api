const OrderService = require("../../services/OrderService");

const sendNotification = async (req, res, next) => {

    await OrderService.sendNotification(req, res, next)

}

module.exports = sendNotification