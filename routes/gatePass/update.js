const Permission = require("../../helpers/Permission");
const GatePassService = require("../../services/GatePassService");



async function update(req, res, next) {

    try{
        const hasPermission = await Permission.Has(Permission.GATE_PASS_EDIT, req);

        GatePassService.update(req, res, next)
    } catch(err){
        console.log(err);
    }
}

module.exports = update;