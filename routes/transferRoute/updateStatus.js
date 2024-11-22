const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");
const transferService = require("../../services/TransferService");
const StatusService = require("../../services/StatusService");
const { LOGGED_IN_USER } = require("../../helpers/User");
const { ALLOW_REPLENISHMENT } = require("../../helpers/TransferType");
const Status = require("../../helpers/Status");
const locationProductService = require("../../services/locationProductService");
const history = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Response = require("../../helpers/Response");
const Number = require("../../lib/Number");

// Models
const { TransferType, Transfer: TransferModal } = require("../../db").models;

async function updateStatus(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.TRANSFER_STATUS, req);

   

    let id = req.body && req.body.id;

    if (typeof id === "number") {
      id = id.toString();
    }

    let body = req.body;

    if (!id) {
      return res.json(400, { message: "Please select atleast one item" });
    }

    let ids = typeof id === "string" ? id.split(",") : [id];

    const company_id = Request.GetCompanyId(req);

    let inventoryExist = await TransferModal.findAll({
      where: { id: ids, company_id: company_id },
      include: [
        {
          required: false,
          model: TransferType,
          as: "Type",
        },
      ],
    });


    if (inventoryExist && inventoryExist.length == 0) {
      return res.json(400, { message: "Inventory Not Found" });
    }

    let transferUpdateData = new Object();

    if (inventoryExist && inventoryExist.length > 0) {

      for (let i = 0; i < inventoryExist.length; i++) {
        let nextStatus = await StatusService.getNextStatus(
          inventoryExist[i].status,
          company_id
        );
       
        if (nextStatus && nextStatus.length>0 && nextStatus.includes((Number.Get(body.status)))) {
          transferUpdateData.status = body.status;
          let dueDate = await StatusService.getDueDate(body.status, company_id);
          if (dueDate) {
            transferUpdateData.due_date = dueDate;
          }

          let statusDetail = await StatusService.getData(
            body.status,
            company_id
          );

          if (statusDetail?.default_owner) {
            transferUpdateData.owner_id =
            await StatusService.GetDefaultOwner(statusDetail?.default_owner, req.user.id);
          }

          await transferService.updateStatus(
            transferUpdateData,
            inventoryExist[i].id
          );

          if (body.status) {
            let statusDetail = await StatusService.getData(
              body.status,
              company_id
            );

            if (statusDetail && inventoryExist[i].status != statusDetail.id) {
              if (
                inventoryExist[i].Type &&
                inventoryExist[i].Type.allow_replenishment ==
                  ALLOW_REPLENISHMENT
              ) {
                if (
                  statusDetail.update_transferred_quantity ==
                  Status.UPDATE_DISTRIBUTION_QUANTITY_ENABLED
                ) {
                  locationProductService.updateDistributionQuantityFromReplenish(
                    inventoryExist[i].id,
                    company_id,
                    req
                  );
                } else if (statusDetail.update_quantity == Status.UPDATE_QUANTITY_ENABLED) {
                  locationProductService.updateQuantityFromReplenishment(
                    inventoryExist[i].id,
                    company_id,
                    req
                  );
                }
              } else if (statusDetail.update_quantity == Status.UPDATE_QUANTITY_ENABLED) {
                locationProductService.updateStoreQuantityFromTransfer(
                  inventoryExist[i].id,
                  company_id
                );
              }
            }
          }
        }
      }
    }

    // API response
    res.json(Response.OK, {
      message: "Transfer Updated",
    })

    res.on("finish", async () => {
      history.create("Transfer Updated", req, ObjectName.TRANSFER);
    });

  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = updateStatus;