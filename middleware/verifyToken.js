const restify = require('restify');
const config = require('../lib/config');
const roles = require('../routes/user/roles');
const errors = require('restify-errors');

const db = require('../db');
const UserService = require("../services/UserService");
const  userRolePermissionService  = require("../services/UserRolePermissionService");
const { User } = db.models;

module.exports = (req, res, next) => {
  const token = req.header('authorization');

  if (!token) {
    // return next(new errors.UnauthorizedError("Missing authorization header"));
    return next('Missing authorization header');
  }

  const currentUrl = req.route.path;

  const defaultKeyRoutes = [
    '/user/v1/email',
    '/screenshot/v1',
    '/v1/scheduler/noOrderReport',
    '/v1/scheduler/returnTransferForExcessQuantity',
    '/v1/scheduler/updateReplenishIndex',
    '/v1/scheduler/storeNoCheckInNotification',
    '/v1/scheduler/stockEntryCreateBasedOnLocation',
    '/v1/scheduler/locationProductUpdateMinMaxOrderQuantity',
    '/v1/scheduler/dailyOrderReportNotification',
    '/v1/scheduler/updatePurchaseProductStoreId',
    '/v1/scheduler/storeExcessProductNofitication',
    '/v1/scheduler/storeShortageProductNofitication',
    '/v1/scheduler/createDefaultRecords',
    '/v1/scheduler/sendAttendanceMissingReportEmail',
    '/v1/scheduler/updateAttendanceLateAndOvertimeHours',
    '/v1/scheduler/syncAttendanceFromTracker',
    '/v1/scheduler/syncUsersFromTracker',
    '/v1/scheduler/regenerateSaleNumber',
    '/v1/scheduler/regenerateBillNumber',
    '/v1/scheduler/updateProductIdInBillProduct',
    '/v1/scheduler/updateProductIdInTransferProduct',
    '/v1/scheduler/updateProductIdInStockEntryProduct',
    '/v1/scheduler/updatePrice',
    '/v1/scheduler/migrateProductStatusFromStringToInteger',
    '/v1/scheduler/salesReportMail',
    '/v1/scheduler/userRole',
    '/v1/scheduler/productMediaToMediaMigration',
    '/v1/scheduler/saleDiscrepancyUpdate',
    '/v1/scheduler/productIndex',
    '/v1/scheduler/Sale',
    '/v1/scheduler/vendorProduct',
    '/v1/scheduler/country',
    '/v1/scheduler/createDefaultRecord',
    '/v1/scheduler/autoAbsentAdd',
    '/v1/scheduler/goalStatusNotification',
    '/v1/scheduler/noCheckinActivityNotification',
    '/v1/scheduler/noActivityNotification',
    "/v1/scheduler/updateACH",
    "/v1/scheduler/salesSettlementMisssingReport"
  ];

  if (defaultKeyRoutes.indexOf(currentUrl) > -1) {
    if (token !== config.defaultApiKey) {
      return next(new errors.UnauthorizedError('Invalid Token'));
    }
    return next();
  }

  User.findOne({
    attributes: [
      'id',
      'name',
      'last_name',
      'email',
      'role',
      'login_time',
      'force_daily_update',
      'profile_photo',
      'slack_id',
      'company_id',
      'force_sync',
      "current_shift_id",
      'current_location_id',
      "time_zone",
      "last_checkin_at",
      "mobile_number1",
      "allow_leave"
    ],
    where: { session_id: token },
  }).then(async(user) => {
    if (!user) {
      // return next(new errors.UnauthorizedError("Invalid Token"));
      return res.json(401, { message: 'Invalid Token' });
    }
    if (user && !user.company_id) {
      return next(400, 'Invalid Company');
    }
    if (user && !user.time_zone) {
      const companyDetails =  await UserService.getTimeZone(user && user?.company_id)
      if(companyDetails){
        user.time_zone = companyDetails
      }
    }
    
    if(user && user.role){
     let rolePermission= await userRolePermissionService.getPermissionList( user?.role, user?.company_id);
     req.role_permission = rolePermission
    }

    user = user.get();

    req.user = user;
    req.isAdmin = user.role === roles.ADMIN;
    req.isManager = user.role === roles.MANAGER;
    req.isScrumMaster = user.role === roles.SCRUM_MASTER;
    req.isSuperAdmin = user.role === roles.SUPER_ADMIN;
    return next();
  });
};
