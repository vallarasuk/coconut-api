// import service
const Permission = require("../../helpers/Permission");
const { hasPermission } = require("../../services/UserRolePermissionService");
const { companyService } = require("../../services/CompanyService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");

async function Delete(req, res, next) {
  try {
    const hasPermissions = await Permission.Has(Permission.COMPANY_DELETE, req);
  

    const id = parseInt(req.params.id, 10);

    // Validate id
    if (!id) {
      return res.json(400, { message: "Company is required" });
    }

    try {
      //  Get Company Details
      const companyDetails = await companyService.findOne({
        attributes: ["id"],
        where: { id },
      });

      // Company Not Found
      if (!companyDetails) {
        return res.json(400, { message: "Company not found" });
      }

      // Delete The Company Details
      await companyDetails.destroy();

      // Success
      res.send({
        message: "Company deleted",
      });

      // History
      res.on("finish", async () => {
        History.create("Company deleted", req, ObjectName.COMPANY, id);
      })

    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = Delete;
