// Services
const productService = require("../../services/ProductService");

//History
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");
const Response = require("../../helpers/Response");
const History = require("../../services/HistoryService");

async function updateStatus(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_UPDATE_STATUS, req);

  
  try{
  const data = req.body;
  const { id } = req.params;
  const companyId = req.user && req.user.company_id;

  let response = await productService.updateStatus(id, data, companyId);

  res.json(Response.UPDATE_SUCCESS, { message: "Product Status Updated", data: response.status_id });

  res.on("finish", async () => {
    //create system log for Product Status updation
    History.create(`Product Status updated to ${response.newStatus} `, req, ObjectName.PRODUCT, id);

});
  }
catch(err){
  console.log(err);
        res.json(Response.BAD_REQUEST, { message: err.message })
}
}
module.exports = updateStatus;
