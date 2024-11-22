const { userService ,getUserDetailById} = require("../../services/UserService");
;
const { getSQlCurrentDateTime } = require( "../../lib/utils");
const utils = require("../../lib/utils");
const { OK } = require("../../helpers/Response");
const Request = require("../../lib/request");
const UserService = require("../../services/UserService");
const { getSettingList, getThemeSetting } = require("../../services/SettingService");
const { getValueByObject } = require("../../services/ValidationService");
const Setting = require("../../helpers/Setting");
const ObjectName = require("../../helpers/ObjectName");
const ShiftService = require("../../services/ShiftService");
const UserRolePermissionService  = require("../../services/UserRolePermissionService");
const Number = require("../../lib/Number");
const AppSettingService = require("../../services/AppSettingService");
const { Location,account} = require("../../db").models;


async function afterLoginSuccess(user, callback) {
    const { id, email, role, name, last_name, token,reset_mobile_data,force_logout,rating,company_id,time_zone } = user.get();
    const session_id = token || Math.floor(Date.now());
    userService
        .update(
            {
                last_loggedin_at: utils.getSQlCurrentDateTime(),
                token: session_id,
                session_id:session_id,
            },
            { where: { id } }
        ).then(() => {

            
            return callback(null, OK, {
                message: "User LoggedIn SuccessFully",
                token: session_id,
                userId: id,
                role: role,
                firstName: name,
                lastName: last_name,
                email,
                reset_mobile_data,
                force_logout,rating,
                company_id,
                time_zone
            });
        })
        .catch(err => callback(err));
    
}
async function loginAs(req, res, next) {
    try{
          let { id } = req.params;
          let body = req.body;
        if (!id) {
            return res.send(404, { message: 'User Id is required' });
        }
        const companyId = Request.GetCompanyId(req);
        // Get User Email by Id
        const userDetails = await getUserDetailById(id,companyId);
       
        if (!userDetails) {
            return res.send(404, { message: 'userDetails not found' });
        }
       
        return afterLoginSuccess(userDetails, async (err, status, result) => {
            if (result && result.userId) {
                let timeZone = result && !result.time_zone?await UserService.getTimeZone(result?.company_id):result?.time_zone
    
                let settingList = [];
    
                let locationList = [];
    
                let accountId;
    
    
                const settingData = await getSettingList(result.company_id);
    
                if (settingData && settingData.length > 0) {
                    settingData.forEach((setting) => {
                        settingList.push({
                            value: setting.value,
                            name: setting.name,
                            object_id: setting.object_id,
                            object_name : setting.object_name
                        });
                    });
                }
    
                let location = await getValueByObject(Setting.ALLOWED_LOCATIONS, settingList,  result.role, ObjectName.ROLE);
    
                let locationId = location && location.split(",");
    
                if (locationId && locationId.length == 1) {
                    const locationData = await Location.findOne({
                        where: { id: location, company_id: result.company_id },
                    });
    
                    if (locationData) {
                        locationList.push({
                            id: locationData.id,
                            name: locationData.name,
                        });
                    }
                }
    
                const permissionList = await UserRolePermissionService.getPermissionList(
                    result.role,
                    result.company_id,
                );
                let currentShiftTime = await ShiftService.getCurrentShiftTimeByUserId(
                    result?.userId,
                    result?.company_id,
                    timeZone
                );
    
                if(Number.isNotNull(body?.pushNotificationToken)){
                    await UserService.updatePushNotificationToken(result?.userId,result.company_id,body?.pushNotificationToken)
                }
    
                if (body && body.isCustomerApp && (result.mobile_number1 || result.email)) {
    
                    let where = { company_id: result.company_id };
    
                    if (result.mobile_number1) {
                        where.mobile = result.mobile_number1;
                    }
    
                    if (result.email) {
                        where.email = result.email;
                    }
                    let accountDetail = await account.findOne({ where });
    
                    if (accountDetail) accountId = accountDetail.id;
                }
    
                // let featureList = await AppSettingService.getFeatureList(result.company_id,body.nameSpace)
    
                result.locationList = locationList;
                result.permissionList = permissionList;
                result.shiftData = currentShiftTime;
                result.settingList = settingList
                result.accountId = accountId;
                result.app_id = body.app_id
                // result.featureList = featureList;
            }
            return res.json(result);
        });
    }catch(err){
        console.log(err);
    }
    };
  
  module.exports = loginAs;