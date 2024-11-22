/**
 * Module dependencies
 */
const {
    BAD_REQUEST,
    UPDATE_SUCCESS,
    UNAUTHORIZED,
} = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Services
const service = require("../../services/PurchaseService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");
const { sendPurchaseStatusChangeNotification } = require("../../services/notifications/purchase");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");

/**
 * Product update route
 */
async function updateStatus(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PURCHASE_STATUS_UPDATE, req);


    const data = req.body;
    const { id } = req.params;
    let companyId = Request.GetCompanyId(req);

    try {
        const save = await service.updatePurchaseStatus(id, data, req);

        // API response
        res.json(UPDATE_SUCCESS, { message: "Purchase Updated", data: save });

        // create a log
        res.on("finish", async () => {
            if(Number.isNotNull(save?.purchaseData?.reviewer_id) && save?.statusData?.notify_to_reviewer == Status.NOTIFY_TO_REVIEWER_ENABLED){
                sendPurchaseStatusChangeNotification({ company_id: companyId, user_id: save?.purchaseData?.reviewer_id, purchase_id: id, statusName: save?.statusData?.name})
            }
            History.create("Purchase Status updated to " + save.newStatus, req, ObjectName.PURCHASE, id);
        });
    } catch (err) {
        res.json(BAD_REQUEST, { message: err.message });
        console.log(err);
    }
};
module.exports = updateStatus;
