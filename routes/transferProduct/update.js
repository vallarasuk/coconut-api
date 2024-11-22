const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");

// Models
const { TransferProduct, Transfer } = require("../../db").models;


const TransferService = require("../../services/services/transferService");
const ObjectName = require("../../helpers/ObjectName");
const History = require("../../services/HistoryService");

const update = async (req, res) => {
  let { id } = req.params;

  try {
    // Validate Permission exist or not.
    const hasPermission = await Permission.GetValueByName(
      Permission.TRANSFER_PRODUCT_EDIT,
      req.role_permission
    );

   

    let updateData = new Object();

    //get Transfer product Id
    //get quantity
    const { quantity, reasonId, status } = req.body;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    //validate Transfer product Id exist or not
    if (!id) {
      return res.json(400, {
        message: "Transfer Product Id is required",
      });
    }

    //validate Transfer product exist or not
    let isProductExist = await TransferProduct.findOne({
      where: { company_id: companyId, id: id },
    });


    //validate Transfer product exist or not
    if (!isProductExist) {
      return res.json(400, { message: "Transfer Product Not Found" });
    }

    const {
      id: transferProductId,
      transfer_id,
      quantity: tranferQuantity,
      product_id,
    } = isProductExist;

    if (quantity >= 0) {
      
      let isProductAvailable = await TransferService.validateProductAvailability(
        transfer_id,
        product_id,
        tranferQuantity,
        companyId
      );

      if (!isProductAvailable) {
        return res.json(400, { message: "Out Of Stock" });
      }

      updateData.quantity = quantity;

    }

    if (reasonId) {
      updateData.reason_id = reasonId;
    }

    if(status){
      updateData.status = status;

    }
    
    //delete the Transfer product
    await TransferProduct.update(
      updateData,
      { where: { company_id: companyId, id: id } }
    );

    res.json(200, {
      message: "Transfer Product Updated",
    })

    res.on("finish", async () => {
      History.create(
        `Transfer Product ${product_id} quantity changed from ${isProductExist?.quantity} to ${quantity} Updated`,
        req,
        ObjectName.TRANSFER,
        id
      );
    })


  } catch (err) {

    return res.json(400, { message: err.message });
  }
};

module.exports = update;
