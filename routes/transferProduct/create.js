const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const TransferProductStatus = require("../../helpers/TransferProduct");
const Request = require("../../lib/request");

const TransferService = require("../../services/services/transferService");
const StatusService = require("../../services/StatusService");



// Models
const { TransferProduct, Transfer: TransferModal } = require("../../db").models;
const History = require("../../services/HistoryService");

const create = async (req, res) => {

  try {
    // Validate Permissions exist or not.
    const hasPermission = await Permission.GetValueByName(
      Permission.TRANSFER_PRODUCT_ADD,
      req.role_permission
    );
  
    //get company Id from request
    let body = req.body;

    const { id, productId } = body;

    //validate transfer ID exist or not
    if (!body.id) {
      res.json(400, { message: "Transfer Id IsRequired" });
    }

    //to get transfer Id
    let transferId = parseInt(id);

    //get quantity from body
    let quantity = body && body.quantity ? parseInt(body.quantity) : null;

    // get amount from body
    let amount = body.amount;


    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    if (productId && id) {

      let transferProductExist = await TransferService.isExist(
        productId,
        transferId,
        companyId
      );

      if (transferProductExist) {
        return res.json(400, { message: "Product Already Added" });
      }
    }

    //validate product avilabilty
    let isProductAvilable = await TransferService.validateProductAvailability(
      id,
      productId,
      quantity,
      companyId,
    );

    const status = await StatusService.getFirstStatus(ObjectName.TRANSFER_PRODUCT, companyId);

    //get transfer detail
    let transferDetail = await TransferModal.findOne({
      where: { id: transferId, company_id: companyId }
    })


    if (isProductAvilable) {
      // create Transfer product create data
      let transferProductCreateData = {
        company_id: companyId,
        status: status ? status : null,
        transfer_id: body.id,
        product_id: body.productId,
        quantity: quantity,
        amount: amount,
        from_store_id: transferDetail && transferDetail.from_store_id,
        to_store_id: transferDetail && transferDetail.to_store_id,
        type: transferDetail && transferDetail.type,
        created_by:req.user.id,
      };
      //create Transfer 
      let transferProductDetails = await TransferProduct.create(
        transferProductCreateData
      );

      //return response
      res.json(200, {
        message: "Transfer Product Added",
        transferProductDetails: transferProductDetails, 
        currentStatusId: status
      });
      res.on("finish", async () => {
        History.create(
          `Transfer Product ${productId} with quantity ${quantity} Added`,
          req,
          ObjectName.TRANSFER,
          transferProductDetails?.transfer_id
        );
      });
    } else {
      return res.json(400, { message: "Out of stock" });
    }
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

module.exports = create;
