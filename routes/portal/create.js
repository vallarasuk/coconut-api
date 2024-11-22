// import service
const Permission = require("../../helpers/Permission");
const {
  isNameExist,
  isUrlExist,
  portalService,
} = require("../../services/PortalService");
const { hasPermission } = require("../../services/UserRolePermissionService");

async function create(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await hasPermission(Permission.PORTAL_ADD, req);


    const data = req.body;

    //Validation
    if (!data.portal_name) {
      return res.json(400, { message: "Portal Name is required" });
    }
    if (!data.portal_url) {
      return res.json(400, { message: "Portal URL is required" });
    }
    const isNameExists = await isNameExist(data.portal_name);
    if (isNameExists) {
      return res.json(400, { message: "Portal Name already exist" });
    }

    const isUrlExists = await isUrlExist(data.portal_url);
    if (isUrlExists) {
      return res.json(400, { message: "Portal URL already exist" });
    }

    // Create portal Data
    const createData = {
      portal_name: data.portal_name,
      portal_url: data.portal_url,
      template: data.template,
      company_id: data.company,
    };

    try {
      await portalService.create(createData);

      res.json(201, { message: "Portal Created Successfully" });
    } catch (err) {
      res.send(400, err);
      next(err);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = create;
