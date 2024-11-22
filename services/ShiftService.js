
const { Shift, UserRole } = require("../db").models;

const ObjectName = require("../helpers/ObjectName");
const Setting = require("../helpers/Setting");
const DataBaseService = require("../lib/dataBaseService");
const { getSettingValueByObject } = require("../services/SettingService");

const shiftService = new DataBaseService(Shift);
const SettingService = require("../services/SettingService");

const { defaultDateFormat } = require("../lib/utils");

const { Op } = require("sequelize");
const DateTime = require("../lib/dateTime");
const Time = require("../lib/time");
const History = require("./HistoryService");
const AttendanceService = require("./AttendanceService");
const UserService = require("./UserService");
const { isKeyAvailable } = require("../lib/validator");
const ShiftStatus = require("../helpers/ShiftStatus");
const NumberFunction = require("../lib/Number");

class ShiftService {

  static async isNameExist(name, companyId) {
    try {
      if (!name) {
        return null;
      }
      const isNameExist = await shiftService.findOne({
        where: { name: name, company_id: companyId },
      });
      return isNameExist;
    } catch (err) {
      console.log(err);
    }
  }

  static async search(companyId, reqQuery, timeZone) {
    try {
      let { page, pageSize, search, sort, sortDir, pagination, status } = reqQuery;

      // Validate if page is not a number
      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        throw { message: "Invalid page" };
      }

      // Validate if page size is not a number
      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        throw { message: "Invalid page size" };
      }

      const validOrder = ["ASC", "DESC"];
      const sortableFields = {
        id: "id",
        name: "name",
        status: "status",
        start_time: "start_time",
        end_time: "end_time",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      };

      const sortParam = sort || "name";
      // Validate sortable fields is present in sort param
      if (!Object.keys(sortableFields).includes(sortParam)) {
        throw { message: `Unable to sort tag by ${sortParam}` };
      }

      const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
      // Validate order is present in sortDir param
      if (!validOrder.includes(sortDirParam)) {
        throw { message: "Invalid sort order" };
      }

      const where = {};

      where.company_id = companyId;

      if (status) {
        where.status = status
      }

      // Search by term
      const searchTerm = search ? search.trim() : null;
      if (searchTerm) {
        where[Op.or] = [
          {
            name: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }

      const query = {
        order: [[sortParam, sortDirParam]],
        where,
        attributes: { exclude: ["deletedAt"] },
      };

      if (pagination) {
        if (pageSize > 0) {
          query.limit = pageSize;
          query.offset = (page - 1) * pageSize;
        }
      }

      // Get list and count
      let results = await shiftService
        .findAndCount(query)

      const data = [];

      let shiftList = results && results.rows;

      if (shiftList && shiftList.length > 0) {

        for (let i = 0; i < shiftList.length; i++) {
          data.push({
            id: shiftList[i].id,
            name: shiftList[i].name,
            status: shiftList[i].status,
            start_time: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(shiftList[i].start_time, new Date(), timeZone),
            end_time: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(shiftList[i].end_time, new Date(), timeZone),
            checkin_allowed_from: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(shiftList[i].checkin_allowed_from, new Date(), timeZone),
            checkin_allowed_till: DateTime.convertGmtTimeToDateTimeByUserProfileTimezone(shiftList[i].checkin_allowed_till, new Date(), timeZone),
            createdAt: defaultDateFormat(shiftList[i].createdAt),
            updatedAt: defaultDateFormat(shiftList[i].updatedAt),
            grace_period: shiftList[i]?.grace_period,
            cutoff_time: shiftList[i]?.cutoff_time
          });
        }
      }

      return {
        totalCount: results.count,
        currentPage: page,
        pageSize,
        data,
      };

    } catch (err) {
      console.log(err);
    }
  }


  static async list(companyId, roleId, reqQuery) {
    try {

      let { showAllowedShift } = reqQuery;

      const where = new Object();

      where.company_id = companyId;

      if (showAllowedShift == "true") {

        let allowedShiftsValue = await getSettingValueByObject(Setting.ROLE_ALLOWED_SHIFT, companyId, roleId, ObjectName.ROLE);
        if (allowedShiftsValue) {
          const allowedShifts = allowedShiftsValue && allowedShiftsValue.split(',').map(Number);
          where.id = { [Op.in]: allowedShifts }
        }
      }

      let statusValue = !isKeyAvailable(reqQuery,"status") ? ShiftStatus.ACTIVE : isKeyAvailable(reqQuery,"status") && NumberFunction.isNotNull(reqQuery?.status) ? reqQuery?.status : null;
      let defaultValue = isKeyAvailable(reqQuery,"defaultValue") && NumberFunction.isNotNull(reqQuery?.defaultValue) ? reqQuery?.defaultValue :null
      where[Op.or]= [
        { status: { [Op.or]: [statusValue, null] } },
        { id: { [Op.or]: [defaultValue, null] } }
      ]
    

      const query = {
        order: [["name", "ASC"]],
        where,
        attributes: { exclude: ["deletedAt"] },
      };

      // Get list and count
      let shiftList = await shiftService.find(query)

      const data = [];

      if (shiftList && shiftList.length > 0) {

        for (let i = 0; i < shiftList.length; i++) {
          data.push({
            id: shiftList[i]?.id,
            name: shiftList[i]?.name,
            value: shiftList[i]?.id,
            label: shiftList[i]?.name,
          });
        }
      }

      return { data };

    } catch (err) {
      console.log(err);
    }
  }
  static async getName(id, companyId) {
    try {
      if (!id) {
        return null;
      }
      const shiftData = await shiftService.findOne({
        where: { id: id, company_id: companyId },
      });
      return shiftData?.name;
    } catch (err) {
      console.log(err);
    }
  }

