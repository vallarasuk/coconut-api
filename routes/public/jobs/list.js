// Models
const { Jobs } = require("../../../db").models;

const { Op } = require("sequelize");
const { getSetting } = require("../../../services/SettingService");
const Setting = require("../../../helpers/Setting");

async function list(req, res) {
  const data = req.query;
  const authorizationToken = req?.header("Authorization")?.split(' ')[1] || req?.header("Authorization");
  if(!authorizationToken){
    return res.json(400, { message: "Authorization Token required" });
  }

  let getSettingData = await getSetting({value: authorizationToken, name: Setting.WORDPRESS_ACCESS_TOKEN});
  let companyId = getSettingData ? getSettingData?.company_id:  req && req.query && req.query.company_id || data?.company_id || req?.query?.company_id;
  const where = { status: 1 };
  const category = data.category;
  where.company_id = companyId
  if (category) {
    where.category = category;
  }

  const slug = data.slug;
  if (slug) {
    where.slug = { [Op.like]: `${slug}` };
  }

  Jobs.findAll({
    where,
    order: [["sort", "ASC"]],
  }).then((jobs) => {
    const jobsList = {};

    jobs.forEach((job) => {
      if (!jobsList[job.sub_category]) {
        jobsList[job.sub_category] = [];
      }

      jobsList[job.sub_category].push(job);
    });

    res.json(jobsList);
  });
}

module.exports = list;
