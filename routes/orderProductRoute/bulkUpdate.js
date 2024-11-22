const Permission = require("../../helpers/Permission");

const Request = require("../../lib/request");

// Models
const { orderProduct, order } = require("../../db").models;

const bulkInsert = async (req, res) => {

    try {
        // Validate Permissions exist or not.
        const hasPermission = await Permission.Has(
            Permission.ORDER_PRODUCT_EDIT,
            req
        );


        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //get company Id from request
        let body = req.body;

        const { orderProducts, totalAmount } = body;

        let orderId;

        if (orderProducts && orderProducts.length > 0) {
            for (let i = 0; i < orderProducts.length; i++) {
                const {
                    order_product_id,
                    order_id,
                    product_id,
                    quantity,
                    unit_price,
                    price,
                    store_id,
                    media_id,
                    media_url,
                    company_id,
                } = orderProducts[i];

                orderId = order_id

                await orderProduct.update({
                    product_id,
                    quantity,
                    unit_price,
                    price,
                    store_id,
                    company_id,
                }, { where: { company_id: companyId, id: order_product_id } })

            }
        }

        if (totalAmount && orderId ) {
            await order.update({ total_amount: totalAmount }, { where: { id: orderId, company_id: companyId } })
        }

        //return response
        res.json(200, {
            message: "Order Product Updated",
        });

    } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
    }
};

module.exports = bulkInsert;
