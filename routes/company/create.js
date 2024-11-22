const Permission = require("../../helpers/Permission");
const { hasPermission } = require("../../services/UserRolePermissionService");
const { companyService, isNameExist } = require("../../services/CompanyService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

async function create(req, res, next) {
  try {
    const hasPermissions = await Permission.Has(Permission.COMPANY_ADD, req);
   

    const data = req.body;

    //Validation
    if (!data.company_name) {
      return res.json(400, { message: "Company Name is required" });
    }

    const isNameExists = await isNameExist(data.company_name.trim());
    if (isNameExists) {
      return res.json(400, { message: "Company Name already exist" });
    }

    const createData = companyService.toDbObject(data);
    try {
     const companyDetail= await companyService.create(createData);
      res.json(201, { message: "Company Created" });

      // History
      res.on("finish", async () => {
        History.create("Company Created", req,ObjectName.COMPANY,companyDetail?.id);
      })

    } catch (err) {
      res.json(400, err);
      next(err);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = create;
