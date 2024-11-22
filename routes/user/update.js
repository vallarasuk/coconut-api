const validator = require("../../lib/validator");
const utils = require("../../lib/utils");
const md5 = require("md5");
const history = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const UserService = require("../../services/UserService");
const Request = require("../../lib/request");
const { User } = require("../../db").models;

function update(req, res, next) {
	const data = req.body;
   let companyId = Request.GetCompanyId(req)
	const userId = req.isAdmin ? data.id || req.user.id : req.user.id;

	const validations = [
		{ value: userId, label: "user id", type: "integer" },
		{ value: data.name, label: "name", validateIfDefined: true },
		{ value: data.email, label: "email", validateIfDefined: true },
		{ value: data.role, label: "role", type: "integer", validateIfDefined: true },
		{ value: data.active, label: "status", type: "integer", validateIfDefined: true }
	];

	validator.validateFields(validations, (err) => {
		if (err) {
			return next(err);
		}

		if (data.dateOfBirth) {
			data.dateOfBirth = utils.date(data.dateOfBirth, "DD-MM-YYYY", "YYYY-MM-DD");
		}

		if (data.dateOfJoining) {
			data.dateOfJoining = utils.date(data.dateOfJoining, "DD-MM-YYYY", "YYYY-MM-DD");
		}

		const updateData = {
			name: data.name,
			last_name: data.lastName,
			email: data.email,
			mobile: data.mobile,
			profile_photo: data.profilePhotoUrl,
			active: data.active,
			available_leave_balance: data.availableLeaveBalance,
			login_time: data.loginTime,
			date_of_joining: data.dateOfJoining || null,
			force_daily_update: data.forceDailyUpdate,
			slack_id: data.slackId
		};


		if (validator.isNotEmpty(data.roleId)) {
			updateData.role = data.roleId;
		}
		if (data.newPassword) {
			updateData.password = md5(data.newPassword);
		}

		User.update(utils.removeUndefinedKeys(updateData), { where: { id: userId } })
			.then(() => {
				res.json({ message: "Profile updated" });
				res.on("finish", async () => {
					history.create("Profile updated", req,
					  ObjectName.USER,
					  userId);
					  await UserService.reindex(userId,companyId)
				  });
			})
			.catch((err) => {
				req.log.error(err);
				return next(err);
			});
	});
};

module.exports = update;
