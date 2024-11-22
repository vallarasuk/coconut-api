// Service
const UserService = require("../../services/UserService");

const Permission = require("../../helpers/Permission");

//systemLog
const History = require("../../services/HistoryService");

const String = require("../../lib/string");
const User = require("../../helpers/User");
const ObjectName = require("../../helpers/ObjectName");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");

const { md5Password } = require("../../lib/utils");
const PhoneNumber = require("../../lib/PhoneNumber");
const AccountTypeService = require("../../services/AccountTypeService");
const Account = require("../../helpers/Account");
const Status = require("../../helpers/Status");
const { UserEmployment, account } = require("../../db").models;
const { userService } = require("../../services/UserService");
const Number = require("../../lib/Number");

async function create(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await Permission.Has(Permission.USER_ADD, req);
 
    const data = req.body;

    let userData = {};

    let newPassword = data.newPassword;

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
      return res.send(404, { message: "Company Id Not Valid" });
    }

    const defaultTimeZone = await getSettingValue(USER_DEFAULT_TIME_ZONE, companyId);

    if (Number.isNotNull(data?.mobileNumber )){

      const existingUserDetail = await userService.findOne({
        where: {
          mobile_number1: PhoneNumber.Get(data?.mobileNumber), company_id: companyId
        }
      });
    
      if (existingUserDetail) {
        return res.json(400, { message: "User with this mobile number already exists" });
      }
    }

    userData.company_id = companyId;
    userData.name = data.first_name;
    userData.last_name = data.last_name;
    userData.status = User.STATUS_ACTIVE;
    userData.password_token = String.randomString();
    userData.token = Math.floor(Date.now());
    userData.role = data?.role?.value;
    userData.email = data.email;
    userData.date_of_joining = data?.date_of_joining,
      userData.mobile_number1 = data.mobileNumber1 && PhoneNumber.Get(data.mobileNumber1);

    userData["password"] = md5Password(newPassword);

    if (defaultTimeZone) {
      userData.time_zone = defaultTimeZone;
    }else{
      if(data?.timeZone){
        userData.time_zone = data?.timeZone;
      }
    }
    let createData = await UserService.createUser(userData);
    
    if (createData && createData?.id) {
      let params={
        category: Account.CATEGORY_USER,
        companyId: companyId
      }
      let accountTypeIds = await AccountTypeService.getAccountTypeByCategory(params);

      let accountObj = {
        name: data?.first_name,
        email: data?.email,
        status: Status.ACTIVE,
        mobile: data.mobileNumber1 && PhoneNumber.Get(data?.mobileNumber1),
        type: accountTypeIds[0],
        company_id: companyId,
      };

      let accountData = await account.create(accountObj);

      if (accountData && accountData?.id) {
        await UserService.update({ account_id: accountData?.id }, { where: { id: createData?.id, company_id: companyId } })
      }
    }
    let createUserEmpData = {
      user_id: createData?.id,
      company_id: companyId,
      start_date: new Date(),
    }
    await UserEmployment.create(createUserEmpData)

    res.send(200, { message: "User Created" });
    //create a log for erro
    res.on("finish", async () => {
      await UserService.reindex(createData?.id, companyId)
      History.create("User Created", req, ObjectName.USER, createData?.id);
    })

    // try {
    //     inviteEmailService.sendInvite(
    //         req,
    //         data.email,
    //         portalDetail.id,
    //         async () => {
    //             res.status(200).send({
    //                 message: "Portal User Created",
    //             });
    //         }
    //     );
    // } catch (err) {
    //     res.status(400).send(err);
    //     next(err);
    // }
  } catch (err) {
    console.log(err);
  }
}

module.exports = create;
