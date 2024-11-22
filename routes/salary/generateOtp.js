const ObjectName = require("../../helpers/ObjectName");
const Response = require("../../helpers/Response");
const Request = require("../../lib/request");
const { generateOTP } = require("../../lib/utils");
const { getCompanyDetailById } = require("../../services/CompanyService");
const OTPService = require("../../services/OTPService");
const twilioService = require("../../services/twilioService");

async function generateOtp(req, res) {
  try {
    let companyDetail = await getCompanyDetailById(req.user.company_id);

    let phoneNumber = Request.getMobileNumber(req);

    const otp = generateOTP(4);

    let response = await twilioService.sendOtpMessage(
      res,
      phoneNumber,
      otp,
      companyDetail.company_name
    );

    if (response && response.err) {
      return res.json(Response.BAD_REQUEST, { message: response.err });
    } else {
      let params = {
        objectName: ObjectName.SALARY,
        objectId: req.user.id,
        companyId: req.user.company_id,
        code: otp,
      };

      await OTPService.create(params);

      return res.json(Response.OK, { message: "OTP sent" });
    }
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, {
      message: err.message,
    });
  }
}

module.exports = generateOtp;
