const async = require("async");

// Constants
const attendanceTypes = require("../routes/attendance/types");
const statuses = require("../routes/attendance/statuses");
const Number = require("../lib/Number");

// Utils
const utils = require("../lib/utils");

// Models
const {
  User,
  Activity,
  Attendance,
  Holiday,
  TicketTest,
  TicketTestResult,
  TicketHistory,
  Ticket,
  IndexTicket,
  Shift,
  Location,
  UserEmployment: UserEmploymentModel,
  Tag,
  ProjectTicketType,
  status: StatusModel,
  FineBonus
} = require("../db").models;

// Constants
const { LOGGED_IN } = require("../helpers/UserProfileStatus");

const DateTime = require("../lib/dateTime");

const { getSettingValue, getSettingList, getValueByObject, getSettingValueByObject } = require("../services/SettingService");

const setting = require("../helpers/Setting");

const SlackService = require("../services/SlackService");

const MediaService = require("../services/MediaService");

const { Op, Sequelize } = require("sequelize");
const Setting = require("../helpers/Setting");
const Status = require("../helpers/Status");
const ObjectName = require("../helpers/ObjectName");
const UserService = require("./UserService");
const Request = require("../lib/request");
const { getCompanyDetailById } = require("./CompanyService");
const History = require("./HistoryService");
const Permission = require("../helpers/Permission");
const validator = require("../lib/validator");
const history = require("./HistoryService");
const Response = require("../helpers/Response");
const { fineService } = require("./FineBonusService");
const TransferProductReportService = require("./TransferProductReportService");
const db = require("../db");
const ArrayList = require("../lib/ArrayList");
const Currency = require("../lib/currency");
const StockEntryProductService = require("./StockEntryProductService");
const TicketService = require("./TicketService");
const LocationService = require("./LocationService");
const ShiftService = require("../services/services/ShiftService");
const String = require("../lib/string");
const AttendanceTypeService = require("./AttendanceTypeService");
const PreferredLocationService = require("./PreferredLocationService");

const dateTime = new DateTime();

