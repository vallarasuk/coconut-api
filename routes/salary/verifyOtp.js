const Response = require("../../helpers/Response");
const ObjectName = require("../../helpers/ObjectName");
const OTPService = require("../../services/OTPService");

async function verifyOtp(req, res, next) {
  try {
    const data = req.body;

    let params = {
      objectName: ObjectName.SALARY,
      objectId: req.user.id,
      companyId: req.user.company_id,
      verificationCode: data?.otp,
    };

    await OTPService.verifyOtp(params, res);
  } catch (err) {
    console.log(err);

    res.json(Response.BAD_REQUEST, {
      message: "Internal server error.",
    });
  }
}

module.exports = verifyOtp;
