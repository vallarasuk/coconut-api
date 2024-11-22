const errors = require("restify-errors");
const Permission = require("../../helpers/Permission");
const validator = require("../../lib/validator");
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Number = require("../../lib/Number");
const { Candidate } = require("../../db").models;
const StatusService = require("../../services/StatusService");

async function createAuditLog(olddata, updatedData, req, id) {

  let companyId = Request.GetCompanyId(req);
  let auditLogMessage = new Array();

  if (
    updatedData?.first_name &&
    olddata?.first_name !== updatedData.first_name
  ) {
    if (olddata?.first_name !== updatedData.first_name) {
      auditLogMessage.push(`First Name Updated TO ${updatedData?.first_name}\n`);
    }
  }

  if (updatedData?.last_name && updatedData?.last_name !== olddata.last_name) {
    if (olddata?.last_name !== updatedData?.last_name) {
      auditLogMessage.push(`Last Name Updated TO ${updatedData?.last_name}\n`);
    }
  }

  if (updatedData?.phone && olddata?.phone !== updatedData?.phone) {
    if (olddata?.phone !== updatedData?.phone) {
      auditLogMessage.push(`Phone Number Updated TO ${updatedData?.phone}\n`);
    }
  }

  if (updatedData?.gender && updatedData?.gender !== olddata.gender) {
    if (olddata?.gender !== updatedData?.gender) {
      auditLogMessage.push(`Gender Updated TO ${updatedData?.gender}\n`);
    }
  }

  if (updatedData?.email && updatedData?.email !== olddata.email) {
    if (olddata?.email !== updatedData?.email) {
      auditLogMessage.push(`E-Mail Updated TO ${updatedData?.email}\n`);
    }
  }

  if (updatedData?.position && updatedData?.position !== olddata.position) {
    if (olddata?.position !== updatedData?.position) {
      auditLogMessage.push(`Position Updated TO ${updatedData?.position}\n`);
    }
  }

  if (updatedData?.marital_status && updatedData?.marital_status !== olddata.marital_status) {
    if (olddata?.marital_status !== updatedData?.marital_status) {
      auditLogMessage.push(`Marital Status Updated TO ${updatedData?.marital_status}\n`);
    }
  }

  if (updatedData?.status && olddata.status !== updatedData?.status) {
    if (olddata.status !== updatedData?.status) {
      let statusData = await StatusService.getData(
        updatedData?.status,
        companyId
      );
      auditLogMessage.push(`Status Updated to  ${statusData?.name}\n`);
    }
  }

  if (auditLogMessage && auditLogMessage.length > 0) {
    let message = auditLogMessage.join();
    History.create(message, req, ObjectName.CANDIDATE, id);
  } else {
    History.create("Candidate Updated", req, ObjectName.CANDIDATE, id);
  }
}

