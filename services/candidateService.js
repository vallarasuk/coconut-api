const ObjectName = require("../helpers/ObjectName");
const { OK, BAD_REQUEST, UPDATE_SUCCESS } = require("../helpers/Response");
const Currency = require("../lib/currency");
const DateTime = require("../lib/dateTime");
const Request = require("../lib/request");
const History = require("./HistoryService");
const { Candidate, status, Media: MediaModal } = require("../db").models;
const statusService = require("./StatusService");
const Response = require("../helpers/Response");
const Numbers = require("../lib/Number");
const String = require("../lib/string");
const Boolean = require("../lib/Boolean");
const validator = require("../lib/validator");
const Permission = require("../helpers/Permission");
const { Op, Sequelize } = require("sequelize");
const mediaService = require("./MediaService");
const { getMediaUrl } = require("../lib/utils");
const mailService = require("./MailService");


class CandidateService {
  // delete

  static async del(req, res) {
    try {
      const id = req.params.id;
      const company_id = Request.GetCompanyId(req);

      await Candidate.destroy({ where: { id: id, company_id: company_id } });

      res.json(200, { message: "Candidate Deleted" });

      res.on("finish", async () => {
        History.create("Candidate Deleted", req, ObjectName.CANDIDATE, id);
      });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  }

  //get

  static async get(params) {
    let { id, companyId } = params;
    try {
    

      const candidateDetail = await Candidate.findOne({
        where: { id: id, company_id: companyId },
        include: [
          {
            required: false,
            model: MediaModal,
            as: "media",
          },

        ]
      });

      let imageUrl;
      let fileUrl;
      let mediaData = await MediaModal.findAll({
        where: { company_id: companyId, object_name: ObjectName.CANDIDATE, object_id: id },
        order: [["createdAt", "ASC"]],
      });
      for (let i = 0; i < mediaData.length; i++) {
        const { id } = mediaData[i];
        let mediaUrl = await mediaService.getMediaURL(id, companyId);

        if (validator.isImageFormat(mediaUrl)) {
          imageUrl = mediaUrl;
        }

        if (validator.isPdfFormat(mediaUrl)) {
          fileUrl = mediaUrl;
        }
      }
      const statusDetail = await status.findOne({
        where: { id: candidateDetail.status, company_id: companyId },
      });

      if (!candidateDetail) {
         throw { message: "Candidate Not found" }
      }

      candidateDetail.status = statusDetail?.id;
      candidateDetail.statusName = statusDetail?.name;

      const data = {
        ...candidateDetail.get(),
        image_url: imageUrl,
        file_url: fileUrl,
        status: statusDetail,
        candidate_url: candidateDetail && candidateDetail.media?.file_name && getMediaUrl(candidateDetail.media?.file_name, candidateDetail.media?.id),

      };
      
      return data;
     
    } catch (err) {
      console.log(err);
    }
  }

  static updateStatus = async (req, res, next) => {
    const data = req.body;
    const { id } = req.params;

    // Validate Vendor id
    if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "Candidate id is required" });
    }

    // Update Vendor status
    const updateCandidate = {
      status: data.status,
    };

    try {
      const save = await Candidate.update(updateCandidate, { where: { id: id } });

      res.json(Response.UPDATE_SUCCESS, {
        message: "Candidate updated",
      });

      res.on("finish", async () => {
        History.create("Candidate updated", req, ObjectName.CANDIDATE, save.id);
      });

      // API response
    } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, {
        message: err.message,
      });
    }
  };

  static sendPostResumeMail(params, data, callback){
    const { fromMail, toMail } = params;
    
    try {
     
      const emailSubstitutions = {
        ...data,
      };

      // Email Data
      const emailData = {
        fromEmail: fromMail,
        toEmail: toMail,
        template: 'candiateProfileSubmitEmail',
        subject: `Job Application: - ${data?.position}`,
        substitutions: emailSubstitutions,
      };

      mailService.sendMail(params, emailData, async (err) => {
        if (err) {
          History.create(StoreProduct.EMAIL_SENT_FAILED);
          console.log(err);
        }

        return callback();
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

module.exports = {
  CandidateService,
};
