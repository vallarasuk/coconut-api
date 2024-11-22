// import service
const { portalService } = require("../../services/PortalService");
const Permission = require("../../helpers/Permission");
const { hasPermission } = require("../../services/UserRolePermissionService");

async function updatePortal(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await hasPermission(Permission.PORTAL_UPDATE, req);


    const data = req.body;
    const { id } = req.params;

    // Validate id
    if (!id) {
      return res.json(400, { message: "Portal id is required" });
    }

    if (!data.portal_name) {
      return res.json(400, { message: "Portal Name is required" });
    }

    if (!data.portal_url) {
      return res.json(400, { message: "Portal Url is required" });
    }

    // Update Portal Data
    const updateData = {
      portal_name: data.portal_name,
      portal_url: data.portal_url,
      template: data.template,
      company_id: data.company,
    };

    try {
      await portalService.update(updateData, {
        where: { id },
      });

      res.json(200, { message: "Portal saved" });
    } catch (err) {
      res.json(400, err);
      next(err);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = updatePortal;
