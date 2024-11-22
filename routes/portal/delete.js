// import service
const { portalService } = require("../../services/PortalService");
const Permission = require("../../helpers/Permission");
const { hasPermission } = require("../../services/UserRolePermissionService");

async function deletePortal(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await hasPermission(Permission.PORTAL_DELETE, req);


    const id = parseInt(req.params.id, 10);

    // Validate id
    if (!id) {
      return res.json(400, { message: "Portal is required" });
    }

    try {
      //  Get Portal Details
      const portalDetails = await portalService.findOne({
        attributes: ["id"],
        where: { id },
      });

      // Portal Not Found
      if (!portalDetails) {
        return res.json(400, { message: "Portal not found" });
      }

      // Delete The Portal Details
      await portalDetails.destroy();

      // Success
      res.send({
        message: "Portal deleted",
      });
    } catch (err) {
      (err) => res.json(400, { message: err.message });
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = deletePortal;
