const errors = require("restify-errors");
const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");
const { TransferProduct } = require("../../db").models;
const History = require("../../services/HistoryService");
const locationProductService = require("../../services/locationProductService");

async function del(req, res, next) {
  // Validation permission exist or not.
  const hasPermission = await Permission.GetValueByName(
    Permission.TRANSFER_PRODUCT_DELETE,
    req.role_permission
  );

  const transferId = req.params.transferId;
  const companyId = Request.GetCompanyId(req);

  TransferProduct.findOne({ where: { id: transferId, company_id: companyId } })
    .then((transferProduct) => {
      if (!transferProduct) {
        return next(new errors.NotFoundError("Transfer Product not found"));
      }
      TransferProduct.destroy({
        where: { id: transferId, company_id: companyId },
      }).then(() => {
        res.json({ message: "Transfer Product deleted" });
        res.on("finish", async () => {
          if (transferProduct) {
            //update store product replenish quantity
            locationProductService.updateByProductId(transferProduct.to_store_id, transferProduct.product_id, companyId, { replenish_quantity: 0 });
          }

          History.create(
            `Transfer Product ${transferProduct?.product_id} deleted`,
            req,
            ObjectName.TRANSFER,
            transferId
          );
        });
      });
    })
    .catch((err) => {
    console.log(err);
      req.log.error(err);
      next(err);
    });
}

module.exports = del;
