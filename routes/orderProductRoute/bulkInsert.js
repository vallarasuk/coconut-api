const transferProduct = require(".");
const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const TransferProductStatus = require("../../helpers/TransferProduct");
const Request = require("../../lib/request");

const TransferService = require("../../services/services/transferService");

// Models
const { orderProduct, order } = require("../../db").models;

const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.Has(
            Permission.ORDER_PRODUCT_ADD,
            req
        );


        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //get company Id from request
        let body = req.body;

        const { orderId, orderProducts, totalAmount } = body;

        //validate transfer ID exist or not
        if (!orderId) {
            res.json(400, { message: "Order Id IsRequired" });
        }

        if (orderProducts && orderProducts.length > 0) {

            for (let i = 0; i < orderProducts.length; i++) {
                const {
                    order_id: orderId,
                    product_id,
                    quantity,
                    unit_price,
                    price,
                    store_id,
                } = orderProducts[i]


                await orderProduct.create({
                    order_id: orderId,
                    product_id,
                    quantity,
                    unit_price,
                    price,
                    store_id,
                    company_id: companyId
                })

            }

            if (totalAmount) {
                await order.update({ total_amount: totalAmount }, { where: { id: orderId, company_id: companyId } })
            }

        }

        //return response
        res.json(200, {
            message: "Order Product Added",
        });


    } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
