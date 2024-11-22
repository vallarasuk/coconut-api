const Jobs = require("../../helpers/Job");

function JobDetails(result) {
  const jobs = result.get();

  const data = {
    id: jobs.id,
    category: jobs.category,
    subCategory: jobs.sub_category,
    jobTitle: jobs.job_title,
    slug: jobs.slug,
    location: jobs.location,
    experience: jobs.experience,
    sort: jobs.sort,
    jobDescription: jobs.job_description,
    mandatorySkills: jobs.mandatory_skills,
    requirements: jobs.requirements,
    responsibilities: jobs.responsibilities,
    status: jobs.status == Jobs.STATUS_ACTIVE ? 'Active' : jobs.status == Jobs.STATUS_INACTIVE ? 'InActive' : null,
    minimumExperience: jobs.minimum_experience,
    maximumExperience: jobs.maximum_experience,
    maximumSalary: jobs.maximum_salary,
    jobType: jobs.job_type,
    projectName: jobs.project_name,
    courseName: jobs.course_name,
    showCurrentAddress: jobs.show_current_address,
    showEmploymentEligibility: jobs.show_employment_eligibility,
    showHomeTownAddress: jobs.show_home_town_address,
    showSkills: jobs.show_skills,
    showExpectedSalary: jobs.show_expected_salary,
    showCurrentSalary: jobs.show_current_salary,
    showEmployment: jobs.show_employment,
    showProjectDetails: jobs.show_project_details,
    showCourseDetails: jobs.show_course_details,
    showVaccineStatus: jobs.show_vaccine_status,
    field: jobs.fields
  };

  return data;
}

module.exports = JobDetails;
