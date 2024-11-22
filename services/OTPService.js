const Number = require("../lib/Number");
const { generateOTP } = require("../lib/utils");

const { Otp } = require("../db").models;

class OTPService {
  static async create(params) {
    let otpData = {};
    if (params?.objectName) {
      otpData.object_name = params?.objectName;
    }

    if (params?.objectId) {
      otpData.object_id = params?.objectId;
    }
    if (params?.companyId) {
      otpData.company_id = params?.companyId;
    }
    otpData.code = params?.code ? params?.code : generateOTP(6);

    if (params?.type) {
      otpData.type = params?.type;
    }

    let response = await Otp.create(otpData);

    return response;
  }

  static async verifyOtp(params, res) {
    let where = {};
    if (params?.objectName) {
      where.object_name = params?.objectName;
    }

    if (params?.objectId) {
      where.object_id = params?.objectId;
    }
    if (params?.companyId) {
      where.company_id = params?.companyId;
    }

    if (params?.type) {
      where.type = params?.type;
    }

    where.used_at = null;

    let getOtpDetail = await Otp.findOne({
      where: where,
      order: [["createdAt", "DESC"]],
    });

    if (getOtpDetail) {
      if (getOtpDetail && getOtpDetail?.expired_at == null) {
        if (
          Number.Get(getOtpDetail?.code) == Number.Get(params?.verificationCode)
        ) {
          getOtpDetail.update({
            expired_at: new Date(),
            used_at: new Date(),
          });
          res.json(200, { message: "OTP Verified" });
        } else {
          res.json(400, { message: "Enter Valid Otp" });
        }
      } else {
        res.json(400, { message: "Your Otp Expired" });
      }
    }
  }
}
module.exports = OTPService;
