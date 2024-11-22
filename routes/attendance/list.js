const errors = require("restify-errors");
const { sequelize, models } = require("../../db");
const utils = require("../../lib/utils");
const { Attendance, User, Shift, Location, Media, attendanceType } = models;
const process = require("./process");
const Request = require("../../lib/request");
const { Op, Sequelize, fn, col } = require("sequelize");
const Permission = require("../../helpers/Permission");
const Number = require("../../lib/Number");
const validator = require("../../lib/validator")
const AttendanceService = require("../../services/AttendanceService")



const DateTime = require("../../lib/dateTime");
const { isExistById } = require("../../services/LocationService");
const Boolean = require("../../lib/Boolean");

async function list(req, res, next) {
  const data = req.query;
  let { pagination } = req.query;

  const validOrder = ["ASC", "DESC"];
  const sortableFields = {
    id: "Attendance.id",
    user_id: "user_id",
    name: "name",
    login: "Attendance.login",
    logout: "Attendance.logout",
    workedHours: "timeDiff",
    notWorkedHours: "Attendance.not_worked_hours",
    productiveHours: "Attendance.productive_hours",
    nonProductiveHours: "Attendance.non_productive_hours",
    additionalHours: "Attendance.additional_hours",
    lateHours: "Attendance.late_hours",
    notes: "Attendance.notes",
    shift: "shift",
    workedHour: "Attendance.worked_hours",
    ipAddress: "Attendance.ip_address",
    typeText: "Attendance.type",
    status: "Attendance.status",
    activityStatus: "Attendance.activity_status",
    lateHoursStatus: "Attendance.late_hours_status",
    date: "date",
    lopHours: "Attendance.lop_hours",
    productiveCost: "Attendance.productive_cost",
    nonProductiveCost: "Attendance.non_productive_cost",
    typeName: "FIELD(type, 4, 2, 5, 3, 1)",
    created_at: "Attendance.created_at",
    location: "location",
    type: "type"
  };
  const sort = data.sort || "date";
  if (!Object.keys(sortableFields).includes(sort)) {
    return next(
      new errors.BadRequestError(`Unable to sort attendance by ${sort}`)
    );
  }
  const sortDir = data.sortDir || "DESC";
  if (!validOrder.includes(sortDir)) {
    return next(new errors.BadRequestError("Invalid sort order"));
  }
  const page = data.page ? parseInt(data.page, 10) : 1;
  if (isNaN(page)) {
    return next(new errors.BadRequestError("Invalid page"));
  }
  const pageSize = data.pageSize ? parseInt(data.pageSize, 10) : 25;
  if (isNaN(pageSize)) {
    return next(new errors.BadRequestError("Invalid page size"));
  }
  const companyId = Request.GetCompanyId(req);
  const timeZone = Request.getTimeZone(req);

  const attendanceDate = data?.selectedDate || data?.date
  let date = DateTime.getCustomDateTime(attendanceDate, timeZone)

  let FilteredDate
  if (data?.monthYear) {
    FilteredDate = DateTime.getCustomMonthStartEndDateTime(data?.monthYear, timeZone)
  }


  const attendanceWhereCondition = {};

  const userWhere = {};
  const hasPermission = await Permission.Has(Permission.ATTENDANCE_MANAGE_OTHERS, req);

  if (!hasPermission) {
    let userId = req && req.user && req.user.id;
    if (userId) {
      attendanceWhereCondition.user_id = userId;
    }
  }

  const type = data.type;
  if (type) {
    attendanceWhereCondition.type = (type);
  }

  const role = data.role;
  if (role) {
    userWhere.role = role;
  }

  const user = data.user;
  if (hasPermission) {
    if (user) {
      attendanceWhereCondition.user_id = Number.Get(user);
    }
  }

  const location = data.location;
  if (location) {
    attendanceWhereCondition.store_id = Number.Get(location);
  }

  const shift = data.shift;
  if (shift) {
    attendanceWhereCondition.shift_id = Number.Get(shift);
  }

  const status = data.status;
  if (status) {
    attendanceWhereCondition.status = status;
  }

  attendanceWhereCondition.company_id = companyId;

  const activityStatus = data.activityStatus;
  if (activityStatus) {
    attendanceWhereCondition.activity_status = activityStatus;
  }
  if (data.date) {
    attendanceWhereCondition.date = data.date;
  }
  if (data?.monthYear && FilteredDate) {
    attendanceWhereCondition.date = {
      [Op.and]: {
        [Op.gte]: FilteredDate?.startDate,
        [Op.lte]: FilteredDate?.endDate,
      },
    };
  }

  if (attendanceDate && date) {
    attendanceWhereCondition.date = {
      [Op.and]: {
        [Op.gte]: date?.startDate,
        [Op.lte]: date?.endDate,
      },
    };

  }
  const endDate = data.endDate;
  const startDate = data.startDate;
  if (startDate && !endDate) {
    attendanceWhereCondition.date = {
      [Op.and]: {
        [Op.gte]: startDate,
      },
    };
  }
  if (endDate && !startDate) {
    attendanceWhereCondition.date = {
      [Op.and]: {
        [Op.lte]: endDate,
      },
    };
  }

  if (startDate && endDate) {
    attendanceWhereCondition.date = {
      [Op.and]: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
  }

  const searchTerm = data?.search ? data?.search.trim() : ""
  if (searchTerm) {
    userWhere[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${searchTerm}%`,
        },

      },
    ];

  }

  const lateHoursStatus = data.lateHoursStatus;
  if (lateHoursStatus) {
    attendanceWhereCondition.late_hours_status = lateHoursStatus;
  }
  const upcoming = data.upcoming;
  if (upcoming) {
    attendanceWhereCondition.date = { $gte: utils.mySQLFormatDate() };
  }

  let order = [];
  if (sort === "name") {
    order.push([{ model: User, as: "user" }, "name", sortDir]);
  } else if (sort === "location") {
    order.push([{ model: Location, as: "location" }, "name", sortDir]);
  } else if (sort === "login") {
    order.push([fn("TO_CHAR", col(`"Attendance.${sort}"`), "HH24:MI:SS"), sortDir]);
  } else if (sort === "logout") {
    order.push([fn("TO_CHAR", col(`"Attendance.${sort}"`), "HH24:MI:SS"), sortDir]);
  } else {
    order.push([[sort, sortDir]]);
  }
  const query = {
    attributes: [
      "id",
      "user_id",
      "date",
      "login",
      "logout",
      "late_hours",
      "late_hours_status",
      "status",
      "notes",
      "activity_status",
      "ip_address",
      "type",
      "not_worked_hours",
      "additional_hours",
      "worked_hours",
      "productive_hours",
      "non_productive_hours",
      "productive_cost",
      "non_productive_cost",
      "lop_hours",
      "store_id",
      "shift_id",
      "company_id",
      "allow_early_checkout",
      "allow_goal_missing",
      "approve_late_check_in",
      "check_in_media_id",
      "days_count",
      'created_at',
      "company_id"],

    include: [
      {
        required: true,
        model: User,
        as: "user",
        attributes: ["name", "last_name", "media_url"],
        where: userWhere,

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
      {
        required: false,
        model: Media,
        as: "media",
      },
      {
        required: false,
        model: attendanceType,
        as: "attendanceTypeDetail",
      },
    ],
    order,
    where: attendanceWhereCondition,
  };

  if (validator.isEmpty(pagination)) {
    pagination = true;
  }

  if (Boolean.isTrue(pagination)) {
    if (pageSize > 0) {
      query.limit = pageSize;
      query.offset = (page - 1) * pageSize;
    }
  }

  Attendance.findAndCountAll(query)
    .then(async (attendance) => {
      const count = attendance.count;
      const attendanceList = [];
      let totalProductiveHours = 0;
      let totalNonProductiveHours = 0;
      let totalHours = 0;
      let totalLopHours = 0;

      if (count > 0) {


        let attendanceData = attendance && attendance.rows;

        if (attendanceData && attendanceData.length > 0) {

          for (let i = 0; i < attendanceData.length; i++) {

            const { store_id, user_id, productive_hours, non_productive_hours, late_hours, lop_hours, created_at , status} = attendanceData[i];

            if (store_id) {
              let locationDetails = await isExistById(store_id)
              if (locationDetails) {
                attendanceData[i].location_name = await locationDetails?.name;
              }
            }
            if (user_id) {
              let userDetails = await isExistById(user_id);
              if (userDetails) {
                attendanceData[i].user_name = await userDetails?.name;
              }
            }

            let attendanceObject = await process(attendanceData[i]);

            if (created_at) {
              attendanceObject.created_at = DateTime.getDateTimeByUserProfileTimezone(attendanceData[i].created_at, timeZone);
            }
            
            if (status) {
              attendanceObject.status = attendanceData[i].status;
            }

            attendanceList.push(attendanceObject);

            totalProductiveHours += productive_hours;
            totalNonProductiveHours += non_productive_hours;
            totalHours += late_hours;
            totalLopHours += lop_hours;

          }
        }
      }
      let totalDays = await AttendanceService.getAttendanceCount(attendanceWhereCondition)

      const { lastPage, pageStart, pageEnd } = utils.getPageDetails(
        attendance.count,
        page,
        pageSize,
        pagination,
        attendanceList.length
      );
      res.json({
        totalCount: count,
        pageSize,
        count,
        currentPage: page,
        lastPage,
        totalProductiveHours:
          DateTime.covertToHoursAndMinutes(totalProductiveHours),
        totalNonProductiveHours: DateTime.covertToHoursAndMinutes(
          totalNonProductiveHours
        ),
        totalLopHours: DateTime.covertToHoursAndMinutes(totalLopHours),
        totalHours: DateTime.covertToHoursAndMinutes(totalHours),
        additionalDay: totalDays.AdditionalDays,
        workedDay: totalDays.workedDays,
        Leave: totalDays.Leave,
        data: attendanceList,
        pageEnd,
        pageStart,
      });
    })
    .catch((err) => {
      req.log.error(err);
      next(err);
    });
}
module.exports = list;