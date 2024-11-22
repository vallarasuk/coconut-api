const Permission = require("../../helpers/Permission");
const GatePassService = require("../../services/GatePassService");


async function del(req, res, next) {
  try{
    const hasPermission = await Permission.Has(Permission.GATE_PASS_DELETE, req);

    GatePassService.del(req, res, next)
} catch(err){
    console.log(err);
}
};

module.exports = del;