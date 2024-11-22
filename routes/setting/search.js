// utils
const Permission = require("../../helpers/Permission");
const { defaultDateFormat } = require("../../lib/utils");

// import service
const { settingService } = require("../../services/SettingService");

async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.FEATURE_VIEW, req);

  
  try {
    settingService
      .findAndCount({ where: { company_id: null } })
      .then(async (results) => {
        // Return null
        if (results.count === 0) {
          return res.send(200, null);
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
