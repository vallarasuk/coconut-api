// import service
const { Op } = require("sequelize");
// S3
const { uploadBase64File } = require("../../lib/s3");
// Constant
const { MEDIA_PATH_USER_AVATAR } = require("../../lib/s3FilePath");
//Utills
const {
  getHashPassword,
  hasher,
  removeUndefinedKeys,
  md5Password,
} = require("../../lib/utils");
const { isEmail, isNotEmpty } = require("../../lib/validator");
const Permission = require("../../helpers/Permission");
const { userService } = require("../../services/UserService");
const { hasPermission } = require("../../services/UserRolePermissionService");

//systemLog
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const PhoneNumber = require("../../lib/PhoneNumber");
const UserService = require("../../services/UserService");
const User = require("../../helpers/User");
const { Slack, Shift, UserRole, Location} = require("../../db").models;


/**
 *  Update User Avatar
 *
 * @param id
 * @param role_id
 * @param fileName
 * @param file
 * @param callback
 * @returns {*}
 */
function updateUserAvatar(id, fileName, callback) {
  try {
    if (!id) {
      return callback();
    }

    userService
      .findOne({
        attributes: ["id", "role_id"],
        where: { id },
      })
      .then((userDetails) => {
        if (!userDetails) {
          return callback();
        }

        userService
          .update({ avatar: fileName }, { where: { id } })
          .then(() => callback());
      });
  } catch (err) {
    console.log(error);
  }
}


const createAuditLog = async (oldData, updatedData, req, id) => {
  try {

    let auditLogMessage = [];

    if (updatedData?.name && updatedData?.name !== oldData.name) {
        if (oldData?.name !== updatedData?.name) {
          auditLogMessage.push(`First Name Updated To ${updatedData?.name}\n`);
        }
      }

    if (updatedData?.last_name && updatedData?.last_name !== oldData.last_name) {
      if (oldData?.last_name !== updatedData?.last_name) {
        auditLogMessage.push(`Last Name Updated To ${updatedData?.last_name}\n`);
      }
    }

    if (updatedData?.email && updatedData?.email !== oldData.email) {
      if (oldData?.email !== updatedData?.email) {
        auditLogMessage.push(`Email Address Updated To ${updatedData?.email}\n`);
      }
    }

    if (updatedData?.mobile_number1 && updatedData?.mobile_number1 !== oldData.mobile_number1) {
      if (oldData?.mobile_number1 !== updatedData?.mobile_number1) {
        auditLogMessage.push(`Mobile Number1 Updated To ${updatedData?.mobile_number1}\n`);
      }
    }

    if (updatedData?.mobile_number2 && updatedData?.mobile_number2 !== oldData.mobile_number2) {
      if (oldData?.mobile_number2 !== updatedData?.mobile_number2) {
        auditLogMessage.push(`Mobile Number2 Updated To ${updatedData?.mobile_number2}\n`);
      }
    }

    if (updatedData?.role && updatedData?.role !== oldData?.role) {
      let roleDetail = await UserRole.findOne({
        where: { id: updatedData?.role },
      });
      auditLogMessage.push(`Role Updated to ${roleDetail.role_name}\n`);
    }

    if (updatedData?.time_zone && updatedData?.time_zone !== oldData.time_zone) {
      if (oldData?.time_zone !== updatedData?.time_zone) {
        auditLogMessage.push(`Time Zone Updated To ${updatedData?.time_zone}\n`);
      }
    }

    if (updatedData?.current_location_id && updatedData?.current_location_id !== oldData?.current_location_id) {
      let locationName = await Location.findOne({
        where: { id: updatedData.current_location_id },
      });
      auditLogMessage.push(`Location Updated to ${locationName.name}\n`);
    }

    if (updatedData?.current_shift_id && updatedData?.current_shift_id !== oldData?.current_shift_id) {
      let shiftDetail = await Shift.findOne({
        where: { id: updatedData?.current_shift_id },
      });
      auditLogMessage.push(`Shift Updated to ${shiftDetail.name}\n`);
    }

    if (auditLogMessage.length > 0) {
        let message = auditLogMessage.join('');
        History.create(message, req, ObjectName.USER, id);
    } else {
        History.create("User Updated", req, ObjectName.USER, id);
    }
  } catch (error) {
    console.log(error);
  }
};

