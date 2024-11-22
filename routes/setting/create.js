// import service
const { settingService } = require("../../services/SettingService");

const async = require("async");
const Permission = require("../../helpers/Permission");

async function saveSystemSetting(name, value, callback) {
  const hasPermission = await Permission.Has(Permission.FEATURE_ADD, req);

 
  try {
    const settingData = {
      name: name,
      value: value,
    };

    const isSettingExist = await settingService.findOne({
      where: { name: name },
    });
    if (isSettingExist) {
      await settingService.update(settingData, {
        where: { name: name },
      });
    } else {
      await settingService.create(settingData);
    }
    return callback();
  } catch (err) {
    console.log(err);
  }
}

async function create(req, res, next) {
  try {
    const data = req.body;
    async
      .eachSeries(
        Object.keys(data),
        async (settingKey, cb) =>
          await saveSystemSetting(settingKey, data[settingKey], cb)
      )
      .then(() => {
        res.send(200, { message: "Setting Saved" });
      });
  } catch (err) {
    console.log(err);
  }
}

module.exports = create;
