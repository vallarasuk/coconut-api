const ObjectName = require("../../helpers/ObjectName");
const Permission = require("../../helpers/Permission");
const { BAD_REQUEST } = require("../../helpers/Response");
const Request = require("../../lib/request");
const SalaryService = require("../../services/SalaryService");
const History = require("../../services/HistoryService");


async function create(req, res, next) {
    try {
        const data = req.body;
        const companyId = Request.GetCompanyId(req);
         data.timeZone = Request.getTimeZone(req);
        const hasPermission = await Permission.Has(Permission.SALARY_ADD, req);
       
          let response = await SalaryService.create(data, companyId)
        // systemLog
        if(response){
        res.json(200, {
            message: "Salary Created"
        });
        
    }
    } catch (err) {

        console.log(err);
        res.json(BAD_REQUEST, {
            message: err.message
        });
    }
};

module.exports = create;