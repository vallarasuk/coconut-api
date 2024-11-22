
const orderService = require("../../services/OrderService");

const Permission = require("../../helpers/Permission");

const Request = require("../../lib/request");

const Response = require("../../helpers/Response");
const invoiceService = require("../../services/invoiceService");
const ObjectName = require("../../helpers/ObjectName");
const history = require("../../services/HistoryService");
const Status = require("../../helpers/Status");

async function completeOrder(req, res, next) {
    try {

        const hasPermission = await Permission.Has(Permission.ORDER_EDIT, req);


        let { id } = req.params;

        let body = req.body;

        let companyId = Request.GetCompanyId(req);

        let userId = Request.getUserId(req);
       
       let response =  await orderService.completeOrder(id, body, companyId, userId);

        res.json(Response.OK, {
            message: ` Order Updated`,
        });

        res.on("finish", async () => {
            if (response && response?.historyMessage && response?.historyMessage.length > 0) {
                let message = response?.historyMessage.join();
                history.create(`${message}`, { user: { id: userId, company_id: companyId } }, ObjectName.ORDER,  response?.orderDetail?.id);
              }
          
              if(response?.orderCompletedStatus && response?.orderCompletedStatus?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED){
          
                response.orderDetail.timeZone = Request.getTimeZone(req)
                await orderService.sendOrderSlackNotification(response?.orderDetail,response?.orderCompletedStatus?.name)
              }
            await invoiceService.create(id, companyId)
          });
    } catch (err) {
        res.json(Response.BAD_REQUEST, {
            message: err.message,
        });
    }
};

module.exports = completeOrder;