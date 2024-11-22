const { Attendance, User: UserModel } = require('../../db').models;
const Request = require('../../lib/request');
const { OK } = require('../../helpers/Response');
const utils = require('../../lib/utils');
const { Op } = require('sequelize');
const String = require('../../lib/string');
const User = require('../../helpers/User');
const Attendances = require('../../helpers/Attendance');
const { ACTIVE_STATUS } = require('../../helpers/ProjectUser');
const AttendanceTypeService = require("../../services/AttendanceTypeService");

const search = async (req, res) => {
  try {
    const { pagination, status } = req.query;
    const data = req.query;
    const companyId = Request.GetCompanyId(req);
    const type = data.type;
    const user_id = data.user_id;
    const endDate = data.endDate;
    const startDate = data.startDate;

    let where = {};
    let attendanceWhere = {};

    if (user_id) {
      where.id = parseInt(user_id);
    }

    where.company_id = companyId;

    where.status = ACTIVE_STATUS;
    if (type) {
      attendanceWhere.type = parseInt(user_id);
    }

    if (status) {
      where.status = status;
    }
    const page = data.page ? parseInt(data.page, 10) : 1;
    if (isNaN(page)) {
      return next(new errors.BadRequestError('Invalid page'));
    }
    const pageSize = data.pageSize ? parseInt(data.pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return next(new errors.BadRequestError('Invalid page size'));
    }

    const AttendanceCount = async () => {
      let where = new Object();
      let list = [];

      (where.company_id = companyId);

      if (startDate && !endDate) {
        where.date = {
          [Op.and]: {
            [Op.gte]: startDate,
          },
        };
      }

      if (endDate && !startDate) {
        where.date = {
          [Op.and]: {
            [Op.lte]: endDate,
          },
        };
      }

      if (startDate && endDate) {
        where.date = {
          [Op.and]: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      }
      const data = await Attendance.findAll({
        where: where,
      });
      for (let i in data) {
        let { user_id, type } = data[i];
        list.push({
          user_id: user_id,
          type: type
        })
      }
      return list;
    };

    const sumAttendanceHours = async () => {

      let hoursWhere = new Object();
      let list = [];
      
      (hoursWhere.company_id = companyId);
      if (startDate && !endDate) {
        hoursWhere.date = {
          [Op.and]: {
            [Op.gte]: startDate,
          },
        };
      }

      if (endDate && !startDate) {
        hoursWhere.date = {
          [Op.and]: {
            [Op.lte]: endDate,
          },
        };
      }

      if (startDate && endDate) {
        hoursWhere.date = {
          [Op.and]: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      }

      const data = await Attendance.findAll({
        where: hoursWhere,
      });

      for (let i in data) {
        let { late_hours, user_id, additional_hours } = data[i];
        list.push({
          late_hours: late_hours,
          user_id: user_id,
          additional_hours: additional_hours
        })
      }

      return list;
    };

    // Search term
    const query = {
      attributes: {
        exclude: ['deletedAt'],
      },
      where,
    };
    if (pagination) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }
    let AttendanceList = await AttendanceCount();
    let AttendanceListHours = await sumAttendanceHours();

      let workingDayIds = await AttendanceTypeService.getAttendanceTypeId({is_working_day:true})
      let leaveIds = await AttendanceTypeService.getAttendanceTypeId({is_leave:true})
      let additionalDayIds = await AttendanceTypeService.getAttendanceTypeId({is_additional_day:true})
      let absentDayIds = await AttendanceTypeService.getAttendanceTypeId({is_absent:true})

    // Get Store list and count
    const userDetail = await UserModel.findAndCountAll(query);

    let userData = userDetail && userDetail.rows;
    const attendanceList = [];
    for (let i = 0; i < userData.length; i++) {
      const { id, name, last_name, status, media_url } = userData[i];
      let totalLateHours = 0
      let totalAdditionalHours = 0

      let type = AttendanceList.filter((data) => {
        return additionalDayIds.length > 0 && additionalDayIds.includes(data?.type) && data.user_id == id;
      })

      let leave = AttendanceList.filter((data) => {
        return leaveIds.length > 0 && leaveIds.includes(data?.type) && data.user_id == id;
      })

      let absent = AttendanceList.filter((data) => {
        return absentDayIds.length > 0 && absentDayIds.includes(data?.type) && data.user_id == id;
      })

      let worked = AttendanceList.filter((data) => {
        return workingDayIds.length > 0 && workingDayIds.includes(data?.type) && data.user_id == id;
      })

      let login = AttendanceList.filter((data) => {
        if (data.user_id == id) {
          return data;
        }
      })

      let hours = AttendanceListHours.filter((data) => {
        if (data.user_id == id) {
          return data;
        }
      })

      for (let i in hours) {
        let { late_hours, additional_hours } = hours[i];
        totalLateHours += late_hours
        totalAdditionalHours += additional_hours
      }


      attendanceList.push({
        user: id,
        additional: type.length,
        total: login.length,
        leave: leave.length,
        absent: absent.length,
        worked: worked.length,
        userName: String.concatName(name, last_name),
        status: status,
        firstName: name,
        LastName: last_name,
        late_hours: totalLateHours,
        additional_hours: totalAdditionalHours,
        startDate: startDate || '',
        endDate: endDate || '',
        media_url: media_url,
      });
    }
    return res.json(200, {
      data: attendanceList,
      totalCount: userDetail.count,
      pageSize,
      page,
    });
  } catch (err) {
    return res.json(400, { message: err.message });
  }
};
module.exports = search;
