const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const AttendanceTypeService = require("../../services/AttendanceTypeService");

const leaveType = async (req, res, next) => {
  try {
    let companyId = Request.GetCompanyId(req);
    let user_id = Request.getUserId(req);
    let timeZone = Request.getTimeZone(req);
    if (!companyId) {
      return res.json(Response.BAD_REQUEST, "Company Not Found");
    }
    let params = {
      company_id: companyId,
      ...req.query,
      user_id: user_id,
      timeZone
    };

    let response = await AttendanceTypeService.leaveType(params);
    if (response) {
      res.json(Response.OK, { ...response });
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = leaveType;
