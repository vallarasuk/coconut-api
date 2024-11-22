// Status
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const { SaleSettlement } = require("../../db").models;


// Services
const service = require("../../services/LocationService");

async function search (req, res, next){
    const hasPermission = await Permission.Has(Permission.LOCATION_VIEW, req);
 

    const params = req.query;
    let companyId = req.user && req.user.company_id;
    const where = {};


    if(!companyId) {
        return res.send(404, {message: "Company Not Found"})
    }

    try {
        let data = await service.searchStore(params, companyId);

        let total = 0;
        const SalesDetail = await SaleSettlement.findAndCountAll({
          where:{ company_id: companyId},
          attributes: ["amount_cash", "amount_upi"],
        });
    
        SalesDetail.rows.forEach((value) => {
          total += Number(value.get("amount_upi"));
          total += Number(value.get("amount_cash"));
        });
        if(data && data.totalAmount){
        data.totalAmount=total
        }
        res.json(data, total)
    } catch (err) {
      console.log(err);
        res.json(BAD_REQUEST, { message : err.message,})
    }
};
module.exports = search;
