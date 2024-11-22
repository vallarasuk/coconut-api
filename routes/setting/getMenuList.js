// utils
const Setting = require("../../helpers/Setting");
const Request = require("../../lib/request");
const { defaultDateFormat } = require("../../lib/utils");

// import service
const { settingService } = require("../../services/SettingService");

async function search(req, res, next) {
  try {
    let companyId = Request.GetCompanyId(req);

    let where = new Object();

    where.company_id = companyId;

    let query = {
      where,
      attributes: ["id", "name", "value"],
    };
    settingService.findAndCount(query).then(async (results) => {
      // Return null
      if (results.count === 0) {
        return res.send(200, null);
      }
      const settingArray = [
        Setting.ENABLE_ACCOUNT,
        Setting.ENABLE_JOBS,
        Setting.ENABLE_PAGES,
        Setting.ENABLE_PRODUCTS,
        Setting.ENABLE_PROJECTS,
        Setting.ENABLE_STORE,
        Setting.ENABLE_USERS,
      ];
      const settings = [];
      results.rows.forEach((settingData) => {
        if (settingData.value !== null && settingData.value !== "" && settingData.value !== false) {
          let index = settingArray.indexOf(settingData.name);

          if (index > -1) {
            settings.push({
              name: settingData.name,
              value: settingData.value,
            });
          }
        }
      });

      // if (settings && !settings.length > 0) {
      //   return res.json(400, { message: "Setting not found" });
      // }

      res.send(200, settings);
    });
  } catch (err) {
    console.log(err);
    res.send(400, { message: err.message });
    next(err);
  }
}

module.exports = search;