const attendanceService = (module.exports = {
  /**
   * Update Last Attendance
   *
   * @param attendanceDate
   * @param user_id
   * @param callBack
   */
  updateLastAttendance: (attendanceDate, user_id, callBack) => {
    Attendance.findOne({
      attributes: ["date"],
      where: { user_id, date: { $lt: attendanceDate } },
      order: [["date", "DESC"]],
    }).then((attendance) => {
      if (!attendance) {
        return callBack();
      }

      const date = utils.formatDate(attendance.date, "YYYY-MM-DD");
      const yesterdayDate = utils.subtractDays(1, attendanceDate);
      if (date === yesterdayDate) {
        return callBack();
      }

      Holiday.findAll({
        attributes: ["date"],
        where: { date: utils.getDateFilter("", date, yesterdayDate, true) },
      }).then((holidayDetails) => {
        const holidays = [];
        holidayDetails.forEach((holidayDetail) => {
          holidays.push(utils.formatDate(holidayDetail.date, "YYYY-MM-DD"));
        });

        const absentDays = [];
        const dates = utils.getBetweenDays(date, attendanceDate);
        dates.forEach((dateDetail) => {
          dateDetail = utils.formatDate(dateDetail, "YYYY-MM-DD");
          if (holidays.indexOf(dateDetail) < 0 && dateDetail !== date) {
            const day = utils.formatDate(dateDetail, "dddd");
            if (day !== "Saturday" && day !== "Sunday") {
              absentDays.push(dateDetail);
            }
          }
        });

        if (absentDays.length === 0) {
          return callBack();
        }

        const bulkCreate = [];
        absentDays.forEach((absentDay) => {
          bulkCreate.push({
            date: absentDay,
            type: attendanceTypes.ABSENT,
            user_id,
            status: attendanceTypes.STATUS_APPROVED,
          });
        });

        Attendance.bulkCreate(bulkCreate)
          .then(() => callBack())
          .catch((err) => callBack(err));
      });
    });
  },

  /**
   * Get Type
   *
   * @param date
   * @param weekDays
   * @param callback
   */
  getType: (date, weekDays, callback) => {
    Holiday.findOne({
      attributes: ["name"],
      where: { date },
    }).then((holiday) => {
      const day = utils.formatDate(date, "dddd");
      if (!holiday && weekDays && weekDays.indexOf(day) >= 0) {
        return callback(null, attendanceTypes.WORKING_DAY);
      }

      return callback(null, attendanceTypes.ADDITIONAL_DAY);
    });
  },


  /**
   * Create and Update Attendance When User Logged In
   *
   * @param data
   * @param callBack
   */
  createAttendance: (data, callBack) => {
    const date = data.date;
    const user_id = data.user_id;

    Attendance.findOne({
      attributes: ["id", "login"],
      where: { date, user_id },
    }).then((attendance) => {
      //Update Last Attendance Logged In Date
      attendanceService.updateLastAttendance(date, user_id, (err) => {
        if (err) {
          return callBack(err);
        }

        const weekDays = data.week_days;
        //Get Attendance types
        attendanceService.getType(date, weekDays, (err, type) => {
          const ip_address = data.ip_address;
          const login = utils.getSQlCurrentDateTime();

          //Get Valid allowed IP Address
          attendanceService.getSystemConfig(
            "Attendance",
            "allowed_attendance_ip",
            (err, allowedAttendanceIps) => {
              const status =
                type === attendanceTypes.ADDITIONAL_DAY
                  ? statuses.PENDING
                  : statuses.APPROVED;
              let isCreateAttendance = allowedAttendanceIps === null;
              if (allowedAttendanceIps && ip_address) {
                isCreateAttendance =
                  allowedAttendanceIps.split(",").indexOf(ip_address) >= 0;
              }

              const attendanceData = {
                status,
                date,
                user_id,
                type: isCreateAttendance
                  ? type
                  : attendanceTypes.NON_WORKING_DAY,
                ip_address,
                logout: null,
                login,
                activity_status: data.activity_status,
              };

              //Valid IP Address Create Attendance
              if (!attendance) {
                Attendance.create(attendanceData).then((attendanceDetail) => {
                  User.update(
                    { status: LOGGED_IN },
                    { where: { id: user_id } }
                  ).then(() => callBack(null, attendanceDetail));
                });
              } else {
                //Valid IP Address Update Attendance
                attendanceData.login = attendance.login || attendanceData.login;
                attendance.update(attendanceData).then((attendanceDetail) => {
                  User.update(
                    {
                      last_loggedin_at: utils.getSQlCurrentDateTime(),
                    },
                    { where: { id: user_id } }
                  ).then(() => callBack(null, attendanceDetail));
                });
              }
            }
          );
        });
      });
    }).catch((err) => {
      console.log(err);
    })
  },

  /**
   * Get Last Activity Time
   *
   * @param user_id
   * @param date
   * @param callback
   */
  getLastActivityTime: (user_id, date, callback) => {
    Promise.all([
      Activity.findOne({
        attributes: ["created_at"],
        where: [`DATE(created_at) = "${date}" AND user_id = "${user_id}"`],
        order: [["created_at", "desc"]],
      }),
      TicketTest.findOne({
        attributes: ["updated_at"],
        where: [`DATE(updated_at) = "${date}" AND user_id = "${user_id}"`],
        order: [["updated_at", "ESCD"]],
      }),
      TicketTest.findOne({
        attributes: ["id"],
        where: { user_id },
        include: [
          {
            required: true,
            attributes: ["updated_at"],
            model: TicketTestResult,
            as: "ticketTestResult",
            where: [`DATE(updated_at) = "${date}"`],
          },
        ],
        order: [["ticketTestResult.updated_at", "DESC"]],
      }),
      Ticket.findOne({
        attributes: ["updated_at"],
        where: [`DATE(updated_at) = "${date}" AND updated_by = "${user_id}"`],
        order: [["updated_at", "desc"]],
      }),
      TicketHistory.findAll({
        attributes: ["created_by", "created_at"],
        order: [["id", "DESC"]],
        limit: 1,
        where: [`DATE(created_at) = "${date}" AND created_by = "${user_id}"`],
      }),
    ]).then(
      ([activity, ticketTestDetail, ticketTest, ticket, ticketHistory]) => {
        let lastActivityDate = "";
        if (activity) {
          if (!lastActivityDate || activity.created_at > lastActivityDate) {
            lastActivityDate = activity.created_at;
          }
        }

        if (ticketTestDetail) {
          if (
            !lastActivityDate ||
            ticketTestDetail.updated_at > lastActivityDate
          ) {
            lastActivityDate = ticketTestDetail.updated_at;
          }
        }

        if (ticketTest) {
          ticketTest = ticketTest.get();
          if (ticketTest.ticketTestResult) {
            const ticketTestResult = ticketTest.ticketTestResult;
            if (
              !lastActivityDate ||
              ticketTestResult.updated_at > lastActivityDate
            ) {
              lastActivityDate = ticketTestResult.updated_at;
            }
          }
        }

        if (ticket) {
          if (!lastActivityDate || ticket.updated_at > lastActivityDate) {
            lastActivityDate = ticket.updated_at;
          }
        }

        if (ticketHistory) {
          if (
            !lastActivityDate ||
            ticketHistory.created_at > lastActivityDate
          ) {
            lastActivityDate = ticketHistory.created_at;
          }
        }

        return callback(null, lastActivityDate);
      }
    ).catch((err) => {
      console.log(err);
    })
  },

  /**
   * Update Auto Logout
   *
   * @param user_id
   * @param callback
   * @returns {*}
   */
  updateAutoLogout: (user_id, callback) => {
    const where = { logout: null };
    if (user_id) {
      where.user_id = user_id;
    }
    Attendance.findAll({
      attributes: ["id", "user_id", "date"],
      where,
      order: [["date", "asc"]],
    }).then((attendances) => {
      async.eachSeries(
        attendances,
        (attendance, cb) => {
          attendanceService.getLastActivityTime(
            attendance.user_id,
            utils.getSQlFormattedDate(attendance.date),
            (err, logout) => {
              if (!logout) {
                return cb();
              }

              attendance.update({ logout }).then(() => cb());
            }
          );
        },
        () => callback()
      );
    }).catch((err) => {
      console.log(err);
    })
  },

  /**
   * Update Productive Cost In Attendance
   *
   * @param assigned_to
   * @param due_date
   * @param completed_at
   * @param callback
   * @returns {*}
   */
  updateProductiveCost: (assigned_to, due_date, completed_at, callback) => {
    if (!completed_at) {
      return callback();
    }

    const ticketEta = utils.formatDate(due_date, dateTime.formats.mySQLDateFormat);
    const ticketEtaFilter = utils.getDateFilter(ticketEta, "", "");
    const ticketCompletedAt = utils.formatDate(
      completed_at,
      dateTime.formats.mySQLDateFormat
    );
    const completedAtFilter = utils.getDateFilter(ticketCompletedAt, "", "");
    if (ticketEta !== ticketCompletedAt) {
      return callback();
    }

    IndexTicket.sum("story_points", {
      where: {
        assigned_to,
        due_date: ticketEtaFilter,
        completed_at: completedAtFilter,
      },
    }).then((storyPoints) => {
      Attendance.findOne({
        attributes: ["id"],
        where: { user_id: assigned_to, date: ticketCompletedAt },
      }).then((attendance) => {
        attendance
          .update({ productive_cost: storyPoints })
          .then(() => callback());
      });
    }).catch((err) => {
      console.log(err);
    })
  },

  getNextWorkingDay: (date, callback) => {
    Holiday.findOne({
      attributes: ["date"],
      where: { date },
    }).then((holidayDetails) => {
      const holidayDate = holidayDetails
        ? utils.formatDate(holidayDetails.date, "YYYY-MM-DD")
        : "";

      date = utils.formatDate(date, "YYYY-MM-DD");

      const day = utils.formatDate(date, "dddd");

      if (holidayDate !== date) {
        if (day) {
          return callback(null, utils.getSQlFormattedDate(), day);
        }
      }
    }).catch((err) => {
      console.log(err);
    })
  },

  async isAttendanceRecordExist(id, company_id, callback) {
    try {
      const attendance = await Attendance.findOne({ where: { id: id, company_id: company_id } });
      return callback(null, attendance)

    } catch (err) {
      console.log(err);
      return callback(err, null);
    }
  },
  async GetShift(userId, Date, CompanyId) {
    try {
      const attendance = await Attendance.findOne({
        where: {
          user_id: userId,
          date: Date,
          company_id: CompanyId
        },
        order: [["created_at", "DESC"]]
      });
      return attendance?.shift_id;

    } catch (err) {
      console.log(err);
    }
  },

  async getCurrentAttendance(userId, Date, CompanyId) {
    try {
      const attendance = await Attendance.findOne({
        where: {
          user_id: userId,
          date: Date,
          company_id: CompanyId
        },
        order: [["created_at", "DESC"]]
      });
      return attendance;

    } catch (err) {
      console.log(err);
    }
  },

  async getAttendanceCount(where) {
    try {
      let workingDayIds = await AttendanceTypeService.getAttendanceTypeId({is_working_day:true, company_id: where?.company_id})
      let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true, company_id: where?.company_id})
      let additionalDayIds = await AttendanceTypeService.getAttendanceTypeId({is_additional_day:true, company_id: where?.company_id})

      const workedDays = await Attendance.count({
        where: {
          ...where,
          type: {[Op.in]: workingDayIds},
          login: { [Op.ne]: null }
        }
      });

      const AdditionalDays = await Attendance.count({
        where: {
          ...where,
          type: {[Op.in]: additionalDayIds},
          login: { [Op.ne]: null }
        }
      });
      const Leave = await Attendance.count({
        where: {
          ...where,
          type: {[Op.in]: leaveIds},
          login: { [Op.eq]: null }
        }
      });

      return { workedDays, AdditionalDays, Leave }

    } catch (err) {
      console.log(err);
    }
  },

  async SendMessge(mediaId, attendanceId, companyId, activity, created_at, updated_at, channelId) {
    try {

      if (attendanceId) {

        let userDefaultTimeZone = await getSettingValue(Setting.USER_DEFAULT_TIME_ZONE, companyId);
        let message;

        if (channelId) {

          let attendanceDetail = await Attendance.findOne({
            where: { company_id: companyId, id: attendanceId },
            include: [
              {
                required: true,
                model: User,
                as: "user",
                attributes: ["name", "last_name", "media_url"],

              },
              {
                required: false,
                model: Shift,
                as: "shift",
              },
              {
                required: false,
                model: Location,
                as: "location",
              },
            ],
          })

          if (attendanceDetail) {
            const { user, shift, location } = attendanceDetail;
            message = `*Attendance:* ${user?.name ? user?.name : ""} Added ${activity} at ${DateTime.getDateTimeByUserProfileTimezone(activity === "Check Out" ? updated_at : created_at, userDefaultTimeZone)} \n ${location?.name ? `*Location:* ${location?.name}` : ""} , ${shift?.name ? shift?.name : ""}`;
          }

          let mediaUrl = await MediaService.getMediaURL(mediaId, companyId);

          if (message) {
            SlackService.sendSlackChannelMessageWithImage(companyId, channelId, mediaUrl, message);
          }
        }
      }

    } catch (err) {
      console.log(err);
    }
  },

  getAdditionalHour(loginTime, start_time, endTime) {

    try {
      if (loginTime && start_time && endTime) {

        const start_additional_hours = DateTime.formateTime(loginTime) < start_time ? DateTime.getTimeDifference(DateTime.formateTime(loginTime), start_time) : "00:00";

        const end_additional_hours = endTime < DateTime.formateTime(new Date()) ? DateTime.getTimeDifference(endTime, DateTime.formateTime(new Date())) : "00:00";

        const additional_hours = DateTime.sumTimes(start_additional_hours, end_additional_hours);

        return additional_hours;
      }

      return null
    } catch (err) {
      console.log(err);
    }
  },


  async getDashboardData(userId, companyId, timeZone,currendtShiftId) {
    try {
      let totalDays = await this.getAttendanceCount({
        user_id: userId,
        date: {
          [Op.and]: {
            [Op.gte]: DateTime.CurrentStartMonth(),
            [Op.lte]: DateTime.CurrentEndMonth(),
          }
        },
        company_id: companyId
      })
      let where = {};
      where.company_id = companyId && companyId
      where.user_id = userId && userId
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.formatDate(new Date(), DateTime.getVariable().shortMonthDate),
          [Op.lte]: DateTime.formatDate(new Date(), DateTime.getVariable().shortMonthDate),
        },
      }
      if(Number.isNotNull(currendtShiftId)){
        where.shift_id = currendtShiftId
      }
      let todayAttendance = await Attendance.findAll({where})
      const todayAttendanceData = todayAttendance.map(attendance => {
        const data = {
          ...attendance.dataValues,
          login: DateTime.getUserTimeZoneTime(attendance.dataValues.login, timeZone),
          logout: attendance.dataValues.logout ? DateTime.getUserTimeZoneTime(attendance.dataValues.logout, timeZone) : null,
        };
        return data;
      });

      return {
        todayAttendance: todayAttendanceData,
        additionalDay: totalDays.AdditionalDays,
        workedDay: totalDays.workedDays,
        Leave: totalDays.Leave,

      }

    } catch (err) {
      console.log(err);
    }
  },

  async findOne(query) {
    try {
      let attendanceDetail = await Attendance.findOne(query);
      return attendanceDetail
    } catch (err) {
      console.log(err);
    }
  },

  async findAll(query) {
    try {
      let attendanceDetail = await Attendance.findAll(query);
      return attendanceDetail
    } catch (err) {
      console.log(err);
    }
  },
  async get(attendanceId, companyId) {
    try {
      let attendanceDetail = await Attendance.findOne({ where: { id: attendanceId, company_id: companyId } });
      return attendanceDetail
    } catch (err) {
      console.log(err);
    }
  },
  async addAbsentRecord(id, date, companyId, working_days, UserEmployment, shiftId, weekDays) {


    try {
      let dayIndex;
      let day;
      let workingDays;
      let attendanceExist;
      if (date) {
        attendanceExist = await Attendance.findOne({
          where: { company_id: companyId, date: date, user_id: id },
          attributes: ["id", "user_id"],
        });

        if (!attendanceExist) {
          date = new Date(date);
          dayIndex = date.getDay();
          day = weekDays[dayIndex-1];
          if (working_days) {
            workingDays = working_days.split(",").filter(Boolean);
            if (workingDays.includes(day)) {
              let userEmploymentdata = await UserEmploymentModel.findOne({ where: { user_id: id } });
              let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true, company_id: companyId})
              let additionalLeaveIds =
                await AttendanceTypeService.getAttendanceTypeId({
                  [Op.or]: [{ is_leave: true }, { is_additional_leave: true }],
                  company_id: companyId,
                 allowed_days: {
                    [Op.iLike]: `%${day}%`,
                  },
                });
              await Attendance.create({
                user_id: id,
                date: DateTime.DateOnly(date),
                shift_id: shiftId,
                type: userEmploymentdata && userEmploymentdata?.leave_balance && userEmploymentdata?.leave_balance > 0
                  ? leaveIds[0]
                  : additionalLeaveIds[0],
                company_id: companyId,
                days_count: userEmploymentdata && userEmploymentdata?.leave_balance && userEmploymentdata?.leave_balance > 0 ? 1 : 2
              }).then(async (attendance) => {
                if (attendance) {
                  // Update leave_balance in UserEmploymentModel
                  await UserEmploymentModel.update(
                    {
                      leave_balance:
                        UserEmployment && userEmploymentdata?.leave_balance && userEmploymentdata?.leave_balance > 0
                          ? userEmploymentdata?.leave_balance - 1
                          : 0,
                    },
                    {
                      where: { user_id: id, company_id: companyId },
                    }
                  );
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.log(err);

    }
  },

  async addMissingAbsentRecord(params, companyId) {

    try {

      let settingArray = [];
      let settingList = await getSettingList(companyId);

      for (let i = 0; i < settingList.length; i++) {
        settingArray.push(settingList[i]);
      }


      let userList = await User.findAll({
        where: { status: Status.ACTIVE, company_id: companyId },
        attributes: ["id", "role"],
        include: [
          {
            required: false,
            model: UserEmploymentModel,
            as: "UserEmployment",
          },
        ],
      });

      let working_days;
      let allowedShiftIds;
      let splitShiftIds;
      let dateValue;
      let holiday;
      let startDate;
      let endDate;
      let allowAdditionalLeave;
      let schedulerDate;
      let employmentDate;
      let result;
      const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      if (userList && userList.length > 0) {
        for (let i = 0; i < userList.length; i++) {
          const { id, role, UserEmployment } = userList[i];

          working_days = await getValueByObject(Setting.USER_WORKING_DAYS, settingArray, role, ObjectName.ROLE);
          allowedShiftIds = await getValueByObject(Setting.ROLE_ALLOWED_SHIFT, settingArray, role, ObjectName.ROLE);
          allowAdditionalLeave = await getValueByObject(Setting.ALLOW_ADDITIONAL_LEAVE_ADD, settingArray, role, ObjectName.ROLE);
          splitShiftIds = allowedShiftIds && allowedShiftIds.split(",");
          startDate = DateTime.isValidDate(params?.startDate) ? new Date(params?.startDate) : new Date()
          endDate = DateTime.isValidDate(params?.endDate) ? new Date(params?.endDate) : new Date()
          schedulerDate = DateTime.getDateInTimeZone(startDate,endDate,params?.timeZone)

          employmentDate = DateTime.getDateInTimeZone(UserEmployment?.start_date?UserEmployment?.start_date:new Date(),UserEmployment?.end_date?UserEmployment?.end_date:new Date(),params?.timeZone)


          result = DateTime.getMostRecentDates(schedulerDate, employmentDate);

          const dates = DateTime.getDateOnlyRange(result?.starDate, result?.endDate);
          if (dates && dates.length > 0) {
            for (let j = 0; j < dates.length; j++) {
              dateValue = DateTime.DateOnly(dates[j]);

              holiday = await Holiday.findOne({
                where: { date: dateValue, company_id: companyId },
              });

              if (splitShiftIds && splitShiftIds.length > 0 && !holiday) {
                for (let index = 0; index < splitShiftIds.length; index++) {
                  let lastIndex = splitShiftIds && splitShiftIds.length - 1;
                  let shift_id = splitShiftIds[lastIndex];

                  if (splitShiftIds && splitShiftIds.length == 1) {
                    await this.addAbsentRecord(
                      id,
                      dateValue,
                      companyId,
                      working_days,
                      UserEmployment,
                      shift_id,
                      weekDays,
                      allowAdditionalLeave
                    );
                  }

                  if (splitShiftIds && splitShiftIds.length > 1) {
                    if (index == lastIndex) {
                      await this.addAbsentRecord(
                        id,
                        dateValue,
                        companyId,
                        working_days,
                        UserEmployment,
                        shift_id,
                        weekDays,
                        allowAdditionalLeave
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

    } catch (err) {
      console.log(err);
    }
  },

  async ApproveLateCheckIn(req, res) {
    try {
      const { attendanceId, approveLateCheckIn } = req.body;
      const companyId = Request.GetCompanyId(req);

      const attendanceDetail = await Attendance.findOne({
        where: { id: attendanceId, company_id: companyId },
      });
      let companyDetail = await getCompanyDetailById(companyId);

      let ownerId = attendanceDetail.user_id;

      const attendanceDate = DateTime.shortMonthDate(attendanceDetail.date);

      if (!attendanceDetail) {
        return res.json(400, { message: "Attendance Not Found" });
      }

      let updateData = {};

      if (approveLateCheckIn) {
        updateData.approve_late_check_in = true;
      }

      // Update the attendance record
      await Attendance.update(updateData, { where: { id: attendanceId, company_id: companyId } });

      res.json(200, { message: "Approved Late Check-In" });

      res.on("finish", async () => {
        /* ✴---Late Hours Slack Notification code---✴ */
        if (approveLateCheckIn) {
          const params = {
            id: attendanceId,
            companyId: companyId,
            companyDetail: companyDetail,
            ownerId: ownerId,
            attendanceDate: attendanceDate
          };
          await this.sendLateCheckInSlackNotification(params);
        }
        History.create("Approved Late Check-In", req, ObjectName.ATTENDANCE, attendanceId);
      });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  },


  async GoalMissing(req, res) {
    try {
      const { attendanceId, allowGoalMissing } = req.body;
      const companyId = Request.GetCompanyId(req);

      const attendanceDetail = await Attendance.findOne({
        where: { id: attendanceId, company_id: companyId },
      });

      let companyDetail = await getCompanyDetailById(companyId);

      let ownerId = attendanceDetail.user_id;

      const attendanceDate = DateTime.shortMonthDate(attendanceDetail.date);

      if (!attendanceDetail) {
        return res.json(400, { message: "Attendance Not Found" });
      }

      let updateData = {};

      if (allowGoalMissing) {
        updateData.allow_goal_missing = true;
      }

      // Update the attendance record
      await Attendance.update(updateData, { where: { id: attendanceId, company_id: companyId } });

      res.json(200, { message: "Goal Missing Updated" });

      res.on("finish", async () => {
        /* ✴---Goal Missing Slack Notification code---✴ */
        if (allowGoalMissing) {
          const params = {
            id: attendanceId,
            companyId: companyId,
            companyDetail: companyDetail,
            ownerId: ownerId,
            attendanceDate: attendanceDate
          };
          await this.sendGoalMissingSlackNotification(params);
        }
        History.create("Goal Missing Updatedd", req, ObjectName.ATTENDANCE, attendanceId);
      });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  },

  async sendGoalMissingSlackNotification(params, allowGoalMissing = true) {
    let { id, companyId, ownerId, attendanceDate } = params;

    try {
      let getSlackId = await UserService.getSlack(ownerId, companyId);

      if (allowGoalMissing && getSlackId) {
        const text = unescape(`<@${getSlackId?.slack_id}> Your ${attendanceDate} Attendance is Approved for Goal Missing`);
        SlackService.sendMessageToUser(companyId, getSlackId?.slack_id, text);
      }
    } catch (err) {
      console.log(err);
    }
  },

  async sendLateCheckInSlackNotification(params, approveLateCheckIn = true) {
    let { id, companyId, ownerId, attendanceDate } = params;

    try {
      let getSlackId = await UserService.getSlack(ownerId, companyId);

      if (approveLateCheckIn && getSlackId) {
        const text = unescape(`<@${getSlackId?.slack_id}> Your ${attendanceDate} Attendance is Approved for Late Hours`);
        SlackService.sendMessageToUser(companyId, getSlackId?.slack_id, text);
      }
    } catch (err) {
      console.log(err);
    }
  },

  AttendanceDelete: async function (ids, req, res) {
    try {
      const companyId = Request.GetCompanyId(req);
      const hasPermission = await Permission.Has(
        Permission.ATTENDANCE_DELETE,
        req
      );


      // If ids is not an array, convert it to an array
      if (!Array.isArray(ids)) {
        ids = [ids];
      }

      const attendances = await Attendance.findAll({
        attributes: ["id", "type", "date"],
        include: [
          {
            required: false,
            model: User,
            as: "user",
          },
          {
            required: false,
            model: Shift,
            as: "shift",
          },
        ],
        where: { id: { [Op.in]: ids }, company_id: companyId },
      });

      if (attendances.length === 0) {
        return res.json(Response.BAD_REQUEST, { message: "Attendance not found" });
      }

      let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true, company_id: companyId})


      // Delete each attendance
      for (const attendance of attendances) {
        await attendance.destroy();
        if (attendance && leaveIds?.includes(attendance?.type)) {
          const UserEmploymentDetail = await UserEmploymentModel.findOne({
            where: {
              user_id: attendance.user.id,
              company_id: companyId,
            },
          });
          if (UserEmploymentDetail) {
            await UserEmploymentDetail.update({
              leave_balance: UserEmploymentDetail.leave_balance + 1,
            });
          }
        }
      }


      // Create system log for each attendance deletion
      for (const attendance of attendances) {
        history.create(
          "Attendance deleted",
          req,
          ObjectName.ATTENDANCE,
          attendance.id
        );
        let slackDetail = await UserService.getSlack(
          attendance.user.id,
          companyId
        );
        if (slackDetail) {
          let text = "";
          if (attendance && attendance.shift && attendance.shift.name) {
            text = unescape(
              `<@${slackDetail.slack_id}> Your ${DateTime.shortMonthDate(
                attendance.date
              )} (${attendance.shift.name}) Attendance Deleted.`
            );
          } else {
            text = unescape(
              `<@${slackDetail.slack_id}> Your ${DateTime.shortMonthDate(
                attendance.date
              )} Attendance Deleted.`
            );
          }
          SlackService.sendMessageToUser(companyId, slackDetail.slack_id, text);
        }
      }
    } catch (err) {
      req.log.error(err);
    }
  },

  addFineForLateCheckIn: async function (lateCheckInParams) {
    let { user_id, late_hours, startTime, gracePeriod, login, timeZone, companyId, location_id, shift_id, req, roleId, object_id } = lateCheckInParams;

    let startTimeValue = DateTime.addMinutesToTime(startTime ? startTime : "00:00", gracePeriod)
    let currentTime = DateTime.getGmtHoursAndMinutes(new Date())
    if (DateTime.isValidDate(startTime)) {
      if (currentTime > startTimeValue) {
        if (late_hours && late_hours > 0) {
          let type = await getSettingValue(Setting.ATTENDANCE_LATE_CHECK_IN_FINE_TYPE, companyId);

          if (Number.isNotNull(type)) {
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: companyId },
            });
            if (Number.isNotNull(tagDetail)) {
              let locationName = await LocationService.getName(location_id, companyId)
              let shiftName = await ShiftService.getName(shift_id, companyId);
              let userDetail = await UserService.get(user_id, companyId)

              let default_amount = late_hours * Number.GetFloat(tagDetail?.default_amount);
              let createData = {
                user: user_id,
                type: type,
                amount: default_amount,
                company_id: companyId,
                notes: `CheckIn At: ${DateTime.getCurrentDateTimeByUserProfileTimezone(login, timeZone)} `,
                object_id:object_id,
                object_name:ObjectName.ATTENDANCE
              };
              let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
              return response
            } else {
              return null
            }
          } else {
            return null
          }
        } else {
          return null
        }

      } else {
        return null
      }

    } else {
      return null
    }

  },

  findAddForNoStockEntry: async function (noStockEntryParams) {
    let { user_id, date, timeZone, shift, store_id, roleId, companyId, req, object_id } = noStockEntryParams;
    let isEnableFineAddForNoStockEntry = await getSettingValueByObject(
      Setting.FINE_ADD_FOR_STOCK_ENTRY,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    if (Number.isNotNull(isEnableFineAddForNoStockEntry) && isEnableFineAddForNoStockEntry == "true") {
      let minimumStockEntryCount = await getSettingValueByObject(
        Setting.STOCK_ENTRY_MINIMUM_COUNT,
        companyId,
        roleId,
        ObjectName.ROLE
      );

      if (Number.isNotNull(minimumStockEntryCount)) {

        let params={
          company_id: companyId,
          user_id: user_id,
          date: date,
          timeZone: timeZone,
          store_id: store_id,
          shift_id: shift?.id,
          manageOthers: false
        }
        let { stockEntryProduct } = await StockEntryProductService.getCount(params)
        if (stockEntryProduct < Number.Get(minimumStockEntryCount)) {
          let stockEntryMissingFineType = await getSettingValue(Setting.STOCK_ENTRY_MISSING_FINE_TYPE, companyId);

          if (Number.isNotNull(stockEntryMissingFineType)) {

            const tagDetail = await Tag.findOne({
              where: { id: stockEntryMissingFineType, company_id: companyId },
            });


            if (Number.isNotNull(tagDetail)) {
              let missingStockEntryProductCount = Number.Get(minimumStockEntryCount) - stockEntryProduct;

              let default_amount = missingStockEntryProductCount  * Number.GetFloat(tagDetail?.default_amount);
              let createData = {
                user: user_id,
                type: stockEntryMissingFineType,
                amount: default_amount,
                company_id: companyId,
                notes: ` Date: ${DateTime.shortMonthDate(new Date(date))} \n Shift: ${shift?.name} \n Stock Entry Count: ${stockEntryProduct} \n Missing Stock Entry Count: ${missingStockEntryProductCount} `,
                object_id: object_id,
                object_name:ObjectName.STOCK_ENTRY
              };
              let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
              return {
                fineAmount: response?.amount,
                stockEntryCount: stockEntryProduct,
                missingStockEntryCount: missingStockEntryProductCount
              }
            }else{
              return null
            }
          } else {
            return null
          }
        }else{
          return null
        }
      }else{
        return null
      }

    }else{
      return null
    }
  },

  findAddForMinimumReplenishmentCount: async function (replenishmentMissingParams) {
    let { user_id, date, shift, roleId, companyId, req, object_id } = replenishmentMissingParams;

    let isEnableFineAddForMinimumReplenishmentCount = await getSettingValueByObject(Setting.FINE_ADD_FOR_REPLENISHMENT_MISSING, companyId, roleId, ObjectName.ROLE);
    if (Number.isNotNull(isEnableFineAddForMinimumReplenishmentCount) && isEnableFineAddForMinimumReplenishmentCount == "true") {

      let minimumReplenishmentProducts = await getSettingValueByObject(Setting.MINIMUM_REPLENISH_PRODUCTS, companyId, roleId, ObjectName.ROLE);

      let params = {
        user: user_id,
        company_id: companyId,
        date: new Date(date),
      };
      let data = await TransferProductReportService.getTransferProductCount(params);
      if (Number.isNotNull(minimumReplenishmentProducts) && data?.totalProductCount < Number.Get(minimumReplenishmentProducts)) {
        let replenishmentCountFineType = await getSettingValue(Setting.REPLENISHMENT_MISSING_FINE_TYPE, companyId);

        if (Number.isNotNull(replenishmentCountFineType)) {

          const tagDetail = await Tag.findOne({
            where: { id: replenishmentCountFineType, company_id: companyId },
          });

          if (Number.isNotNull(tagDetail)) {
            let minusReplenishmentCount = Number.Get(minimumReplenishmentProducts) - data?.totalProductCount;
            let default_amount = minusReplenishmentCount  * Number.GetFloat(tagDetail?.default_amount);
            let createData = {
              user: user_id,
              type: replenishmentCountFineType,
              amount: default_amount,
              company_id: companyId,
              notes: ` Date: ${DateTime.shortMonthDate(new Date(date))} \n Shift: ${shift?.name} \n Replenishment Count: ${data?.totalProductCount} \n Missing Replenishment Count: ${minusReplenishmentCount} `,
              object_id:object_id,
              object_name:ObjectName.ATTENDANCE
            };
            let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
            if(response){
              let isEnableReplenishmentMissingFineEnquiryTicket = await getSettingValueByObject(
                Setting.ENQUIRY_TICKET_CREATE_FOR_REPLENISHMENT_MISSING,
                companyId,
                roleId,
                ObjectName.ROLE
              );

              if(isEnableReplenishmentMissingFineEnquiryTicket && isEnableReplenishmentMissingFineEnquiryTicket == "true"){
                let summary = `Replenishment - Date: ${DateTime.shortMonthDate(new Date(date))} - Shift: ${shift?.name} - Replenishment Count: ${data?.totalProductCount} - Missing Replenishment Count: ${minusReplenishmentCount}   `
                let enquiryTicketParams = {
                  req,
                  company_id: companyId,
                  summary,
                  type: Setting.REPLENISHMENT_MISSING_ENQUIRY_TICKET_TYPE
                }
                await attendanceService.createEnquiryTicket(enquiryTicketParams)
              }
            }
            return {
              fineAmount: response?.amount,
              replenishmentCount: data?.totalProductCount,
              missingReplenishmentCount: minusReplenishmentCount
            }
          }else{
            return null
          }
        } else {
          return null
        }
      }else{
        return null
      }
    }else{
      return null
    }
  },
  getAttendanceMonthRecord: async function (userId, page, pageSize, companyId) {
    let whereCondition = "";
    if (companyId) whereCondition += ` a."company_id" = ${companyId}`;
    if (userId) whereCondition += ` AND a."user_id" = ${userId}`;
    
    let query = `
      SELECT 
        TO_CHAR(a.date, 'Month-YYYY') AS month_year,           
        SUM(CASE WHEN at.is_leave = TRUE THEN 1 ELSE 0 END) AS leave_count,  
        SUM(CASE WHEN at.is_working_day = TRUE THEN 1 ELSE 0 END) AS working_day_count,  
        SUM(CASE WHEN at.is_additional_day = TRUE THEN 1 ELSE 0 END) AS additional_day_count,  
        SUM(a.additional_hours) AS total_additional_hours,    
        MAX(a.date) AS max_date                                
      FROM 
        Attendance AS a
      LEFT JOIN 
        attendance_type AS at ON a.type = at.id
      WHERE 
        ${whereCondition} AND a.deleted_at IS NULL
      GROUP BY 
        TO_CHAR(a.date, 'Month-YYYY')                        
      ORDER BY 
        MAX(a.date) DESC                                       
      LIMIT 
        ${pageSize} OFFSET ${(page - 1) * pageSize};           
    `;
    
    // Execute the query
    let queryDatas = await db.connection.query(query);    
    let queryDataList = queryDatas && queryDatas[0];
  
    let ArryValue = [];
    let total_days_count = 0;
    let additional_day_and_leave_count_addition = 0;
    let working_and_additional_hours_addition = 0;
  
    if (Array.isArray(queryDataList)) {
      for (let i = 0; i < queryDataList.length; i++) {
        const queryDataValue = queryDataList[i];
  
        working_and_additional_hours_addition = Number.GetFloat(queryDataValue?.working_day_count || 0) +  
          Number.GetFloat(DateTime.convertMinutesToHoursAndDivide(Number.Get(queryDataValue?.total_additional_hours), 8) || 0);
  
        additional_day_and_leave_count_addition = Number.GetFloat(queryDataValue?.additional_day_count || 0) + 
          Number.GetFloat(queryDataValue?.leave_count || 0);
  
        total_days_count = working_and_additional_hours_addition + additional_day_and_leave_count_addition;
  
        ArryValue.push({
          ...queryDataValue,
          total_additional_hours: Number.isNotNull(queryDataValue?.total_additional_hours) 
            ? DateTime.HoursAndMinutes(Number.Get(queryDataValue?.total_additional_hours)) 
            : 0,
          over_time_days: DateTime.convertMinutesToHoursAndDivide(Number.Get(queryDataValue?.total_additional_hours), 8),
          total_days_count: total_days_count
        });
      }
    }
  
    return {
      data: ArryValue,
      totalCount: queryDatas[1]?.rowCount
    };
  },

  

  monthRecord: async function (req, res, next) {

    try {


      let {
        page,
        pageSize,
        search,
        sort,
        sortDir,
        user
      } = req.query;
      let companyId = Request.GetCompanyId(req);
      let userId = Request.getUserId(req);

      const manageOthers = await Permission.GetValueByName(
        Permission.ATTENDANCE_MANAGE_OTHERS,
        req.role_permission
      );


      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        throw { message: "Invalid page" };
      }

      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        throw { message: "Invalid page size" };
      }

      const validOrder = ["ASC", "DESC"];
      const sortableFields = {
        id: "id",
        createdAt: "createdAt",
      };

      const sortParam = sort || "createdAt";
      if (!Object.keys(sortableFields).includes(sortParam)) {
        throw { message: `Unable to sort Attendance by ${sortParam}` };
      }

      const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
      if (!validOrder.includes(sortDirParam)) {
        throw { message: "Invalid sort order" };
      }

      let where = {}

      if(manageOthers){
        if(Number.isNotNull(user)){
          where.id = user
        }else{
          where.id = userId
        }
      }else{
        where.id = userId
      }


      let totalRowCount = 0;
      let attendanceData = []
      let userList = await UserService.list(companyId, where);
      if (ArrayList.isArray(userList)) {
        for (let i = 0; i < userList.length; i++) {
          let { data, totalCount } = await this.getAttendanceMonthRecord(userList[i]?.id, page,pageSize, companyId);
          totalRowCount = totalCount
          attendanceData.push(data)
        }
      }
      res.json(200, {
        totalCount: totalRowCount,
        currentPage: page,
        pageSize,
        data: attendanceData && attendanceData[0],
        sort,
        sortDir,
        search,
      })
    } catch (error) {
      console.log(error)
    }

  },


  //Early Check-In Bonus Add
  addBonusForEarlyCheckIn: async function (user_id, additional_hours, startTime, gracePeriod, roleId, login, timeZone, companyId) {

    let startTimeValue = DateTime.addMinutesToTime(startTime ? startTime : "00:00", gracePeriod)
    let currentTime = DateTime.getGmtHoursAndMinutes(new Date())
    if (DateTime.isValidDate(startTime)) {
      if (currentTime < startTimeValue) {

        if (additional_hours && additional_hours > 0) {

          let type = await getSettingValue(Setting.ATTENDANCE_EARLY_CHECK_IN_BONUS_TYPE, companyId);

          if (Number.isNotNull(type)) {

            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: companyId },
            });
            if (Number.isNotNull(tagDetail)) {
              let default_amount = additional_hours * Number.GetFloat(tagDetail?.default_amount);
              let createData = {
                user: user_id,
                type: type,
                amount: default_amount,
                company_id: companyId,
                notes: `CheckIn At: ${DateTime.getCurrentDateTimeByUserProfileTimezone(login, timeZone)} `,
                objectName: ObjectName.BONUS,
              };
              let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
              return response
            } else {
              return null
            }
          } else {
            return null
          }
        } else {
          return null
        }
      } else {
        return null
      }

    } else {
      return null
    }

  },

  bonusAddForExtraStockEntry: async function (user_id, date, timeZone, shift, store_id, roleId, companyId, attendanceId) {
    let isEnableBonusAddForExtraStockEntry = await getSettingValueByObject(
      Setting.BONUS_ADD_FOR_EXTRA_STOCK_ENTRY,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    if (Number.isNotNull(isEnableBonusAddForExtraStockEntry) && isEnableBonusAddForExtraStockEntry == "true") {
      let minimumStockEntryCount = await getSettingValueByObject(
        Setting.STOCK_ENTRY_MINIMUM_COUNT,
        companyId,
        roleId,
        ObjectName.ROLE
      );

       if (Number.isNotNull(minimumStockEntryCount)) {

      let params={
        company_id: companyId,
        user_id: user_id,
        date: date,
        timeZone: timeZone,
        store_id: store_id,
        shift_id: shift?.id,
        manageOthers: false
      }
      let { stockEntryProduct } = await StockEntryProductService.getCount(params);

       if (stockEntryProduct > Number.Get(minimumStockEntryCount)) {
      let stockEntryExtraBonusType = await getSettingValue(Setting.STOCK_ENTRY_EXTRA_BONUS_TYPE, companyId);

      if (Number.isNotNull(stockEntryExtraBonusType)) {

        const tagDetail = await Tag.findOne({
          where: { id: stockEntryExtraBonusType, company_id: companyId },
        });


        if (Number.isNotNull(tagDetail)) {
          let extraStockEntryProductCount = stockEntryProduct - Number.Get(minimumStockEntryCount);

          let default_amount = extraStockEntryProductCount  * Number.GetFloat(tagDetail?.default_amount);
          let createData = {
            user: user_id,
            type: stockEntryExtraBonusType,
            amount: default_amount,
            company_id: companyId,
            notes: ` Date: ${DateTime.shortMonthDate(new Date(date))} \n Shift: ${shift?.name} \n Stock Entry Count: ${stockEntryProduct} \n Extra Stock Entry Count: ${extraStockEntryProductCount} `,
            objectName: ObjectName.BONUS,
            object_id:attendanceId,
            object_name:ObjectName.STOCK_ENTRY
          };
          let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
          return {
            bonusAmount: response?.amount,
            stockEntryCount: stockEntryProduct,
            extraStockEntryCount: extraStockEntryProductCount
          }
        } else {
          return null
        }
      } else {
        return null
      }
      }else{
        return null
      }
      }else{
        return null
      }

    }else{
      return null
    }
  },

  bonusAddForExtraReplenishmentCount: async function (user_id, date, shift, roleId, companyId, attendanceId) {


    let isEnableBonusAddForExtraReplenishmentCount = await getSettingValueByObject(Setting.BONUS_ADD_FOR_EXTRA_REPLENISHMENT, companyId, roleId, ObjectName.ROLE);
    if (Number.isNotNull(isEnableBonusAddForExtraReplenishmentCount) && isEnableBonusAddForExtraReplenishmentCount == "true") {

      let minimumReplenishmentProducts = await getSettingValueByObject(Setting.MINIMUM_REPLENISH_PRODUCTS, companyId, roleId, ObjectName.ROLE);

      let params = {
        user: user_id,
        company_id: companyId,
        date: new Date(date),
      };
      let data = await TransferProductReportService.getTransferProductCount(params);
      if (Number.isNotNull(minimumReplenishmentProducts) && data?.totalProductCount > Number.Get(minimumReplenishmentProducts)) {
        let replenishmentExtraCountBonusType = await getSettingValue(Setting.REPLENISHMENT_EXTRA_BONUS_TYPE, companyId);

        if (Number.isNotNull(replenishmentExtraCountBonusType)) {

          const tagDetail = await Tag.findOne({
            where: { id: replenishmentExtraCountBonusType, company_id: companyId },
          });

          if (Number.isNotNull(tagDetail)) {
            let extraReplenishmentCount = data?.totalProductCount - Number.Get(minimumReplenishmentProducts);
            let default_amount = extraReplenishmentCount  * Number.GetFloat(tagDetail?.default_amount);
            let createData = {
              user: user_id,
              type: replenishmentExtraCountBonusType,
              amount: default_amount,
              company_id: companyId,
              notes: ` Date: ${DateTime.shortMonthDate(new Date(date))} \n Shift: ${shift?.name} \n Replenishment Count: ${data?.totalProductCount} \n Extra Replenishment Count: ${extraReplenishmentCount} `,
              objectName: ObjectName.BONUS,
              object_id:attendanceId,
            };
            let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
            return {
              bonusAmount: response?.amount,
              replenishmentCount: data?.totalProductCount,
              extraReplenishmentCount: extraReplenishmentCount
            }
          }else{
            return null
          }
        } else {
          return null
        }
      }else{
        return null
      }
    }else{
      return null
    }
  },

  //Early Check-In Bonus Add
  addBonusForAdditionalHours: async function (user_id, additional_hours, endTime, roleId, timeZone, companyId, attendanceId) {

    let endTimeValue = DateTime.addMinutesToTime(endTime ? endTime : "00:00")
    let currentTime = DateTime.getGmtHoursAndMinutes(new Date())
    if (DateTime.isValidDate(endTime)) {
      if (currentTime > endTimeValue) {
        let isEnableBonusAddForEarlyCheckIn = await getSettingValueByObject(
          Setting.BONUS_ADD_FOR_ATTENDANCE_EARLY_CHECKIN,
          companyId,
          roleId,
          ObjectName.ROLE
        );
        if ((Number.isNotNull(isEnableBonusAddForEarlyCheckIn) && isEnableBonusAddForEarlyCheckIn == "true")) {
          if (additional_hours && additional_hours > 0) {

            let type = await getSettingValue(Setting.ATTENDANCE_EARLY_CHECK_IN_BONUS_TYPE, companyId);

            if (Number.isNotNull(type)) {

              const tagDetail = await Tag.findOne({
                where: { id: type, company_id: companyId },
              });
              if (Number.isNotNull(tagDetail)) {
                let default_amount = additional_hours * Number.GetFloat(tagDetail?.default_amount);
                let createData = {
                  user: user_id,
                  type: type,
                  amount: default_amount,
                  company_id: companyId,
                  notes: `CheckOut At: ${DateTime.getCurrentDateTimeByUserProfileTimezone(new Date(), timeZone)} `,
                  objectName: ObjectName.BONUS,
                  object_id:attendanceId,
                  object_name:ObjectName.ATTENDANCE
                };
                let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
                return response
              } else {
                return null
              }
            } else {
              return null
            }
          } else {
            return null
          }
        } else {
          return null
        }
      } else {
        return null
      }

    } else {
      return null
    }

  },

  addFineForEarlyCheckOut: async function (earlyCheckOutParams) {
    let { attendanceDetail, roleId, timeZone, companyId, early_hours, user_id,req, object_id } = earlyCheckOutParams
    let currentTime = DateTime.getCurrentTimeByTimeZone(timeZone);
    let shiftEndTime = DateTime.convertGmtTimeToUserTimeZone(attendanceDetail?.shift?.end_time, timeZone);
    if (Number.isNotNull(attendanceDetail?.allow_early_checkout)) {

      if (currentTime < shiftEndTime) {

        let isEnableEarlyCheckOutFineAdd = await getSettingValueByObject(
          Setting.FINE_ADD_FOR_EARLY_ATTENDANCE_CHECK_OUT,
          companyId,
          roleId,
          ObjectName.ROLE
        );
        if ((Number.isNotNull(isEnableEarlyCheckOutFineAdd) && isEnableEarlyCheckOutFineAdd == "true")) {

          let type = await getSettingValue(Setting.ATTENDANCE_EARLY_CHECK_OUT_FINE_TYPE, companyId);
          const tagDetail = await Tag.findOne({
            where: { id: type, company_id: companyId },
          });
          if (Number.isNotNull(tagDetail)) {
            let default_amount = early_hours * Number.GetFloat(tagDetail?.default_amount);
            let createData = {
              user: user_id,
              type: type,
              amount: default_amount,
              company_id: companyId,
              notes: `CheckOut At: ${DateTime.getCurrentDateTimeByUserProfileTimezone(new Date(), timeZone)} `,
              object_id:object_id,
              object_name:ObjectName.ATTENDANCE
            };
            let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
            if(response){
              let isEnableEarlyCheckOutFineEnquiryTicket = await getSettingValueByObject(
                Setting.ENQUIRY_TICKET_CREATE_FOR_EARLY_CHECK_OUT,
                companyId,
                roleId,
                ObjectName.ROLE
              );

              if(isEnableEarlyCheckOutFineEnquiryTicket && isEnableEarlyCheckOutFineEnquiryTicket == "true"){
                let locationName = await LocationService.getName(attendanceDetail?.store_id, companyId)
                let shiftName = await ShiftService.getName(attendanceDetail?.shift_id, companyId)
                let userDetail = await UserService.get(attendanceDetail?.user_id, companyId)
                let summary = `Attendance - Early Checkout - ${DateTime.getCurrentDateTimeByUserProfileTimezone(new Date(), timeZone)} - ${shiftName} - ${locationName} - ${String.concatName(userDetail?.name,userDetail?.last_name)}  `
                let enquiryTicketParams = {
                  req,
                  company_id: companyId,
                  summary,
                  type: Setting.ATTENDANCE_EARLY_CHECK_OUT_ENQUIRY_TICKET_TYPE
                }
                await attendanceService.createEnquiryTicket(enquiryTicketParams)
              }
            }
            return {
              fineAmount: Currency.IndianFormat(response?.amount),
            }
          } else {
            return null
          }

        } else {
          return null
        }

      } else {
        return null
      }
    } else {
      return null
    }
  },

  addBonusForLateCheckOut: async function (user_id, endTime, lateCheckOutHours, timeZone, companyId,logoutTime,startDate,endDate,attendanceId) {
    let endTimeValue = DateTime.addMinutesToTime(endTime ? endTime : "00:00")
    let currentTime = DateTime.getGmtHoursAndMinutes(logoutTime)
    if (DateTime.isValidDate(endTime)) {
      if (endTimeValue < currentTime) {
        if (lateCheckOutHours && lateCheckOutHours > 0) {
          let type = await getSettingValue(Setting.ATTENDANCE_LATE_CHECK_OUT_BONUS_TYPE, companyId);
          if (Number.isNotNull(type)) {

            const isFineExites = await FineBonus.findOne({
              where: {
                  user: user_id ,
                   type: type,
                    company_id:companyId,
                    date: {
                      [Op.and]: {
                        [Op.gte]: DateTime.toGMT(startDate,timeZone),
                        [Op.lte]: DateTime.toGMT(endDate,timeZone),
                      },
                    },
                  },
          });

          if(!isFineExites){
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: companyId },
            });
            
            if (Number.isNotNull(tagDetail)) {
              let default_amount = lateCheckOutHours * Number.GetFloat(tagDetail?.default_amount);
              let createData = {
                user: user_id,
                type: type,
                amount: default_amount,
                company_id: companyId,
                notes: `CheckOut At: ${DateTime.getCurrentDateTimeByUserProfileTimezone(logoutTime, timeZone)} `,
                objectName: ObjectName.BONUS,
                date: startDate,
                createdAt: logoutTime,
                object_id:attendanceId,
                object_name:ObjectName.ATTENDANCE
              };
              let response = await fineService.create({ body: createData, user: { id: user_id, company_id: companyId } }, null, null);
              return {
                bonusAmount: Currency.IndianFormat(response?.amount),
              }
            } else {
              return null
            }
          }
          } else {
            return null
          }
        } else {
          return null
        }

      } else {
        return null
      }

    } else {
      return null
    }

  },

  createEnquiryTicket : async function (params)  {
    let { req, company_id, summary, type } = params;
    try {
      let reporterId = Request.getUserId(req);
      let defaultType = await getSettingValue(type, company_id);
      let ticketTypeData = await ProjectTicketType.findOne({
        where: { id: defaultType, company_id: company_id },
        attributes: ["project_id", "id", "name"],
        include: [
          {
            required: false,
            model: StatusModel,
            as: "statusDetail",
            order: [["sort_order", "ASC"]]
          },
        ]
      });

      req.body = {
        projectId: ticketTypeData?.project_id,
        summary: summary,
        assignee_id: ticketTypeData?.statusDetail?.default_owner,
        type_id: defaultType,
        due_date: new Date(),
        ticket_date: new Date(),
        reporter_id: reporterId
      };
      let data = await TicketService.create(req);

      if (data?.historyMessage && data?.historyMessage.length > 0) {
        let message = data?.historyMessage.join();
        await History.create(`Created with the following: ${message}`, req, ObjectName.TICKET, data?.ticketDetails?.id);
      } else {
        await History.create("Ticket Added", req, ObjectName.TICKET, data?.ticketDetails?.id);
      }

      await TicketService.reindex(data?.ticketDetails?.id, company_id);

    } catch (error) {
      console.log(error);
    }
  },

  AddFineForCheckoutMissing: async function (params) {
    let { company_id, startDate, endDate } = params;

    if (!company_id) {
      throw { message: "CompanyId is Required" }
    }
    
    let checkoutMissingFineType = await getSettingValue(Setting.ATTENDANCE_CHECKOUT_MISSING_FINE_TYPE, company_id);
    let where = {};

    where.company_id = company_id

    where.login = {
      [Op.ne]: null
    }
    where.logout = {
      [Op.eq]: null
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }

    let include = [
      {
        required: false,
        model: Shift,
        as: "shift",
      },
      {
        required: false,
        model: Location,
        as: "location",
      },
    ]
    const tagDetail = await Tag.findOne({
      where: { id: checkoutMissingFineType, company_id: company_id },
    });

    const isAlreadyFineRecordExits = async (params) => {
      let { company_id, object_id, object_name } = params;
      let where = {}
      where.company_id = company_id
      where.object_id = object_id
      where.object_name = object_name

      let fineDetail = await FineBonus.findOne({ where: where });
      return fineDetail;
    }

    if (Number.isNotNull(checkoutMissingFineType)) {
      let attendanceList = await Attendance.findAll({ where: where, include })

      if (ArrayList.isArray(attendanceList)) {
        for (let i = 0; i < attendanceList.length; i++) {
          const attendanceDetail = attendanceList[i];

          let isRecordAlreadyExits = await isAlreadyFineRecordExits({ company_id, object_name: ObjectName.ATTENDANCE, object_id: attendanceDetail?.id });
          if (!isRecordAlreadyExits) {
            if (Number.isNotNull(tagDetail)) {
              let default_amount = Number.GetFloat(tagDetail?.default_amount);
              let createData = {
                user: attendanceDetail?.user_id,
                type: checkoutMissingFineType,
                amount: default_amount,
                company_id: company_id,
                object_name: ObjectName.ATTENDANCE,
                object_id: attendanceDetail?.id,
                date: attendanceDetail?.date,
                notes: ` Date: ${DateTime.shortMonthDate(new Date(attendanceDetail?.date))} \n Shift: ${attendanceDetail?.shift?.name} \n Location: ${attendanceDetail?.location?.name} \n Fine Amount: ${Currency.IndianFormat(default_amount)} `
              };
              await fineService.create({ body: createData, user: { id: attendanceDetail?.user_id, company_id: company_id } }, null, null);
            }
          }
        }

      }
    }
  },

  leaveValidation: async function (req, res, next) {
    let companyId = Request.GetCompanyId(req);
    let userId = Request.getUserId(req);

    let preferredLocation = await PreferredLocationService.getFirstRecord(companyId, userId)
    if (Number.isNotNull(req?.user?.allow_leave)) {
      res.json(Response.OK, { message: "Leave Approval Enabled", data:{shift_id: preferredLocation?.shift_id, location_id: preferredLocation?.location_id}, isLeave:true })
    } else {
      res.json(Response.OK, { message: "Get Your Manager Approval", data:{shift_id: preferredLocation?.shift_id, location_id: preferredLocation?.location_id}, isLeave:false })
    }
  }
});
