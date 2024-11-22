//Service
const { Setting } = require("../db").models;
const DataBaseService = require("../lib/dataBaseService");
const { MEDIA_PATH_SETTING } = require("../lib/s3FilePath");

const slug = require("slug");
const async = require("async");
//Common
const { uploadBase64File } = require("../lib/s3");
const { portalService } = require("./PortalService");
const { companyService } = require("./CompanyService");
const { SETTING } = require("../helpers/Setting");
const ArrayList = require("../lib/ArrayList");
const settingService = new DataBaseService(Setting);
const SettingConstants = require("../helpers/Setting");

//Get Setting Value
const getSettingValue = async (name, id) => {
  try {
    if (!name) {
      return null;
    }
    const settingDetails = await settingService.findOne({
      attributes: ["value"],
      where: { name, company_id: id },
    });
    return settingDetails && settingDetails.value ? settingDetails.value : "";
  } catch (err) {
    console.log(err);
  }
};

//Get Setting Value
const getSettingValueByObject = async (name, companyId, objectId, objectName) => {
  try {
    if (!name) {
      return null;
    }
    const settingDetails = await settingService.findOne({
      attributes: ["value"],
      where: { name, company_id: companyId, object_id: objectId, object_name: objectName },
    });
    return settingDetails && settingDetails.value ? settingDetails.value : "";
  } catch (err) {
    console.log(err);
  }
};

//Get ExtenstionByType
const getMediaExtensionByType = async (fileType) => {
  switch (fileType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    default:
      return "";
  }
};

//Save Common Setting
const saveSetting = async (name, value, commpanyId, objectId, objectName) => {
  try {
    let settingData = {
      name: name,
      value: value,
      company_id: commpanyId,
    };

    let where = {};

    if (objectId) {
      settingData.object_id = objectId;
      where.object_id = objectId;
    }

    if (objectName) {
      settingData.object_name = objectName;
      where.object_name = objectName;
    }

    where.name = name;

    where.company_id = commpanyId;

    const isSettingExist = await settingService.findOne({
      where: where,
    });
    if (isSettingExist) {
      await settingService.update(settingData, {
        where: where,
      });
    } else {
      await settingService.create(settingData);
    }
    return true;
  } catch (err) {
    console.log(err);
  }
};

//Save Image
const saveImage = async (name, image, commpanyId) => {
  try {
    if (!name && !image) {
      return false;
    }

    //Get Extention Type
    const imageType = await getMediaExtensionByType(image && image.type);

    const where = { name, company_id: commpanyId };
    await settingService
      .findOne({
        attributes: ["id"],
        where,
      })
      .then(async (settingDetails) => {
        const timeStamp = Math.floor(Date.now());
        if (settingDetails) {
          const mediaName = `${slug(`${name}-${timeStamp}`, {
            lower: true,
          })}.${imageType}`;

          //Upload Image
          await uploadImage(image, mediaName, settingDetails);
        } else
          return settingService.create({ name, value: "" }).then(async (settingDetails) => {
            const mediaName = `${slug(`${name}-${timeStamp}`, {
              lower: true,
            })}.${imageType}`;
            //Upload Image
            await uploadImage(image, mediaName, settingDetails);
          });
      });
    return true;
  } catch (err) {
    console.log(err);
  }
};

const uploadImage = (image, mediaName, settingDetails) => {
  try {
    if (!image) return callback(null);
    const mediaPath = `${MEDIA_PATH_SETTING}/${mediaName}`;

    uploadBase64File(
      image,
      mediaPath,
      (err) => {
        if (err) {
          throw err;
        }

        return settingService
          .update(
            {
              value: mediaName,
            },
            {
              where: {
                id: settingDetails.id,
              },
            }
          )
          .then((result) => {
            return result;
          })
          .catch((err) => {
            return null;
          });
      },
      { public: true }
    );
  } catch (err) {
    console.log(err);
  }
};

//Get Setting Value
const getThemeSettingByPortalId = async (commpanyId, callBack) => {
  try {
    if (!commpanyId) {
      return callBack("Commpany Id is Empty");
    }
    try {
      const settings = [];
      const companyDetail = await companyService.findOne({
        where: { id: commpanyId },
      });
      if (companyDetail) {
        settings.push(
          {
            name: SETTING.PORTAL_NAME,
            value: companyDetail.company_name,
          },
          {
            name: SETTING.PORTAL_URL,
            value: companyDetail.portal_url,
          }
        );
      }
      const settingDetails = await settingService.find({
        attributes: ["name", "value"],
        where: { company_id: commpanyId },
      });
      // if (!settingDetails) {
      //   return callBack("Setting Not Found");
      // }

      settingDetails.forEach((settingDetail) => {
        settings.push({
          name: settingDetail.name,
          value: settingDetail.value,
        });
      });
      return callBack(null, {
        settings,
      });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  } catch (err) {
    console.log(err);
  }
};

const getSettingList = async (companyId) => {
  try {
    if (!companyId) {
      return null;
    }
    const settingDetails = await settingService.find({
      where: { company_id: companyId },
    });
    return settingDetails;
  } catch (err) {
    console.log(err);
  }
};

const getValueByObject = (name, settingList, objectId, objectName) => {
  for (const setting of settingList) {
    if (setting.object_name === objectName && setting.object_id === objectId && setting.name === name) {
      return setting.value;
    } else if (setting.name === name && !objectId && !objectName) {
      return setting.value;
    }
  }
  return null;
};
const getSettingListByName = async (name, companyId) => {
  try {
    if (!companyId) {
      return null;
    }
    const settingDetails = await settingService.find({
      where: { company_id: companyId, name: name },
    });

    return settingDetails;
  } catch (err) {
    console.log(err);
  }
};
const loadSettingByName = async (name) => {
  try {
    const settingDetails = await settingService.find({
      where: { name: name }, attributes: ["name", "value", "company_id"]
    });
    return settingDetails;

  } catch (err) {
    console.log(err);
  }
}

const getOnlineSaleCompanySetting = async () => {
  try {
    let onlineSaleCompanySettings = await loadSettingByName(SettingConstants.ONLINE_SALE_COMPANY);

    let onlineSaleUserRoleSettings = await loadSettingByName(SettingConstants.ONLINE_SALE_USER_ROLE);

    let companyId;

    let userRole;

    if (ArrayList.isNotEmpty(onlineSaleCompanySettings)) {

      let settindData = onlineSaleCompanySettings.find((data) => data.value);

      companyId = settindData ? settindData.get().company_id : null;

    }

    if (ArrayList.isNotEmpty(onlineSaleUserRoleSettings)) {

      let settindData = onlineSaleUserRoleSettings.find((data) => data.value);

      userRole = settindData ? settindData.get().value : null;

    }

    return { companyId: companyId, userRole: userRole }

  } catch (err) {
    console.log(err);
  }
}

const getSetting = async (where) => {
  try {
    const settingDetails = await settingService.findOne({
      where: where,
    });
    return settingDetails;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  settingService,
  getSettingValue,
  getThemeSettingByPortalId,
  uploadImage,
  saveImage,
  saveSetting,
  getMediaExtensionByType,
  getSettingValueByObject,
  getSettingList,
  getValueByObject,
  getSettingListByName,
  loadSettingByName,
  getOnlineSaleCompanySetting,
  getSetting
};
