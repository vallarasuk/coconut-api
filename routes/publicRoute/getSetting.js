// utils
const { defaultDateFormat } = require("../../lib/utils");

// import service
const { settingService, loadSettingByName } = require("../../services/SettingService");

const { getCompanyDetailById } = require("../../services/CompanyService");
const ArrayList = require("../../lib/ArrayList");
const Setting = require("../../helpers/Setting");
const { BAD_REQUEST } = require("../../helpers/Response");


async function getSetting(req, res, next) {
    try {

        let where = new Object();

        let companyId;

        let settingList = await loadSettingByName(Setting.ONLINE_SALE_COMPANY);

        if (ArrayList.isNotEmpty(settingList)) {

            let settindData = settingList.find((data) => data.value);

            companyId = settindData ? settindData.get().company_id : null;

            if (!companyId) {
                return res.json(BAD_REQUEST, { message: "Something went wrong" });
            }

        } else {
            return res.json(BAD_REQUEST, { message: "Something went wrong" });
        }

        where.company_id = companyId;

        if (req.query.name) {
            where.name = req.query.name;
        }

        if (req.query.object_id) {
            where.object_id = req.query.object_id;
        }
        if (req.query.object_name) {
            where.object_name = req.query.object_name;
        }

        try {
            let results = await settingService.findAndCount({ where })

            if (results.count === 0) {
                return res.json(200, null);
            }

            const companyDetail = await getCompanyDetailById(companyId);

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
            //     return res.json(400, { message: "Setting not found" });
            // }

            const data = {
                settings,
                companyDetail: companyDetail,
            };

            res.send(200, data);

        } catch (err) {
            res.json(400, { message: err.message });
            next(err);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = getSetting;