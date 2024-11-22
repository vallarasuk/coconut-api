
const Request = require("../../lib/request");
const TransferProductStatus = require("../../helpers/TransferProduct");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const History = require("../../services/HistoryService");

// Models
const { TransferProduct } = require("../../db").models;

const statusUpdate = async (req, res) => {
    let { id } = req.params;

    try {
        // Validate Permission exist or not.
        const hasPermission = await Permission.GetValueByName(Permission.TRANSFER_PRODUCT_EDIT, req.role_permission);
      

        //get Transfer product  Id
        //get quantity
        const { status } = req.body;
        let statusValue="";
        if(status == TransferProductStatus.DRAFT_TEXT){
            statusValue = TransferProductStatus.DRAFT;
        } else if(status == TransferProductStatus.PENDING_TEXT){
            statusValue = TransferProductStatus.PENDING;
        }else{
            statusValue = TransferProductStatus.COMPLETED;
        }
        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //validate Transfer product Id exist or not
        if (!id) {
            return res.json(400, { message: "Transfer Product  Id is required" });
        }

        //validate Transfer  product exist or not
        let isProducExist = await TransferProduct.findOne({
            where: { company_id: companyId, id: id }
        })

        //validate Transfer product exist or not
        if (!isProducExist) {
            return res.json(400, { message: "Transfer Product Not Found" });
        }

        //delete the Transfer product
        await TransferProduct.update({ status: statusValue }, { where: { company_id: companyId, id: id } })
        res.on("finish", async () => {
            History.create(
              "Transfer Product Updated",
              req,
              ObjectName.TRANSFER_PRODUCT,
              id
            );
          });
        res.json(200, { message: "Transfer Product Updated" });

    } catch (err) {
     console.log(err);
        return res.json(400, { message: err.message });
    }
}

module.exports = statusUpdate;