// utils
const { ProjectSettingModel } = require('../../db').models;
const Response = require('../../helpers/Response');
const DataBaseService = require('../../lib/dataBaseService');
const Request = require('../../lib/request');
const { defaultDateFormat } = require('../../lib/utils');
const projectSettingService = new DataBaseService(ProjectSettingModel);

async function search(req, res, next) {
  try {
    let companyId = Request.GetCompanyId(req);
    projectSettingService.findAndCount({ where: { company_id: companyId,project_id:req.query.projectId } }).then(async (results) => {
      // Return null
      if (results.count === 0) {
        return res.send(Response.OK, null);
      }
      const settings = [];
      results.rows.forEach((settingData) => {
        settings.push({
          id: settingData.id,
          name: settingData.name,
          value: settingData.value,
          createdAt: defaultDateFormat(settingData.createdAt),
        });
      });
      // if (settings && !settings.length > 0) {
      //   return res.json(Response.BAD_REQUEST, { message: 'Setting not found' });
      // }
      let data = {
        settings: settings,
      };
      res.send(Response.OK, data);
    });
  } catch (err) {
    console.log(err);
    res.send(Response.BAD_REQUEST, { message: err.message });
    next(err);
  }
}

module.exports = search;
