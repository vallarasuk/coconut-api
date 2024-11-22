// utils
const ObjectName = require("../../helpers/ObjectName");
const Setting = require("../../helpers/Setting");
const DataBaseService = require("../../lib/dataBaseService");
const Request = require("../../lib/request");
const { defaultDateFormat } = require("../../lib/utils");
const { getSettingList } = require("../../services/SettingService");
const { userService } = require("../../services/UserService");
const { getValueByObject } = require("../../services/ValidationService");
const { UserEmployment, Location, Shift, Slack, Tag, AddressModel, User } = require("../../db").models;

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = Request.GetCompanyId(req);

    const UserEmploymentModal = new DataBaseService(UserEmployment)
    // Validate id
    if (!id) {
      return res.json(400, { message: "User Id is required" });
    }

    try {
      const userDetails = await User.findOne({
        where: { id },
        attributes: { exclude: ["deletedAt"] },
        include: [
          {
            required: false,
            model: AddressModel,
            as: "addressDetail",
            where: { object_id: id, object_name: ObjectName.USER, company_id: companyId }
          }
        ]
      });

      if (!userDetails) {
        return res.json(400, { message: "Portal not found" });
      }

      const query = {
        include: [
          {
            required: false,
            model: Tag,
            as: 'tagDetail',
          },
        ],
        where: { user_id: id, company_id: companyId },
      };

      let slackDetail = await Slack.findOne({
        where: {
          object_id: userDetails && userDetails?.id,
          company_id: companyId
        }
      })
      let settingArray = [];

      let settingList = await getSettingList(Request.GetCompanyId(req));

      if (settingList && settingList.length > 0) {
        for (let i = 0; i < settingList.length; i++) {
          settingArray.push(settingList[i]);

        }
      }

      const Employment = await UserEmploymentModal.findAndCount(query);
      const employmentDetails = Employment.rows;

      let data = {}
      const productTag = await getValueByObject(Setting.PRODUCT_TAG, settingArray, id, ObjectName.USER);
      const userReplenishmentGoalProductCount = await getValueByObject(Setting.USER_REPLENISHMENT_GOAL_PRODUCT_COUNT, settingArray, id, ObjectName.USER);

      for (let i = 0; i < employmentDetails.length; i++) {
        const { shift, start_date, end_date, salary, working_days, tagDetail, leave_balance, manager, primary_location, primary_shift } = employmentDetails[i];


        data.start_date = start_date
        data.end_date = end_date
        data.shift_name = shift?.name
        data.salary = salary ? salary : ""
        data.workingDays = working_days ? working_days : ""
        data.designationId = tagDetail?.id,
          data.designation = tagDetail?.name
        data.leave_balance = leave_balance
        data.manager = manager
        data.primary_location = primary_location
        data.primary_shift = primary_shift
      }
      data.productTag = productTag && productTag.split(',')

      data.id = userDetails.id,
        data.first_name = userDetails.name,
        data.last_name = userDetails.last_name,
        data.roleId = userDetails.role,
        data.email = userDetails.email,
        data.slack_id = userDetails.slack_id,
        data.status = userDetails.status,
        data.avatarUrl = userDetails.media_url,
        data.mobileNumber1 = userDetails.mobile_number1,
        data.address1 = userDetails && userDetails.addressDetail && userDetails.addressDetail.address1,
        data.address2 = userDetails && userDetails.addressDetail && userDetails.addressDetail.address2,
        data.city = userDetails && userDetails.addressDetail && userDetails?.addressDetail.city,
        data.state = userDetails && userDetails.addressDetail && userDetails.addressDetail.state,
        data.country = userDetails && userDetails.addressDetail && userDetails.addressDetail.country,
        data.pin_code = userDetails && userDetails.addressDetail && userDetails.addressDetail.pin_code,
        data.longitude = userDetails && userDetails.addressDetail && userDetails.addressDetail.longitude,
        data.latitude = userDetails && userDetails.addressDetail && userDetails.addressDetail.latitude,
        data.addressId = userDetails && userDetails.addressDetail && userDetails.addressDetail.id,
        data.login_time = userDetails.login_time,
        data.timeZone = userDetails && userDetails.time_zone,
        data.forceSync = userDetails.force_sync,
        data.rating = userDetails && userDetails.rating,
        data.slack_id = slackDetail && slackDetail?.slack_id,
        data.createdAt = defaultDateFormat(userDetails.created_at),
        data.updatedAt = defaultDateFormat(userDetails.updated_at),
        data.date_of_joining = defaultDateFormat(userDetails.date_of_joining),
        data.mobile = userDetails.mobile,
        data.userReplenishmentGoalProductCount = userReplenishmentGoalProductCount,
        data.currentLocationId = userDetails?.current_location_id,
        data.currentShiftId = userDetails?.current_shift_id,
        data.account_id = userDetails && userDetails?.account_id,
        data.force_logout = userDetails && userDetails?.force_logout
      data.allow_leave = userDetails && userDetails?.allow_leave

      res.send(200, data);
    } catch (err) {
      res.send(400, { message: err.message });
      next(err);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = get;