async function updateUser(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await Permission.Has(Permission.USER_EDIT, req);
  

    const data = req.body;
    const { id } = req.params;
    const imageFile = data.userImage;
    let companyId = Request.GetCompanyId(req);
    
    // Validate id
    if (!id) {
      return res.json(400, { message: "User id is required" });
    }

    const email = data?.email && data?.email.toLowerCase().trim();


    if (data && data?.slack_id) {
      let slackDetail = await Slack.findOne({
        where: {
          object_id: id,
          company_id: companyId
        }
      })

      let createData = {
        object_id: id,
        object_name: data?.first_name ? data?.first_name : "" + "" + data?.last_name ? data?.last_name : "",
        slack_id: data?.slack_id,
        slack_name: data?.slack_name,
        company_id: companyId
      }

      if (slackDetail) {
        await Slack.update(createData, {
          where: {
            id: slackDetail && slackDetail?.id,
            object_id: id,
            company_id: companyId
          }
        })
      } else {
        await Slack.create(createData)
      }

    }

    userService
      .findOne({
        where: { id: id },
      })
      .then((userDetails) => {
        if (!userDetails) {
          return res.json(400, { message: "User not found" });
        }

        const { password } = userDetails.get();
        const currentPassword = data.currentPassword;
        let newPassword = data.newPassword;
        // If current password does not match with current password
        if (currentPassword && !hasher(currentPassword, password)) {
          return res.json(400, { message: "Password not matched" });
        }




          const updateData = {}

          if (data.first_name) { updateData.name = data.first_name };

          if(data && data?.last_name != undefined){
             updateData.last_name = data && data?.last_name;
          } 

          if(data && data?.forceSync == "false"){
            updateData.force_sync = false;
         } 
          if(data && data?.email!= undefined){
            updateData.email = data?.email && email 
          } 

          if (data.roleId) { updateData.role = parseInt(data.roleId, 10) };

          if(data?.mobileNumber1 != undefined){
             updateData.mobile_number1 = data?.mobileNumber1 && PhoneNumber.Get(data.mobileNumber1);
          }

          if(data?.address1 != undefined){
            updateData.address1 = data?.address1 ? data?.address1:"" 
          }

          if(data?.address2 != undefined){
           updateData.address2 = data?.address2 ? data?.address2: ""
          }

          if(data?.city != undefined){
           updateData.city = data?.city  ? data?.city :""
          }

          if(data?.state != undefined){
           updateData.state = data?.state ? data?.state  :""
          }

          if(data?.country != undefined){
           updateData.country = data?.country ? data?.country :"" 
          } 

          if(data?.pin_code != undefined){
          updateData.pin_code = data?.pin_code ? data?.pin_code:"" 
          }

          if(data?.reset_mobile_data != undefined){
          updateData.reset_mobile_data = data?.reset_mobile_data
          }
         if(data?.rating){
           updateData.rating = data?.rating
         }
         if(data && data?.force_logout_soft == false){          
          updateData.force_logout = User.FORCE_LOGOUT_DISABLED;
       } 
          if(data.status){
            updateData.status = data.status
          };
          if(data.force_logout_soft){
            updateData.force_logout = data.force_logout
          };

          if(isNotEmpty(data.timeZone) ){
            updateData.time_zone = data.timeZone
          }

          if(isNotEmpty(data.forceSync) ){
            updateData.force_sync = data.forceSync
          }
          if (data.partnerUserId && data.password) {
            newPassword = data.password;
            updateData["token"] = Math.floor(Date.now());
          }

          if(newPassword != undefined){
           // Generate Hash Password
           updateData["password"] = md5Password(newPassword);
          }

          if(data.currentLocationId !== undefined){
            updateData.current_location_id = data.currentLocationId
          }

          if(data.currentShiftId !== undefined){
            updateData.current_shift_id = data.currentShiftId
          }

            updateData.allow_leave = data?.allow_leave 


          userService
            .update(removeUndefinedKeys(updateData), {
              where: { id: id },
              returning: true,
              plain: true,
            })
            .then(async (userData) => {

              //create log for error
              await createAuditLog (userDetails, updateData, req, id);

              res.send(200, {
                token: userData[1]?.token,
                role: userData[1]?.role_id,
                userId: userData[1]?.id,
                message: "User Updated",
              });
              await UserService.reindex(id,companyId)

                        // user image upadte
          res.on("finish", () => {
            if (imageFile) {
              if (imageFile) {
                const fileName = `${id}-${Date.now()}.png`;
                uploadBase64File(
                  imageFile,
                  `${MEDIA_PATH_USER_AVATAR}/${fileName}`,
                  (err) => {
                    updateUserAvatar(id, fileName, () => {
                      userService.update(
                        { avatar: fileName },
                        { where: { id } }
                      );
                    });
                  }
                );
              }
            }
          });
            });
      })
      .catch((err) => {
        res.json(400, { message: err.message });
      });
  } catch (err) {
    console.log(err);
  }
}

module.exports = updateUser;
