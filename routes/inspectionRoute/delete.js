const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const { Inspection, CustomFieldValue } = require('../../db').models;

const del = async (req, res) => {
    try {
      const hasPermission = await Permission.Has(Permission.INSPECTION_DELETE, req);


      // get CustomForm Id from request
      let inspectionId = req.params.id;

      // get company Id from request
      const companyId = Request.GetCompanyId(req);
  
      // validate CustomForm Id exist or not
      if (!inspectionId) {
        return res.json(400, { message: "inspection Id is required" });
      }
  
      // delete CustomForm entry
      await Inspection.destroy({ where: { id: inspectionId, company_id: companyId } });

      await CustomFieldValue.destroy({ where : { object_id: inspectionId, company_id: companyId }})
  
      res.json(200, { message: "Inspection Deleted" });
    } catch (err) {
        console.log(err);
      return res.json(400, { message: err.message });
    }
  };

  module.exports = del;
  