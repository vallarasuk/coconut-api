// utils
const { defaultDateFormat } = require("../../lib/utils");

// import service
const { settingService } = require("../../services/SettingService");

const Request = require("../../lib/request");

const { getCompanyDetailById } = require("../../services/CompanyService");


async function get(req, res, next) {
    try {

        let companyId = Request.GetCompanyId(req);
        
        let where = new Object();

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

        // Validate id
        if (!companyId) {
            return res.json(400, { message: "Company id is required" });
        }

        try {
            settingService
                .findAndCount({ where })
                .then(async (results) => {
                    // Return null
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
                });
        } catch (err) {
            res.json(400, { message: err.message });
            next(err);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = get;