async function update(req, res, next) {
  const hasPermission = await Permission.Has(Permission.CANDIDATE_EDIT, req);

  const { id } = req.params;

  if (!id) {
    return res.json(400, { message: "Candidate  id is required" });
  }
  const companyId = Request.GetCompanyId(req);

  let candidate = await Candidate.findOne({
    where: { id: id, company_id: companyId },
  });

  if (!candidate) {
    return res.json(400, { message: "Candidate is not found" });
  }

  const data = req.body;

  const candidateDetails = await Candidate.findOne({
    where: { id: id, company_id: companyId },
  });

  let updateData = {};

  if (data.firstName) {
    updateData.first_name = data.firstName;
  }

  if (data.lastName) {
    updateData.last_name = data.lastName;
  }
  if (data.media_id) {
    updateData.media_id = data.media_id;
  }

  if (data.notes) {
    updateData.notes = data.notes;
  }

  if (data.owner_id) {
    updateData.owner_id = data.owner_id;
  }

  if (data.status) {
    updateData.status = data.status;
  }

  if (data.phone) {
    updateData.phone = data.phone;
  }

  if (data.gender) {
    updateData.gender = data.gender;
  }

  if (data.maritalStatus) {
    updateData.marital_status = data.maritalStatus;
  }

  if (data.email) {
    updateData.email = data.email;
  }

  if (data.age) {
    updateData.age = data.age;
  }

  if (data.currentAddress) {
    updateData.current_address = data.currentAddress;
  } else {
    updateData.current_address = null;
  }

  if (data.currentArea) {
    updateData.current_area = data.currentArea;
  }

  if (data.currentCountry) {
    updateData.current_country = data.currentCountry;
  }

  if (data.currentCity) {
    updateData.current_city = data.currentCity;
  }

  if (data.currentState) {
    updateData.current_state = data.currentState;
  }

  if (data.currentPincode) {
    updateData.current_pincode = data.currentPincode;
  }

  if (data.permanentCountry) {
    updateData.permanent_country = data.permanentCountry;
  }

  if (data.permanentAddress) {
    updateData.permanent_address = data.permanentAddress;
  } else {
    updateData.permanent_address = null;
  }

  if (data.permanentArea) {
    updateData.permanent_area = data.permanentArea;
  } else {
    updateData.permanent_area = null;
  }

  if (data.permanentCity) {
    updateData.permanent_city = data.permanentCity;
  } else {
    updateData.permanent_city = null;
  }

  if (data.permanentState) {
    updateData.permanent_state = data.permanentState;
  } else {
    updateData.permanent_state = null;
  }

  if (data.permanentPincode) {
    updateData.permanent_pincode = data.permanentPincode;
  } else {
    updateData.permanent_pincode = null;
  }

  if (data.qualification) {
    updateData.qualification = data.qualification;
  }

  if (data.department) {
    updateData.department = data.department;
  }

  if (data.yearOfPassing) {
    updateData.year_of_passing = data.yearOfPassing;
  }

  if (Number.isNotNull(data.position)) {
    updateData.position = data.position;
  }

  if (data.over_all_experience) {
    updateData.overall_experience = data.over_all_experience;
  }

  if (data.projectTitle) {
    updateData.project_title = data.projectTitle;
  } else {
    updateData.project_title = null;
  }

  if (data.projectPeriod) {
    updateData.project_period = data.projectPeriod;
  } else {
    updateData.project_period = null;
  }

  if (data.projectDescription) {
    updateData.project_description = data.projectDescription;
  } else {
    updateData.project_description = null;
  }

  if (data.courseName) {
    updateData.course_name = data.courseName;
  } else {
    updateData.course_name = null;
  }

  if (data.coursePeriod) {
    updateData.course_period = data.coursePeriod;
  } else {
    updateData.course_period = null;
  }

  if (data.courseInstitution) {
    updateData.course_institution = data.courseInstitution;
  } else {
    updateData.course_institution = null;
  }

  if (data.currentSalary) {
    updateData.current_salary = data.currentSalary;
  }

  if (data.expected_salary) {
    updateData.expected_salary = data.expected_salary;
  }

  if (data.message) {
    updateData.message = data.message;
  }

  if (data.percentage) {
    updateData.percentage = data.percentage;
  } else {
    updateData.percentage = null;
  }

  if (Number.isNotNull(data.positionType)) {
    updateData.position_type = data.positionType;
  }

  if (data.dob) {
    updateData.dob = data.dob;
  } else {
    updateData.dob = null;
  }

  if (data.relevantExperience) {
    updateData.relevant_experience = data.relevantExperience;
  }

  if (data.expectedCostPerHour) {
    updateData.expected_cost_per_hour = data.expectedCostPerHour;
  } else {
    updateData.expected_cost_per_hour = null;
  }

  if (data.jobReferenceType) {
    updateData.job_reference_type = data.jobReferenceType;
  }

  if (data.jobReferenceName) {
    updateData.job_reference_name = data.jobReferenceName;
  }

  updateData.willing_to_work_in_shift = data.willingToWorkInShift;

  if (data.skills) {
    updateData.skills = JSON.parse(JSON.stringify(data.skills));
  }

  if (data.stayingWith) {
    updateData.staying_with = data.stayingWith;
  }

  if (data.tenthYearOfPassing) {
    updateData.tenth_year_of_passing = data.tenthYearOfPassing;
  }

  if (data.tenthPercentage) {
    updateData.tenth_percentage = data.tenthPercentage;
  }

  if (data.twelvethYearOfPassing) {
    updateData.twelveth_year_of_passing = data.twelvethYearOfPassing;
  }

  if (data.twelvethPercentage) {
    updateData.twelveth_percentage = data.twelvethPercentage;
  }

  if (data.degreeArrear) {
    updateData.degree_arrear = data.degreeArrear;
  }

  if (data.didCourse) {
    updateData.did_course = data.didCourse;
  }

  if (data.didProject) {
    updateData.did_project = data.didProject;
  }

  if (data.linkedinProfileName) {
    updateData.linkedin_profile_name = data.linkedinProfileName;
  }

  if (data.facebookProfileName) {
    updateData.facebook_profile_name = data.facebookProfileName;
  }

  if (data.jobTitle) {
    updateData.job_title = data.jobTitle;
  }

  if (data.joinedMonth) {
    updateData.joined_month = data.joinedMonth;
  }

  if (data.joinedYear) {
    updateData.joined_year = data.joinedYear;
  }

  if (data.companyName) {
    updateData.company_name = data.companyName;
  }

  if (data.knownLanguages) {
    updateData.known_languages = data.knownLanguages;
  }

  if (data.employmentEligibility) {
    updateData.employment_eligibility = data.employmentEligibility;
  }

  if (data.didVaccineStatus) {
    updateData.vaccine_status = data.didVaccineStatus;
  }
  if (data.interviewDate) {
    updateData.interview_date = data.interviewDate;
  }

  if (data.stayingWith) {
    updateData.staying_with = data.stayingWith;
  }

  await Candidate.update(updateData, {
    where: { id: id },
    returning: true,
    plain: true,
  })
    .then(() => {
      res.json(200, {
        message: "Candidate updated",
      });
      res.on("finish", async () => {
        createAuditLog(candidateDetails, updateData, req, id);
      });
    })
    .catch((err) => {
      req.log.error(err);
      next(err);
    });
}

module.exports = update;