  static async getCurrentShiftByTime(roleId, companyId) {
    try {

      if (roleId && companyId) {

        let userDefaultTimeZone = await SettingService.getSettingValue(Setting.USER_DEFAULT_TIME_ZONE, companyId);

        let currentTime = DateTime.getCurrentTimeByTimeZone(userDefaultTimeZone);

        let allowdShifts = await SettingService.getSettingValueByObject(Setting.ROLE_ALLOWED_SHIFT, companyId, roleId, ObjectName.ROLE);

        let shiftId;

        if (allowdShifts) {

          const allowedShift = allowdShifts && allowdShifts.split(",");

          for (let i = 0; i < allowedShift.length; i++) {

            let shiftDetail = await shiftService.findOne({
              where: { id: allowedShift[i], company_id: companyId },
            })


            if (shiftDetail && shiftDetail.start_time && shiftDetail.end_time) {

              let shiftStartTime = DateTime.convertGmtTimeToUserTimeZone(shiftDetail.start_time,userDefaultTimeZone,"HH:mm:ss");

              let shiftEndTime = DateTime.convertGmtTimeToUserTimeZone(shiftDetail.end_time,userDefaultTimeZone,"HH:mm:ss");

              let startTimeComparision = Time.compareTimes(currentTime, shiftStartTime);

              let endTimeComparision = Time.compareTimes(currentTime, shiftEndTime);

              if (startTimeComparision <= 0) {
                startTimeComparision = 900 + startTimeComparision ;
              }

              if (startTimeComparision >= 0 && endTimeComparision <= 0) {
                shiftId = shiftDetail.id;
                break;
              }

            }

          }

        }

        return shiftId;
      }

    } catch (err) {
      console.log(err);
    }

  }

  static async getCurrentCheckinShiftByTime(roleId, timeZone, companyId) {
    try {
      if (roleId && companyId) {
        let currentTime = DateTime.getCurrentTimeByTimeZone(timeZone);

        let allowdShifts = await SettingService.getSettingValueByObject(Setting.ROLE_ALLOWED_SHIFT, companyId, roleId, ObjectName.ROLE);

        let shiftIds = [];

        if (allowdShifts) {
          const allowedShift = allowdShifts && allowdShifts.split(",");

          for (let i = 0; i < allowedShift.length; i++) {

            let shiftDetail = await shiftService.findOne({
              attributes: ["id", "checkin_allowed_from", "checkin_allowed_till", "start_time", "end_time"],
              where: { id: allowedShift[i], company_id: companyId },
            });

            if ((shiftDetail && shiftDetail?.checkin_allowed_from && shiftDetail?.checkin_allowed_till) ||
              (shiftDetail && shiftDetail?.start_time && shiftDetail?.end_time)) {

              let shiftStartTime = DateTime.convertGmtTimeToUserTimeZone(
                shiftDetail?.checkin_allowed_from ? shiftDetail?.checkin_allowed_from : shiftDetail?.start_time,
                timeZone
              );
              let shiftEndTime = DateTime.convertGmtTimeToUserTimeZone(
                shiftDetail?.checkin_allowed_till ? shiftDetail?.checkin_allowed_till : shiftDetail?.end_time,
                timeZone
              );

              if (currentTime >= shiftStartTime && currentTime <= shiftEndTime) {
                shiftIds.push(shiftDetail.id);
              }
            }
          }
        }

        if (shiftIds.length > 0) {
          return shiftIds;
        } else {
          return allowdShifts;
        }
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  static async currentShiftList(companyId,timeZone, roleId, reqQuery) {
    try {

      let shiftId = await ShiftService.getCurrentCheckinShiftByTime(roleId,timeZone, companyId);


      const where = new Object();

      where.company_id = companyId;

      if(shiftId){
        where.id = shiftId
      
      }

      const query = {
        order: [["name", "ASC"]],
        where,
        attributes: { exclude: ["deletedAt"] },
      };

      // Get list and count
      let shiftList = await shiftService.find(query)

      const data = [];

      if (shiftList && shiftList.length > 0) {

        for (let i = 0; i < shiftList.length; i++) {
          data.push({
            id: shiftList[i].id,
            name: shiftList[i].name,
          });
        }
      }

      return { data };

    } catch (err) {
      console.log(err);
    }
  }

  static async getShiftById(shiftId, companyId) {
    if (!shiftId) {
      throw { message: "Shift Id required" };
    }

    let shiftList = await shiftService.findOne({
      where: {
        id: shiftId,
        company_id: companyId,
      },
    });

    return shiftList && shiftList;
  }

  static async getCurrentShiftTimeByUserId(user_id,companyId, userTimeZone){

    let timeZone = userTimeZone ? userTimeZone:await UserService.getTimeZone(companyId)

    let currentShiftId = await AttendanceService.GetShift(user_id,new Date(),companyId)
    let currentTime = DateTime.getCurrentTimeByTimeZone(timeZone);
    let shiftDetail
    let shiftStartTime
    let shiftEndTime
    if(currentShiftId){
     shiftDetail = await ShiftService.getShiftById(currentShiftId, companyId)
     shiftStartTime = DateTime.convertGmtTimeToUserTimeZone(shiftDetail && shiftDetail?.start_time,timeZone)
     shiftEndTime = DateTime.convertGmtTimeToUserTimeZone(shiftDetail && shiftDetail?.end_time,timeZone);
    }

    return{
      currentTime : currentTime,
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime
    }
  }
}

module.exports = ShiftService;
