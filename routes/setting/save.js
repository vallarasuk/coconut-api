// import service
const async = require("async");
const Permission = require("../../helpers/Permission");
//Common
const { removeUndefinedKeys } = require("../../lib/utils");
const { saveSetting } = require("../../services/SettingService");
const Request = require("../../lib/request");
const History = require("../../services/HistoryService"); // Assuming HistoryService is the correct path

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function save(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.FEATURE_SAVE, req);

    const { company_id } = req.query;

    let companyId = company_id ? company_id : Request.GetCompanyId(req);

  

    const data = req.body;

    // Validation
    if (!companyId) {
      return res.json(400, { message: "Company Id is required" });
    }

    const historyEntries = [];

    async
    .eachSeries(Object.keys(data), async (settingKey, cb) => {
        //Save Setting
        if (settingKey != "objectId" && settingKey != "objectName") {
          await saveSetting(
            settingKey,
            data[settingKey],
            companyId,
            data.objectId,
            data.objectName
          );

          // Create history entry on save
          const titleCaseKey = toTitleCase(settingKey);

          // Determine the history message based on the value
          const historyMessage =
          (data[settingKey] === "true" || (data[settingKey] !== "false" && data[settingKey].trim() !== "")) 
            ? `${titleCaseKey} Setting Saved`
            : `${titleCaseKey} Setting Removed`;

          if (data[settingKey] !== "") {
            historyEntries.push({
              message: historyMessage,
              objectName: data.objectName,
              objectId: data.objectId,
            });
          }

          return cb;
        }
      },
      (err) => {
        if (err) {
          return next(err);
        }

        res.json(200, { message: "Setting Saved" });

        res.on("finish", async () => {
          for (const entry of historyEntries) {
            await History.create(entry.message, req, entry.objectName, entry.objectId);
          }
        });
      }
    );
  } catch (err) {
    console.log(err);
  }
}

module.exports = save;
