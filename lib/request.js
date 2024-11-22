const History = require("../services/HistoryService");

const ObjectName = require("../helpers/ObjectName");
const { companyService } = require("../services/CompanyService");
const { Op } = require("sequelize");

class Request {
  static GetCompanyId(req) {
      return req ? req.user ? req.user.company_id : req.query &&  req.query.companyId ? req.query.companyId : null : null;
  }

  static getTimeZone(req) {
    return req && req.user && req.user.time_zone;
}

  static GetId(req) {
    let id = req.query && req.query.id;
    return id;
  }

  static getUserId(req) {
    let userId = req.user && req.user.id;

    if (!userId) {
      userId = req.query.id;
    }

    return userId;
  }

  static getUserRole(req) {
    let userRole = req.user && req.user.role;

    if (!userRole) {
      userRole = req.query.role;
    }

    return userRole;
  }
  //
  /**
   * Get IP Address
   *
   * @param req
   */
  static GetIPAddress(req) {
    return req.connection.remoteAddress.replace(/^.*:/, "");
  }

  static getIpAddress(req, res) {
    let ipAddress =
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.headers["cf-connecting-ip"] ||
      req.connection.remoteAddress;

    // Remove any leading "ffff:" from IPv4-mapped IPv6 addresses
    ipAddress = ipAddress.replace(/^::ffff:/, "");

    return ipAddress;
  }

  static async GetCompanyIdBasedUrl(baseUrl) {
    const companyDetails = await companyService.findOne({
      where: { portal_url: { [Op.iLike]: baseUrl } },
    });
    if (companyDetails) {
      return companyDetails && companyDetails?.id;
    }
    return companyDetails;
  }

  static getCurrentShiftId(req) {
    return  req && req.user && req.user.current_shift_id;
  }

  static getCurrentLocationId(req) {
    return  req && req.user && req.user.current_location_id;
  }

  static getLastCheckInAt(req) {
    return  req && req.user && req.user.last_checkin_at;
  }
  static getRolePermission(req) {
    return  req && req.user && req.role_permission;
  }

  static getMobileNumber(req) {
    return  req && req.user && req.user.mobile_number1;
  }
}

module.exports = Request;
