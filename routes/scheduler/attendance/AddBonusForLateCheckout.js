const Request = require("../../../lib/request");
const { SchedulerJob, Attendance: AttendanceModel, Shift: ShiftModal } = require("../../../db").models;
const schedulerJobCompanyService = require("../schedularEndAt");
const History = require("../../../services/HistoryService");
const ObjectName = require("../../../helpers/ObjectName");
const Attendance = require("../../../services/AttendanceService");
const DateTime = require("../../../lib/dateTime");
const { Op } = require("sequelize");
const ArrayList = require("../../../lib/ArrayList");
const AttendanceService = require("../../../services/AttendanceService");
const { getSettingValueByObject } = require("../../../services/SettingService");
const Setting = require("../../../helpers/Setting");

module.exports = async function (req, res) {
    try {
        const companyId = Request.GetCompanyId(req);
        const userDefaultTimeZone = Request.getTimeZone(req);
        const roleId = Request.getUserRole(req);

        res.json(200, { message: "Attendance Late Check-Out Bonus Add Started" });

        res.on("finish", async () => {

            let id = req.query.id;

            let params = { companyId: companyId, id: id };


            const schedularData = await SchedulerJob.findOne({ where: { id: id, company_id: companyId } });

            let start_date = schedularData?.start_date ? schedularData?.start_date : new Date()
            let end_date = schedularData?.end_date ? schedularData?.end_date : new Date()

            await History.create(`${schedularData?.name} Job Started`, req, ObjectName.SCHEDULER_JOB, id);
            await schedulerJobCompanyService.setStatusStarted(params, err => {
                if (err) {
                    throw new err();
                }
            });

            let isEnableBonusAddForLateCheckOut = await getSettingValueByObject(
                Setting.BONUS_ADD_FOR_LATE_CHECKOUT,
                companyId,
                roleId,
                ObjectName.ROLE
              );

              if(isEnableBonusAddForLateCheckOut && isEnableBonusAddForLateCheckOut == "true"){
                  let bonusParams = {
                      company_id: companyId,
                      startDate: DateTime.getSQlFormattedDate(start_date),
                      endDate: DateTime.getSQlFormattedDate(end_date)
                  }
      
      
                  let attendanceList = await AttendanceModel.findAll({
                      where: {
                          login: { [Op.ne]: null },
                          logout: { [Op.ne]: null },
                          company_id: companyId,
                          date : {
                              [Op.and]: {
                                  [Op.gte]: bonusParams?.startDate,
                                  [Op.lte]: bonusParams?.endDate,
                              }
                          }
                      },
                      include: [
                          {
                              required: true,
                              model: ShiftModal,
                              as: "shift",
                          },
                      ]
                  });
      
                  let end_additional_hours;
                  let endAdditionalHours;
      
                  if (ArrayList.isArray(attendanceList)) {
                      for (let i = 0; i < attendanceList.length; i++) {
                          const { user_id, shift, logout, date } = attendanceList[i];
                          
                          end_additional_hours = shift?.end_time < DateTime.formateTime(logout) ? DateTime.getTimeDifference(shift?.end_time, DateTime.formateTime(logout)) : "00:00";
      
                          endAdditionalHours = DateTime.convertHoursToMinutes(end_additional_hours)
      
                          await AttendanceService.addBonusForLateCheckOut(user_id, shift?.end_time, endAdditionalHours, userDefaultTimeZone, companyId, logout,new Date(date), new Date(date));
      
                      }
                  }
              }




            await schedulerJobCompanyService.setStatusCompleted(params, err => {
                if (err) {
                    throw new err();
                }
            });
            History.create(`${schedularData?.name} Job Completed`, req, ObjectName.SCHEDULER_JOB, id);

        })

    } catch (err) {
        console.log(err);
    }
};