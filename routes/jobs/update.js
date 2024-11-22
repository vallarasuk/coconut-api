const { Jobs } = require("../../db").models;
const errors = require("restify-errors");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");


function update(req, res, next) {
  const data = req.body;
  const id = req.params.id;
  let company_id = Request.GetCompanyId(req);
  let checkBoxValue = data && data?.checkBoxValue && data?.checkBoxValue?.split(",");
  let fields = null;
  if (Object.keys(data).includes("checkBoxValue")) {
    fields = checkBoxValue && checkBoxValue.join(",")
  }
  Jobs.update(
    {
      job_title: data.job_title,
      status: data.status == "Active" ? 1 : data.status == "InActive" ? 2 : null,
      slug: data.slug,
      category: data.category,
      job_type: data.job_type,
      sub_category: data.sub_category,
      location: data.location,
      experience: data.experience,
      sort: data.sort,
      job_description: data.job_description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      mandatory_skills: data.mandatory_skills,
      course_name: data.course_name,
      project_name: data.project_name,
      minimum_experience: Number.Get(data.minimum_experience),
      maximum_experience: Number.Get(data.maximum_experience),
      maximum_salary: data.maximum_salary || null,
      show_current_salary: data.show_current_salary,
      show_expected_salary: data.show_expected_salary,
      show_skills: data.show_skills,
      show_course_details: data.show_course_details,
      show_project_details: data.show_project_details,
      show_employment_eligibility: data.show_employment_eligibility,
      show_current_address: data.show_current_address,
      show_home_town_address: data.show_home_town_address,
      show_employment: data.show_employment,
      show_vaccine_status: data.show_vaccine_status,
      fields: fields
    },
    { where: { id, company_id } }
  )
    .then(() => {
      res.json({
        message: "Job details updated",
      });
    })
    .catch((err) => {
      req.log.error(err);
      return next(err);
    });
}

module.exports = update;
