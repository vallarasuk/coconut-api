// utils
const { ProjectSettingModel } = require('../../db').models;
const Response = require('../../helpers/Response');
const DataBaseService = require('../../lib/dataBaseService');
const { defaultDateFormat } = require('../../lib/dateTime');
const Request = require('../../lib/request');
const projectSettingService = new DataBaseService(ProjectSettingModel);
const { getCompanyDetailById } = require("../../services/CompanyService");


async function get(req, res, next) {
    try {

        let companyId = Request.GetCompanyId(req);
        
        let where = new Object();

        where.company_id = companyId;

        if (req.query.name) {
            where.name = req.query.name;
        }


        // Validate id
        if (!companyId) {
            return res.json(Response.BAD_REQUEST, { message: "Company id is required" });
        }

        try {
            projectSettingService
                .findAndCount({ where })
                .then(async (results) => {
                    // Return null
                    if (results.count === 0) {
                        return res.json(Response.OK, null);
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
                    //     return res.json(Response.BAD_REQUEST, { message: "Setting not found" });
                    // }
                    const data = {
                        settings,
                        companyDetail: companyDetail,
                    };

                    res.send(Response.OK, data);
                });
        } catch (err) {
            res.json(Response.BAD_REQUEST, { message: err.message });
            next(err);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = get;