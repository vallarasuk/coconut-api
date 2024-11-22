// Models
const {
  User,
  Slack,
  UserEmployment,
  UserRolePermission,
  UserIndex,
  Media: MediaModal,
  UserRole,
  Attendance: AttendanceModal,
} = require("../db").models;

const DataBaseService = require("../lib/dataBaseService");
const UserEmploymentService = new DataBaseService(UserEmployment);
const Request = require("../lib/request");

// Constants
const userProfileStatus = require("../helpers/UserProfileStatus");
const s3Utils = require("../lib/s3");

const userService = new DataBaseService(User);

const { BAD_REQUEST, UPDATE_SUCCESS } = require("../helpers/Response");
const { Media } = require("../helpers/Media");

const History = require("./HistoryService");

const ObjectName = require("../helpers/ObjectName");
const DateTime = require("../lib/dateTime");
const Status = require("../helpers/Status");
const db = require("../db");
const { Op } = require("sequelize");
const { STATUS_ACTIVE } = require("../helpers/User");
const PreferredLocationService = require("./services/PreferredLocationService");
const { getSettingListByName, getSettingValue } = require("./SettingService");
const { getMediaURL } = require("./MediaService");
const Number = require("../lib/Number");
const utils = require("../lib/utils");
const md5 = require("md5");
const { USER_DEFAULT_TIME_ZONE } = require("../helpers/Setting");
const { companyService } = require("./CompanyService");
const Permission = require("../helpers/Permission");
const Response = require("../helpers/Response");
const ArrayList = require("../lib/ArrayList");
const user = require("../helpers/User");
const { isKeyAvailable } = require("../lib/validator");

