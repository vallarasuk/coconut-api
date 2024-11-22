// import service
const { hasPermission } = require("../../services/UserRolePermissionService");
const { companyService } = require("../../services/CompanyService");
const { Op } = require("sequelize");
const Permission = require("../../helpers/Permission");
const { Media: MediaModel } = require("../../db").models;
const History = require("../../services/HistoryService");
const { Media } = require("../../helpers/Media");
const MediaService = require("../../services/media");
const ObjectName = require("../../helpers/ObjectName");

//systemLog

/**
 *  Update company logo
 * @param id
 * @param fileName
 * @param callback
 * @returns {*}
 */


async function updateCompanyDetails(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await Permission.Has(Permission.COMPANY_EDIT, req);
   

    const data = req.body;
    const { id } = req.params;
    const object_name = data.object_name
    const logoFile = req && req.files && req.files.files||"";
    const fileName = data?.fileName

    // Validate id
    if (!id) {
      return res.json(400, { message: "Company id is required" });
    }

    if (!data.company_name) {
      return res.json(400, { message: "Company Name is required" });
    }

    const isExist = await companyService.findOne({
      where: {
        id: { [Op.ne]: id },
        company_name: data.company_name.trim(),
      },
    });

    if (isExist) {
      return res.json(400, { message: "Company Name already exist" });
    }
    const MediaDetail = await MediaModel.findOne({
      where: { object_id: id, object_name: object_name, company_id: id },
    });

    if (MediaDetail) {
      try {

        const updataData = {
          name: fileName,
          file_name: fileName,
          object_id: id,
          object_name: object_name,
        };

        await MediaModel.update(

          updataData,
          {
            where: {
              id: MediaDetail.id,
              company_id: id
            },
          }

        )
      } catch (err) {

      }

      await MediaService.uploadMedia(
        logoFile.path,
        MediaDetail.id,
        fileName,
        true
      );
    }
    else {
      const imageData = {
        name: fileName,
        file_name: fileName,
        company_id: id,
        object_id: id,
        object_name: object_name,
        visibility: Media.VISIBILITY_PUBLIC
      };
    
     let  mediaDetails = await MediaModel.create(imageData)
      if (mediaDetails) {
        // Media Upload In S3
        await MediaService.uploadMedia(
          logoFile.path,
          mediaDetails.id,
          mediaDetails.file_name,
          mediaDetails.visibility == Media.VISIBILITY_PUBLIC ? true : false
        );
      }
    }


    // Update Company Data
    const updateData = {
      company_name: data.company_name,
      status: data.status,
      websiteurl: data?.websiteurl,
      description: data.description,
      email: data.email,
      mobile_number1: data.mobileNumber1,
      mobile_number2: data.mobileNumber2,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      country: data.country,
      pin_code: data.pin_code,
      facebook_url: data.facebook_url,
      instagram_url: data.instagram_url,
      twitter_url: data.twitter_url,
      linkedIn_url: data.linkedIn_url,
      youtube_url: data.youtube_url,
      portal_url: data.portal_url,
      template: data.template,
      portal_api_url : data.portal_api_url,
      time_zone : data.time_zone,
      gst_number : data.gst_number
    };

    try {
      await companyService.update(updateData, {
        where: { id },
      });

      //create a log for erro


      res.json(200, { message: "Company saved" });

      // History
      res.on("finish", async () => {
        History.create("Company Updated", req, ObjectName.COMPANY, id);
      })

    } catch (err) {
      res.json(400, err);
      next(err);
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = updateCompanyDetails;
