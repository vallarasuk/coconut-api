const Permission = require("../../helpers/Permission");
const OrderProductCancelledReportService = require("../../services/OrderProductCancelledReportService");

async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.ORDER_PRODUCT_CANCELLED_REPORT_VIEW, req);

OrderProductCancelledReportService.search(req, res, next);
}

module.exports = search;