module.exports = {
  /**
   * Get Manager Details By User Id
   *
   * @param {*} user_id
   * @param {*} callBack
   */
  getManagerDetailsById: (user_id, callBack) => {
		if (!user_id) {
			return callBack();
		}

		User
			.findOne({
				attributes: ["id", "slack_id"],
				where: { id: user_id }
			})
			.then((userDetails) => callBack(null, userDetails ? userDetails.get() : "")).catch((err)=>{
				console.log(err);
			})
	},


  /**
   * Get User Details By User Id
   *
   * @param {*} user_id
   * @param {*} callBack
   */
  getUserDetailsById: (user_id, callBack) => {
		if (!user_id) {
			return callBack();
		}

		User
			.findOne({
				attributes: ["id"],
				where: { id: user_id}
			})
			.then((userDetails) => callBack(null, userDetails ? userDetails.get() : "")).catch((err)=>{
				console.log(err);
			})
	},

  async getUserDetailById(id,company_id) {
		try {
			const userDetails = await User.findOne({
				where: { id: id ,company_id:company_id },
			});
			if (!userDetails) {
				return null;
			}

			return userDetails;
		} catch (err) {
			console.log(err);
		}
	},

  async createUser(data) {
    try {
      const userDetails = await User.create(data);
      return userDetails;
    } catch (err) {
      console.log(err);
    }


  },
  async update(updateData, query) {
    try {
      const userDetails = await userService.update(updateData, query);
      return userDetails;
    } catch (err) {
      console.log(err);
    }
  },
 async get(owner_id, companyId) {
		try{
		let ownerDetails = await userService.findOne({
			where: { id: owner_id, company_id: companyId },
		});
		return ownerDetails;
	} catch(err){
		console.log(err);
	}
	},

  async getSlack(objectId , companyId){
		
		let slackDetail = await Slack.findOne({
			where : { company_id: companyId , object_id: objectId}
		})

		return slackDetail;
	},

  async getUsersBySetting(name, companyId) {
    try {
      let settingData = await getSettingListByName(name, companyId);
      let allowedRoleIds = [];

      if (settingData && settingData.length > 0) {
        for (let i = 0; i < settingData.length; i++) {
          if (settingData[i].value == "true") {
            allowedRoleIds.push(settingData[i]?.object_id);
          }
        }
      }

      let allowedUserIds = [];
      if (allowedRoleIds && allowedRoleIds.length > 0) {
        let userData = await User.findAll({
          where: {
            role: { [Op.in]: allowedRoleIds },
            company_id: companyId,
            status: STATUS_ACTIVE,
          },
        });
        if (userData && userData.length > 0) {
          for (let i = 0; i < userData.length; i++) {
            allowedUserIds.push(userData[i]?.id);
          }
        }
      }
      return allowedUserIds;
    } catch (err) {
      console.log(err);
    }
  },

  async bulkUpdate(req, res) {
    try {
      // Validate user
      const data = req.body;

      const companyId = Request.GetCompanyId(req);

      const { status, userIds, forceLogout, force_sync, reset_mobile_data, profile_picture_update,force_logout_soft, designation, salary, allow_leave } =
        data;

      if (userIds && userIds.length == 0) {
        return res.json(400, { message: "User is Required" });
      }

      for (let i = 0; i < userIds.length; i++) {
        let updateData = new Object();

		if (Number.isNotNull(status)) {
			updateData.status = status;
		  }

        if (forceLogout) {
          updateData.session_id = null;
        }

        if (force_sync) {
          updateData.force_sync = force_sync;
        }

        if (reset_mobile_data == true) {
          updateData.reset_mobile_data = 1;
        }

        if (reset_mobile_data == false) {
          updateData.reset_mobile_data = 0;
        }

		if (force_logout_soft == true) {
			updateData.force_logout = user.FORCE_LOGOUT_ENABLE;
		}

		if (designation) {
			updateData.designation = designation;
		  }
	
		if (salary) {
			updateData.salary = salary;
		}

			updateData.allow_leave = allow_leave;
	
		if (Object.keys(updateData).length > 0) {
			await UserEmploymentService.update(
			  updateData,
			  { where: { user_id: userIds[i] } }
			);
		}

        if (profile_picture_update == true) {
          let attendanceDetails = await AttendanceModal.findOne({
            where: { company_id: companyId, user_id: userIds[i], login: { [Op.ne]: null } },
            order: [["date", "DESC"]],
          });

          if (attendanceDetails) {
            const { check_in_media_id } = attendanceDetails;
            const mediaUrl = await getMediaURL(check_in_media_id, companyId);
            this.UserProfilePictureAddFromAttendance(mediaUrl, userIds[i], companyId);
          }
        }

        await userService.update(updateData, { where: { id: userIds[i] } });

        await this.reindex(userIds[i], companyId);
      }

      // API response
      res.json(UPDATE_SUCCESS, { message: "User Updated" });
    } catch (err) {
      console.log(err);
      res.json(BAD_REQUEST, { message: err.message });
    }
  },

  async addMonthlyLeaveBalance (companyId){


    let userList = await userService.find({
      where: { status: Status.ACTIVE, company_id: companyId },
    });

    if(userList && userList.length > 0){
      for (let i = 0; i < userList.length; i++) {
          const { id: user_id } = userList[i];


          let userEmploymentDetail = await UserEmploymentService.findOne({where:{
              user_id: user_id,
              company_id: companyId
          }});

          if(userEmploymentDetail){
              if(userEmploymentDetail?.leave_balance_updated_at){
                  if(!DateTime.isYearsAndMonthsEqual(userEmploymentDetail?.leave_balance_updated_at)){
                  userEmploymentDetail.update({
                      leave_balance: userEmploymentDetail?.leave_balance + 1,
                      leave_balance_updated_at: new Date()
                  })
              }
              }else{
                  userEmploymentDetail.update({
                      leave_balance: userEmploymentDetail?.leave_balance + 1,
                      leave_balance_updated_at: new Date()
                  })
              }
          }
      }
    }
  },

  async listByRolePermission (role_permission, companyId) {
    try {

      let userRoleDetail = await UserRolePermission.findAll({
        where: { company_id: companyId, role_permission: role_permission },
      });
      let allowedRoleIds = userRoleDetail && userRoleDetail.length > 0 ? userRoleDetail.map((value) => value.role_id) : [];

          let allowedUserIds = [];
          let userData = await User.findAll({ where: { role: { [Op.in]: allowedRoleIds }, company_id: companyId } });
    
      if (userData && userData.length > 0) {
        for (let i = 0; i < userData.length; i++) {
          allowedUserIds.push(userData[i].id);
        }
      }

      return {
        allowedRoleIds,
        allowedUserIds
      };
    } catch (err) {
      console.log(err);
    }
  },


  async list (companyId,whereParams={}){
		let userList = await userService.find({
			where: { company_id: companyId, status: STATUS_ACTIVE,...whereParams },
		});
         return userList;
	  },

async  AddStartdateAndEnddateFromAttendance(
		startDate,
		endDate,
		userId,
		companyId
	  ) {
		try {
		  const userEmploymentDetail = await UserEmploymentService.findOne({
			where: { user_id: userId, company_id: companyId },
		  });
	  
		  if (startDate && endDate == null) {
			const userDetail = await userService.findOne({
			  where: { id: userId, company_id: companyId },
			});
	  
			if (Number.isNull(userDetail.date_of_joining)) {
			  await userService.update(
				{ date_of_joining: startDate },
				{ where: { id: userId, company_id: companyId } }
			  );
			}
		  }
	  
		  if (userEmploymentDetail) {
			const { start_date, end_date } = userEmploymentDetail;
	  
			const updateData = {};
			if (Number.isNull(start_date)) {
			  updateData.start_date = startDate || null;
			}
			if (Number.isNull(end_date)) {
			  updateData.end_date = endDate || null;
			}
	  
			if (Object.keys(updateData).length > 0) {
			  await UserEmploymentService.update(updateData, {
				where: { user_id: userId, company_id: companyId },
			  });
			}
		  } else {
			await UserEmploymentService.create({
			  user_id: userId,
			  company_id: companyId,
			  start_date: startDate || null,
			  end_date: endDate || null,
			});
		  }
		} catch (error) {
		  console.error(error);
		}
	  },
	  
  
  async UserProfilePictureAddFromAttendance(mediaUrl, userId, companyId) {
    try {
      const url = new URL(mediaUrl);
      const key = url.pathname.substring(1);

      // Extract the desired key format
      const parts = key.split("-");
      const desiredKey = `attendance-${parts[2]}-${parts[3]}`;

      // Get the image from S3 using s3Utils
      const imageData = await s3Utils.getObjectFromS3(key);
      const base64Data = imageData.toString('base64');

      const imageDetails = {
        name: key,
        file_name: key,
        company_id: companyId,
        object_id: userId,
        object_name: ObjectName.USER,
        visibility: Media.VISIBILITY_PUBLIC,
      };

      // Create a new Media entry
      let mediaDetail = await MediaModal.create(imageDetails);
      let mediaId = mediaDetail?.id;

      // Define the parameters for the upload
      const uploadKey = `${mediaId}-${desiredKey}`;
      const uploadResult = await s3Utils.uploadFileToS3(uploadKey, Buffer.from(base64Data, "base64"), { ACL: "public-read" });

      // Update the user table with media_url and media_id
      await userService.update(
        { media_url: uploadResult.Location, media_id: mediaId },
        { where: { id: userId } }
      );

      await this.reindex(userId, companyId);
    } catch (error) {
      console.error(error);
    }
  },

  async reindex(user_id,companyId){
		try{

		if (!user_id) {
			History.create("User Reindex : User Id Required");
			return null;
		  }
		  if (!companyId) {
			History.create("User Reindex : company Id Required");
			return null;
		  }

		  let isUserExist = await UserIndex.findOne({ where: { user_id: user_id, company_id: companyId } });

		  if (isUserExist) {
			// Delete All Privious Records
			await UserIndex.destroy({
			  where: { company_id: companyId, user_id: user_id },
			  force: true,
			});
		  }
		
		  History.create("User Reindex : User index Table Destroyed");

		  let preferredLocation = await PreferredLocationService.getFirstRecord(companyId,user_id)

		  let where ={}

		  where.company_id = companyId;
		  if(user_id){
			where.id = user_id
		  }

		  const query = {
			order: [["created_at","DESC"]],
			where,
			include: [
			  {
				required: false,
				model: UserRole,
				attributes: ['role_name', 'id'],
				as: 'roleData',
			  },
			],
		  };


		  let userDetail = await userService.findOne(query);
		  let userRoleDetail = await UserRolePermission.findAll({
			where: { company_id: companyId, role_id: userDetail?.role },
		  });

		  let userRolePermissionList = userRoleDetail && userRoleDetail.length > 0 ? userRoleDetail.map((value) => value.role_permission) : null;


		  let reIndexData={}

		  if(user_id){
			reIndexData.user_id = user_id
		  }
		  reIndexData.force_logout = userDetail.force_logout

		  if(userDetail.name){
			reIndexData.first_name = userDetail.name
		  }

		  if(userDetail.last_name){
			reIndexData.last_name = userDetail.last_name
		  }
		 reIndexData.reset_mobile_data = userDetail.reset_mobile_data

		 if(userDetail.rating){
			reIndexData.rating = userDetail.rating
		 }
 
		  if(userDetail.email){
			reIndexData.email = userDetail.email
		  }

		  if(userDetail.role){
			reIndexData.role_id = userDetail.role
		  }

		  if(userDetail.profile_photo){
			reIndexData.profile_photo = userDetail.profile_photo
		  }

		  if(userDetail.mobile){
			reIndexData.mobile = userDetail.mobile
		  }

		 

		  
		  if(userDetail.account_id){
			reIndexData.account_id = userDetail.account_id
		  }

		  

		  

		

		  

		
		  if(userDetail.token){
			reIndexData.token = userDetail.token
		  }
		  if(userDetail.active){
			reIndexData.active = userDetail.active
		  }
		  if(userDetail.available_leave_balance){
			reIndexData.available_leave_balance = userDetail.available_leave_balance
		  }
		  if(userDetail.login_time){
			reIndexData.login_time = userDetail.login_time
		  }

		  

		  if(userDetail.session_id){
			reIndexData.session_id = userDetail.session_id
		  }

		  if(userDetail.last_loggedin_at){
			reIndexData.last_loggedin_at = userDetail.last_loggedin_at
		  }
		  if(userDetail.updated_by){
			reIndexData.updated_by = userDetail.updated_by
		  }
		 
		  if(userDetail.date_of_joining){
			reIndexData.date_of_joining = userDetail.date_of_joining
		  }
		 
		  
		  if(userDetail.status){
			reIndexData.status = userDetail.status
		  }
		  if(userDetail.force_daily_update){
			reIndexData.force_daily_update = userDetail.force_daily_update
		  }

		 
		  if(userDetail.allow_manual_login){
			reIndexData.allow_manual_login = userDetail.allow_manual_login
		  }
		 

		  
		  if(userDetail.slack_id){
			reIndexData.slack_id = userDetail.slack_id
		  }
		
			reIndexData.company_id = companyId

		  if(userDetail.mobile_number1){
			reIndexData.mobile_number1 = userDetail.mobile_number1
		  }
		  if(userDetail.mobile_number2){
			reIndexData.mobile_number2 = userDetail.mobile_number2
		  }
		  if(userDetail.address1){
			reIndexData.address1 = userDetail.address1
		  }
		  if(userDetail.address2){
			reIndexData.address2 = userDetail.address2
		  }
		  if(userDetail.city){
			reIndexData.city = userDetail.city
		  }
		  if(userDetail.state){
			reIndexData.state = userDetail.state
		  }
		  if(userDetail.country){
			reIndexData.country = userDetail.country
		  }

		  if(userDetail.pin_code){
			reIndexData.pin_code = userDetail.pin_code
		  }
		  if(userDetail.media_url){
			reIndexData.media_url = userDetail.media_url
		  }
		  if(userDetail.media_id){
			reIndexData.media_id = userDetail.media_id
		  }
		 
		  if(userDetail.ip_address){
			reIndexData.ip_address = userDetail.ip_address
		  }
		  if(userDetail.time_zone){
			reIndexData.time_zone = userDetail.time_zone
		  }

		  if(userDetail.force_sync){
			reIndexData.force_sync = userDetail.force_sync
		  }
		  if(userDetail?.roleData){
			reIndexData.role_name = userDetail?.roleData?.role_name
		  }

		  if(userDetail.password){
			reIndexData.password = userDetail.password
		  }

		  if(userDetail.current_location_id != undefined){
			reIndexData.current_location_id = userDetail.current_location_id
		  }

		  if(userDetail.current_shift_id != undefined){
			reIndexData.current_shift_id = userDetail.current_shift_id
		  }

		  if(preferredLocation?.location_id && preferredLocation?.location_id){
			reIndexData.primary_location_id = preferredLocation.location_id
		  }

		  if(preferredLocation?.shift_id && preferredLocation?.shift_id){
			reIndexData.primary_shift_id = preferredLocation.shift_id
		  }

		  if(userRolePermissionList && userRolePermissionList.length > 0){
			reIndexData.role_permission = userRolePermissionList.join(",")
		  }
		  
		  if(userDetail && userDetail?.last_checkin_at){
			reIndexData.last_checkin_at = userDetail.last_checkin_at
		  }

			reIndexData.allow_leave = userDetail.allow_leave

		  await UserIndex.create(reIndexData);

		}catch(err){
			console.log(err);
		}
	  },

	  userService,
	async logIn(companyId, body, IpAddress) {
		try {
	  
		  let whereObj = { status: userProfileStatus.ACTIVE };
	  
		  if (body && !body.email) {
			throw { message: "Email is required" };
		  }
	  
		  if (body && !body.password) {
			throw { message: "Password is required" };
		  }
	  
		  if (companyId) {
			whereObj.company_id = companyId;
		  }
	  
		  if (parseInt(body.email)) {
			whereObj.mobile_number1 = body.email;
		  } else {
			whereObj.email = body.email;
		  }
	  
		  let user = await User.findOne({
			attributes: [
			  "id",
			  "name",
			  "password",
			  "mobile",
			  "mobile_number1",
			  "session_id",
			  "role",
			  "last_name",
			  "company_id",
			  "ip_address",
			  "email",
			  "company_id",
			  "time_zone",
			  "otp_createdAt",
			  "otp",
			  "reset_mobile_data",
			  "rating"
			],
			where: whereObj,
		  });
	  
		  if (!user) {
			throw { message: "Invalid Username or Password" };
		  }
	  
		  if (user.password !== md5(body.password)) {
			throw { message: "Invalid credentials" };
		  }

		  let sessionId = user.session_id || Math.floor(Date.now())
	
		  await user.update({
			last_loggedin_at: utils.getSQlCurrentDateTime(),
			session_id: sessionId,
			ip_address: IpAddress,
		  });
	  
		  return {
			token: sessionId,
			id: user.id,
			role: user.role,
			firstName: user.name,
			lastName: user.last_name,
			reset_mobile_data: user.reset_mobile_data,
			force_logout : user.force_logout,
			rating : user.rating,
			companyId: user.company_id,
			time_zone: user.time_zone,
			company_id: user.company_id
		  };
		} catch (err) {
		  console.log(err);
		  throw { message: err.message };
		}
	  },

	async getTimeZone(companyId) {
		try{
		const companyDetails =  await companyService.findOne({
			where: {id: companyId },
			attributes: ["id","time_zone"],
		  });    
		  if (companyDetails && companyDetails.time_zone) {
			return companyDetails?.time_zone;
		  } else {
			const defaultTimeZone = await getSettingValue(USER_DEFAULT_TIME_ZONE, companyId);
			return  defaultTimeZone;
		  }
		}catch(err){
			console.log(err);
			throw { message: err.message };
		}
	},

	async validatePermissions(req, res, individualPermision, manageOther) {
      try{
		let data ={}

		const companyId = Request.GetCompanyId(req);
		if (!companyId) {
		  res.json(Response.BAD_REQUEST, {
			message: "Company Not Found",
		  });
		  return false;
		}
		let rolePermission = Request.getRolePermission(req);

		data.companyId = companyId
		
		const manageOthers = await Permission.GetValueByName(
			manageOther,
			rolePermission
		  )
		  data.manageOthers=manageOthers

		return data;
	}catch(err){
		console.log(err);
	}
	},

	async updatePushNotificationToken(accountId,companyId,token) {

		let userDetail = await User.findOne({where:{id: accountId, company_id: companyId}});

		if(userDetail){
			let splitToken = userDetail && userDetail?.push_token && userDetail?.push_token?.split(",") || false;
			if(splitToken && ArrayList.isArray(splitToken)){
				if(!splitToken.includes(token)){
					let joinedData = [...splitToken,token]?.join(",");
					userDetail.update({push_token: joinedData})
				}
			}else{
				userDetail.update({push_token: token})
			}
		}

	},
	async getList(params) {
		try {
			const where = {};

			where.company_id = params?.companyId;

			if (ArrayList.isArray(params.excludeIds)) {
				where.id = {
					[Op.notIn]: params?.excludeIds
				}
			}

			let statusValue = !isKeyAvailable(params, "status") ? STATUS_ACTIVE : isKeyAvailable(params, "status") && Number.isNotNull(params?.status) ? params?.status : null;
			let defaultValue = isKeyAvailable(params, "defaultValue") && Number.isNotNull(params?.defaultValue) ? params?.defaultValue : null
			where[Op.or] = [
				{ status: { [Op.or]: [statusValue, null] } },
				{ id: { [Op.or]: [defaultValue, null] } }
			]

			const searchTerm = params?.search ? params?.search.trim() : null;
			if (searchTerm) {
				where[Op.or] = [
					{
						name: {
							[Op.iLike]: `%${searchTerm}%`,
						},
					},
				];
			}


			const query = {
				order: [['name', 'ASC']],
				where,
			};

			const userDetails = await userService.findAndCount(query);
			let list = [];
			for (let i in userDetails.rows) {
				let { id, name, last_name, media_url } = userDetails.rows[i];
				let logedInUserData = {};
				if (params?.userId == id) {
					(logedInUserData.id = id),
						(logedInUserData.first_name = name),
						(logedInUserData.last_name = last_name),
						(logedInUserData.media_url = media_url),
						(logedInUserData.isLogedInUser = true);
				}

				let data = {
					id: id,
					first_name: name,
					last_name: last_name,
					media_url: media_url,
					...logedInUserData,
				};

				list.push(data);
			}

			return {
				data: list,
				loggedInUserId: params?.userId,
			}
		} catch (err) {
			console.log(err);
		}
	}
	};