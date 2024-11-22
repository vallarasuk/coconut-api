// Status
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const orderProductService = require("../../services/OrderProductService");
const ObjectName = require("../../helpers/ObjectName");

async function del(req, res, next) {
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_DELETE, req);


    const { id } = req.params;

    try {

        const data = await orderProductService.deleteOrderProductById(id);
        res.on("finish", async () => {
            History.create(`Bill Updated`, req, ObjectName.ORDER_PRODUCT, id);
        });
        // API response
        res.json(OK, {
            message: "Order Product Deleted"
        });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, {
            message: err.message
        });
    }
};
module.exports = del;
