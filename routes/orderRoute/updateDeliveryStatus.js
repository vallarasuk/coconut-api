const orderService = require("../../services/OrderService");

const Permission = require("../../helpers/Permission");

async function updateDeliveryStatus(req, res, next) {
  try{

    const hasPermission = await Permission.Has(Permission.ORDER_EDIT, req);



    orderService.updateDeliveryStatus(req, res, next)
} catch(err){
    console.log(err);
}
};

module.exports = updateDeliveryStatus;