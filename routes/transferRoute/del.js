const Permission = require("../../helpers/Permission");
const transferService = require("../../services/TransferService");

async function del(req, res, next) {
  // Validate permission exist or not
  const hasPermission = await Permission.Has(Permission.TRANSFER_DELETE, req);

  try{
    transferService.del(req, res, next)
} catch(err){
    console.log(err);
}
};

module.exports = del;