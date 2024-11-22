const ObjectName = require("../helpers/ObjectName");
const ArrayList = require("../lib/ArrayList");
const Request = require("../lib/request");
const history = require("./HistoryService");
const { AppSetting, App: appModel } = require("../db").models;


class AppSettingService {

    static async save(req, res, next) {

        let data = req.body;
        let companyId = Request.GetCompanyId(req);

        let key = Object.keys(data)
        let where = {}

        where.company_id = companyId
        where.name = key[0]
        where.app_id = data["app_id"]

        let uploadData = {
            name: key[0],
            value: data[key[0]],
            app_id: data["app_id"],
            company_id: companyId
        }

        let isRecordAlreadyExist = await AppSetting.findOne({ where: where });
        if (isRecordAlreadyExist) {
            await AppSetting.update(uploadData, { where: where })
        } else {
            await AppSetting.create(uploadData)
        }

        res.json(200, { message: data[key[0]] === "true" ? "AppSetting Saved":"AppSetting Removed"});
        res.on("finish", async () => {
             history.create(data[key[0]] === "true" ? "AppSetting Saved" :  "AppSetting Removed" , req, ObjectName.APP, data["app_id"]);
        });
    }

    static async get(req,res,next){
        let { app_id } = req.query;
        let companyId = Request.GetCompanyId(req);

        let appSettingList = await AppSetting.findAll({
            where: {
                app_id: app_id,
                company_id: companyId
            }
        })

        let data =[]
        if(ArrayList.isArray(appSettingList)){
            for (let i = 0; i < appSettingList.length; i++) {
                const { name , value} = appSettingList[i];
                data.push({
                    name,
                     value
                })
            }
        }

        res.json(200,{
            data
        })
    }

    static async getFeatureList(companyId,nameSpace){
try{
        if(!nameSpace){
            throw { message:"Name Space is Required"}
        }

        let getAppDetail = await appModel.findOne({
            where: {
                company_id: companyId,
                name_space: nameSpace
            }
        });

        if(!getAppDetail){
            throw { message:"Detail Not Found"}
        }

        let appSettingList = await AppSetting.findAll({
            where: {
                app_id: getAppDetail?.id,
                company_id: companyId
            }
        })
        

        let featureArrayList=[]
        if(ArrayList.isArray(appSettingList)){
            for (let i = 0; i < appSettingList.length; i++) {
                featureArrayList.push({
                    name: appSettingList[i]?.name ? appSettingList[i]?.name :"",
                    value: appSettingList[i]?.value ? appSettingList[i]?.value :"",
                })
            }
        }
        return featureArrayList;
    }catch(err){
        console.log(err);
    }
    }
}
module.exports = AppSettingService;