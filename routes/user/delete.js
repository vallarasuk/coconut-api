const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");

//systemLog
const History = require("../../services/HistoryService");
const UserService = require("../../services/UserService");
const { UserIndex,  User } = require("../../db").models;

async function deleteUser(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await Permission.Has(Permission.USER_DELETE, req);
  
let companyId = Request.GetCompanyId(req);
    const id = parseInt(req.params.id, 10);

    // Validate id
    if (!id) {
      return res.json(400, { message: "User Id is required" });
    }

      const userDetail = await User.findOne({
        attributes: ["id"],
        where: { id: id, company_id: companyId },
      });
      // User Not Found
      if (!userDetail) {
        return res.json(400, { message: "User not found" });
      }

        await User.destroy({
          attributes: ["id"],
          where: { id: id, company_id: companyId},
        });

       //create a log for error
      res.on("finish", async () => {
        await UserService.reindex(id,companyId)
        History.create("User Deleted", req,
          ObjectName.USER,
          id);
      });

      // Success
      res.send({
        message: "User deleted",
      });
      (err) => res.json(400, { message: err.message });
  } catch (err) {
    console.log(err);
  }
}

module.exports = deleteUser;
