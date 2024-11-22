const { Candidate, Media: MediaModal } = require("../../../db").models;
const { Media } = require("../../../helpers/Media");
const ObjectName = require("../../../helpers/ObjectName");
const Request = require("../../../lib/request");
const utils = require("../../../lib/utils");
const mediaService = require("../../../services/media");
const Number = require("../../../lib/Number");
const SettingService = require("../../../services/SettingService");
const Setting = require("../../../helpers/Setting");
const Currency = require("../../../lib/currency");
const StatusService = require("../../../services/StatusService");
const history = require("../../../services/HistoryService");
const { CandidateService } = require("../../../services/candidateService");
const ArrayList = require("../../../lib/ArrayList");

function concatValue(from, to) {
  let detail = null;
  from = from ? Number.Get(from) : null;
  to = to ? Number.Get(to) : null;
  if (from && to) {
    detail = `${from}.${to}`;
  } else if (from) {
    detail = from;
  } else if (to) {
    detail = `0.${to}`;
  }
  return detail;
}

async function add(req, res, next) {
  const data = req.body;
  const file = req && req.files && req.files.file ? req.files.file : "";
  const profileImage = req && req.files && req.files.profileImage ? req.files.profileImage : "";
  if (!data?.firstName) {
    return res.json(400, { message: "First Name is required" });
  }
  if (!data?.lastName) {
    return res.json(400, { message: "Last Name is required" });
  }
  const authorizationToken = req?.header("Authorization")?.split(' ')[1] || req?.header("Authorization");
  if(!authorizationToken){
    return res.json(400, { message: "Authorization Token required" });
  }

  let getSettingData = await SettingService.getSetting({value: authorizationToken, name: Setting.WORDPRESS_ACCESS_TOKEN});
  let companyId = getSettingData ? getSettingData?.company_id:  req && req.query && req.query.company_id || data?.company_id || req?.query?.company_id;
  try {
    const token = utils.md5Password(utils.getTimeStamp());
    let objectData = {
      first_name: data?.firstName,
      last_name: data?.lastName,
      phone: data?.mobile,
      gender: data?.gender,
      marital_status: data['marital-status'] || null,
      email: data?.email,
      age: data?.age !== '' ? Number.Get(data?.age) : null,
      message: data?.message || null,
      current_city: data['current-city'] || null,
      current_state: data['current-state'] || null,
      qualification: data['qualification-degree'] || null,
      department: data['qualification-department'] || null,
      year_of_passing: data['qualification-year'] ? Number.Get(data['qualification-year']) : null,
      position: data?.position || null,
      permanent_city: data['permanent-city'] || null,
      staying_with: data['staying-with'] || null,
      permanent_state: data['permanent-state'] || null,
      current_address: data?.currentAddress || null,
      current_area: data?.currentArea || null,
      current_country: data?.currentCountry || null,
      current_pincode: data?.currentPincode ? Number.Get(data?.currentPincode) : null,
      permanent_country: data?.permanentCountry || null,
      permanent_address: data?.permanentAddress || null,
      permanent_area: data?.permanentArea || null,
      permanent_pincode: data?.permanentPincode ? Number.Get(data?.permanentPincode) : null,
      overall_experience: concatValue(
        isNaN(data?.experienceYear) ? null : Number.Get(data?.experienceYear),
        isNaN(data?.experienceMonth) ? null : Number.Get(data?.experienceMonth)
      ),
      project_title: data?.projectTitle || null,
      project_period: data?.projectPeriod || null,
      project_description: data?.projectDescription || null,
      course_name: data?.courseName || null,
      course_period: data?.coursePeriod || null,
      course_institution: data?.courseInstitution || null,
      current_salary: concatValue(data?.currentSalaryLakhs, data?.currentSalaryThousand),
      expected_salary: data['expected-salary'] ? Currency.Get(data['expected-salary']):null,
      token,
      percentage: data?.percentage ? Number.Get(data?.percentage) : null,
      position_type: data?.positionType || null,
      dob: data?.dob || null,
      relevant_experience: concatValue(data?.relevantExperienceYear, data?.relevantExperienceMonth),
      expected_cost_per_hour: data?.expectedCostPerHour ? Number.Get(data?.expectedCostPerHour) : null,
      job_reference_type: data?.jobReferenceType || null,
      job_reference_name: data?.jobReferenceName || null,
      willing_to_work_in_shift: data?.willingToWorkInShift ? "Yes" : "No",
      skills: JSON.parse(data?.skills || '[]'), // default to an empty array if skills is not provided
      tenth_year_of_passing: data?.tenthYearOfPassing ? Number.Get(data?.tenthYearOfPassing) : null,
      tenth_percentage: data?.tenthPercentage ? Number.Get(data?.tenthPercentage) : null,
      twelveth_year_of_passing: data?.twelvethYearOfPassing ? Number.Get(data?.twelvethYearOfPassing) : null,
      twelveth_percentage: data?.twelvethPercentage ? Number.Get(data?.twelvethPercentage) : null,
      degree_arrear: data?.degreeArrear || null,
      did_course: data?.didCourse || null,
      did_project: data?.didProject || null,
      linkedin_profile_name: data?.linkedinProfileName || null,
      facebook_profile_name: data?.facebookProfileName || null,
      github_profile_name: data?.githubProfileName || null,
      behance_profile_name: data?.behanceProfileName || null,
      job_title: data?.jobTitle || null,
      joined_month: data?.joinedMonth || null,
      joined_year: data?.joinedYear ? Number.Get(data?.joinedYear) : null,
      company_name: data?.companyName || null,
      known_languages: data?.knownLanguages || null,
      employment_eligibility: data?.employmentEligibility || null,
      vaccine_status: data?.didVaccineStatus || null,
      company_id: Number.Get(companyId) || null,
      status: await StatusService.getFirstStatus(ObjectName.CANDIDATE, companyId),
    }

    await Candidate.create(objectData).then(async (candidate) => {
      // file Upload
      if (file && file !== undefined) {
        let imageData = {
          file_name: file?.name.trim(),
          name: file?.name.trim(),
          company_id: Number.Get(companyId),
          object_id: candidate?.id,
          object_name: ObjectName.CANDIDATE,
          visibility: Media.VISIBILITY_PUBLIC,
        };
        let mediaDetails = await MediaModal.create(imageData);
        if (mediaDetails) {
          await mediaService.uploadMedia(
            file?.path,
            mediaDetails?.id,
            file?.name,
            mediaDetails.visibility == Media.VISIBILITY_PUBLIC ? true : false
          );
        }
      }
      if (profileImage && profileImage !== undefined) {
        let imageData = {
          file_name: profileImage?.name.trim(),
          name: profileImage?.name.trim(),
          company_id: Number.Get(companyId),
          object_id: candidate?.id,
          object_name: ObjectName.CANDIDATE,
          visibility: Media.VISIBILITY_PUBLIC,
        };
        let mediaDetails = await MediaModal.create(imageData);
        if (mediaDetails) {
          await mediaService.uploadMedia(
            profileImage?.path,
            mediaDetails?.id,
            profileImage?.name,
            mediaDetails.visibility == Media.VISIBILITY_PUBLIC ? true : false
          );
        }
      }
      res.json(201, {
        message: " Candidate Added",
        candidateId: candidate.id,
      });

      res.on("finish",async ()=>{
        history.create("Candidate Added", req, ObjectName.CANDIDATE, candidate?.id);

        let getDetail = await CandidateService.get({ id: candidate?.id, companyId: companyId });
        if (getDetail) {
          const toMailValues = await SettingService.getSettingValue(Setting.CANDIDATE_PROFILE_SUBMIT_NOTIFICATION_EMAIL, companyId);
          let toEmails = toMailValues && toMailValues?.split(",");

          if (ArrayList.isArray(toEmails)) {
            let params = {
              companyId: companyId,
              fromMail: getDetail?.email,
              toMail: toEmails,
            }
            await CandidateService.sendPostResumeMail(params, getDetail, () => { });
          }
        }

    })
    }).catch((err) => {
      console.log(err);
      res.json(500, { message: "Internal Server Error" });
    });
  } catch (err) {
    req.log.error(err);
    next(err);
  }
}
module.exports = add;