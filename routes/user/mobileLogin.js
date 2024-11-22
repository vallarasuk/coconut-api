
const { Location, appVersion, account, App: appModel} = require("../../db").models;
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const misMatchIpAddressService = require("../../services/unknownIpAddressService");
const TagType = require("../../helpers/TagType");
const TagStatus = require("../../helpers/TagStatus");
const UserRolePermissionService = require("../../services/UserRolePermissionService");
const {
    getSettingList,
    getValueByObject,
} = require("../../services/SettingService");
const Setting = require("../../helpers/Setting");
const ShiftService = require("../../services/ShiftService");
const Response = require("../../helpers/Response");
const UserService = require("../../services/UserService");
const App = require("../../helpers/App");
const AppSettingService = require("../../services/AppSettingService");
const String = require("../../lib/string");
const Number = require("../../lib/Number");

async function mobileLogin(req, res, next) {
    try {

        const ip_address = Request.getIpAddress(req, res);

        let body = req.body;

        if (body && body.appVersion) {
            let appDetails = await appModel.findOne({where : {status : App.STATUS_ACTIVE , name_space : body.nameSpace}})
            let mobileAppVersions
           
                mobileAppVersions = await appVersion.findAll({
                where: {app_id : appDetails && appDetails.id,status: App.STATUS_ACTIVE },
            });
            if (mobileAppVersions && mobileAppVersions.length > 0) {
                let appVersionMatched = false;

                for (let i = 0; i < mobileAppVersions.length; i++) {
                    if (mobileAppVersions[i].name === body.appVersion) {
                        body.app_id = mobileAppVersions[i].app_id
                        appVersionMatched = true;
                        break;
                    }
                }
                if (!appVersionMatched) {
                    return res.json(Response.OK, { message: `You are using an older version (${body.appVersion}) of the app. Please update to the latest version.` , appVersionUpdate: true});
                }
            }
        }

        let user = await UserService.logIn(null, body, ip_address);

        if (user) {
            let timeZone = user && !user.time_zone?await UserService.getTimeZone(user?.companyId):user?.time_zone

            let settingList = [];

            let locationList = [];

            let accountId;

            req.user = user;

            const settingData = await getSettingList(user.companyId);

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

            let location = await getValueByObject(Setting.ALLOWED_LOCATIONS, settingList,  user.role, ObjectName.ROLE);

            let locationId = location && location.split(",");

            if (locationId && locationId.length == 1) {
                const locationData = await Location.findOne({
                    where: { id: location, company_id: user.companyId },
                });

                if (locationData) {
                    locationList.push({
                        id: locationData.id,
                        name: locationData.name,
                    });
                }
            }

            const permissionList = await UserRolePermissionService.getPermissionList(
                user.role,
                user.companyId,
            );
            let currentShiftTime = await ShiftService.getCurrentShiftTimeByUserId(
                user?.id,
                user?.companyId,
                timeZone
            );

            const storeDetail = await Location.findOne({
                where: { ip_address: ip_address },
            });

            if (!storeDetail) {
                misMatchIpAddressService.sendEmail({
                    userName: String.concatName(user?.firstName, user?.lastName),
                    UserEmail: user?.email,
                    company_id: user?.companyId,
                    ip_address: ip_address,
                });
            }

            if(Number.isNotNull(body?.pushNotificationToken)){
                await UserService.updatePushNotificationToken(user?.id,user.companyId,body?.pushNotificationToken)
            }

            if (body && body.isCustomerApp && (user.mobile_number1 || user.email)) {

                let where = { company_id: user.companyId };

                if (user.mobile_number1) {
                    where.mobile = user.mobile_number1;
                }

                if (user.email) {
                    where.email = user.email;
                }
                let accountDetail = await account.findOne({ where });

                if (accountDetail) accountId = accountDetail.id;
            }


            let featureList = await AppSettingService.getFeatureList(user.companyId,body.nameSpace)

            user.locationList = locationList;
            user.permissionList = permissionList;
            user.shiftData = currentShiftTime;
            user.settingList = settingList
            user.accountId = accountId;
            user.app_id = body.app_id
            user.featureList = featureList;
            user.userId = user && user?.id;
        }

        res.send({
            message: "User LoggedIn",
            user
        });

        res.on("finish", async () => {
            req.user = user;
            History.create("User LoggedIn", req, ObjectName.USER, user.id);
            History.create(`User IP Address Is ${ip_address}`, req, ObjectName.USER, user?.id);
        });
    } catch (err) {
        console.log(err);
        return res.json(Response.BAD_REQUEST, { message: err.message });
    }
}

module.exports = mobileLogin;
