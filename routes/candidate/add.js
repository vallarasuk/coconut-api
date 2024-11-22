const utils = require("../../lib/utils");
const Request = require("../../lib/request");
const Permission = require("../../helpers/Permission");
const MediaServices = require("../../services/media");
const { Candidate,Media: MediaModal} = require("../../db").models;
const { Media } = require("../../helpers/Media");
const ObjectName = require("../../helpers/ObjectName");
const statusService = require("../../services/StatusService");
const History = require("../../services/HistoryService");
const Number = require("../../lib/Number");



async function add(req, res, next) {
  const hasPermission = await Permission.Has(Permission.CANDIDATE_ADD, req);

  
  const data = req.body;
  let fileDetail = req && req?.files && req?.files?.media_file;

  if (!data.firstName) {
    return res.json(400, { message: "First Name is required" });
  }

  if (!data.lastName) {
    return res.json(400, { message: "Last Name is required" });
  }


  const companyId = Request.GetCompanyId(req);
  const userId = Request.getUserId(req);
  
  try {
    const token = utils.md5Password(utils.getTimeStamp());

    const candidate = await Candidate.create({
      first_name: data?.firstName,
      last_name: data?.lastName,
      phone: data?.phone,
      gender: data?.gender,
      marital_status: data?.maritalStatus,
      email: data?.email,
      position: data?.position,
      position_type: data?.positionType,
      status: await statusService.getFirstStatus(ObjectName.CANDIDATE, companyId),
      owner_id: userId,
      company_id: companyId,
      age: Number.Get(data?.age),
      qualification: data?.qualification,
      current_city: data?.currentCity,
      current_state: data?.currentState,
      permanent_city: data?.permanentCity,
      permanent_state: data?.permanentState,
      department: data?.department,
      year_of_passing: data?.yearOfPassing,
      expected_salary: data?.expected_salary,
      message: data?.message,
      staying_with: data?.stayingWith
    });

    if (fileDetail) {
      let imageData = {
        file_name: fileDetail?.name.trim(),
        name: fileDetail?.name.trim(),
        company_id: companyId,
        object_id: candidate?.id,
        object_name: ObjectName.CANDIDATE,
        visibility: Media.VISIBILITY_PUBLIC,
      };
      let mediaDetails = await MediaModal.create(imageData);

      if (mediaDetails) {
        await MediaServices.uploadMedia(
          fileDetail?.path,
          mediaDetails?.id,
          fileDetail.name,
          mediaDetails.visibility == Media.VISIBILITY_PUBLIC ? true : false,
          true,
        );
      }
      await Candidate.update(
        { media_id: mediaDetails?.id },
        { where: { id: candidate?.id, company_id: companyId } }
      );
    }


    res.json(201, {
      message: " Candidate Added",
      candidateId: candidate.id,
    });

    res.on("finish", async () => {
      History.create("Candidate Added", req, ObjectName.CANDIDATE, candidate?.id);
    });
  } catch (err) {
    req.log.error(err);
    next(err);
  }
}

module.exports = add;
