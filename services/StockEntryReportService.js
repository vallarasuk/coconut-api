const { Op, where, Sequelize } = require("sequelize");
const Request = require("../lib/request");
const Response = require("../helpers/Response");
const { StockEntryProduct, User, Shift, Location: LocationModel, Attendance } = require("../db").models;
const DateTime = require("../lib/dateTime");
const { getSettingListByName, getSettingValue } = require("./SettingService");
const Setting = require("../helpers/Setting");
const Number = require("../lib/Number");
const Permission = require("../helpers/Permission");
const StatusService = require("./StatusService");
const ObjectName = require("../helpers/ObjectName");
const Status = require("../helpers/Status");

class StockEntryReportService {
  static async getCountByUser(updateDataArray) {
    const counts = {};

    // Iterate through the data and count occurrences of each date for each user_id
    updateDataArray.forEach((entry) => {
      const { date, user_id, first_name, last_name, locationName } = entry;
      const dateStr = date.toISOString().split("T")[0]; // Convert date to a string for consistency

      if (!counts[dateStr]) {
        counts[dateStr] = {};
      }
      if (!counts[dateStr][user_id]) {
        counts[dateStr][user_id] = { count: 0, first_name, last_name, locationName }; // Initialize with first_name and last_name
      }
      counts[dateStr][user_id].count++;
    });

    const result = [];
    // Iterate through the counts object and transform it into an array
    for (const dateStr in counts) {
      for (const user_id in counts[dateStr]) {
        const { count, first_name, last_name, locationName } = counts[dateStr][user_id];
        result.push({ date: new Date(dateStr), user_id, count, first_name, last_name, locationName });
      }
    }

    return result;
  }
  static async getCountByLocation(data) {
    const result = new Map();

    for (const entry of data) {
      const key = `${entry.date.toISOString().slice(0, 10)}_${entry.user_id}`;
      if (result.has(key)) {
        result.get(key).count += 1;
      } else {
        result.set(key, {
          date: entry.date,
          user_id: entry.user_id,
          first_name: entry.first_name,
          last_name: entry.last_name,
          media_url: entry.media_url,
          count: 1,
        });
      }
    }

    return Array.from(result.values());
  }
  static async search(req, res) {
    try {
      const params = req.query;
      let { page, pageSize, search, sort, sortDir, shift, location, user, startDate, endDate, role } =
        params;



      // get company Id from request
      const companyId = Request.GetCompanyId(req);
      let timeZone = Request.getTimeZone(req);
      let date = DateTime.getCustomDateTime(req.query?.date, timeZone)
      let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
      let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

      // Validate if page is not a number
      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        throw {
          message: "Invalid page",
        };
      }

      // Validate if page size is not a number
      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        throw {
          message: "Invalid page size",
        };
      }

      const validOrder = ["ASC", "DESC"];
      const sortableFields = {
        id: "id",
        date: "date",
        name: "name",
        shift: "shift",
        stock_entry_number: "stock_entry_number",
        location: "location",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        owner: "owner",
        user_name: "user_name",
        product_count: "product_count",
      };

      const sortParam = sort ? sort : "createdAt";
      if (!Object.keys(sortableFields).includes(sortParam)) {
        throw {
          message: `Unable to sort Location by ${sortParam}`,
        };
      }

      const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
      // Validate order is present in sortDir param
      if (!validOrder.includes(sortDirParam)) {
        throw {
          message: "Invalid sort order",
        };
      }

      let attendanceWhere = {};

      let userWhere = {};

      attendanceWhere.company_id = companyId;
      if (startDate && !endDate) {
        attendanceWhere.date = {
          [Op.and]: {
            [Op.gte]: startDate,
          },
        };
      }

      if (endDate && !startDate) {
        attendanceWhere.date = {
          [Op.and]: {
            [Op.lte]: endDate,
          },
        };
      }

      if (startDate && endDate) {
        attendanceWhere.date = {
          [Op.and]: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      }

      if (date && Number.isNotNull(req?.query?.date)) {
        attendanceWhere.date = {
          [Op.and]: {
            [Op.gte]: date?.startDate,
            [Op.lte]: date?.endDate,
          },
        };
      }

      if (Number.isNotNull(user)) {
        attendanceWhere.user_id = user;
      }

      if (Number.isNotNull(shift)) {
        attendanceWhere.shift_id = shift;
      }

      if (Number.isNotNull(location)) {
        attendanceWhere.store_id = location;
      }

      if (Number.isNotNull(role)) {
        userWhere.role = role;
      }

      let order = [];

      if (sort === "user_name") {
        order.push([[{ model: User, as: "user" }, "name", sortDir]]);
      }

      if (sort === "location") {
        order.push([[{ model: LocationModel, as: "location" }, "name", sortDir]]);
      }

      if (sort === "shift") {
        order.push([[{ model: Shift, as: "shift" }, "name", sortDir]]);
      }

      const searchTerm = search ? search.trim() : null;

      // validate search term exist or not
      if (searchTerm) {
        attendanceWhere[Op.or] = [
          {
            "$user.name$": {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            "$location.name$": {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
      const manageOthersPermission = await Permission.Has(Permission.STOCK_ENTRY_MANAGE_OTHERS, req);

      let settingData = await getSettingListByName(Setting.STOCK_ENTRY_REQUIRED, companyId);

      let allowedRoleIds = [];

      if (settingData && settingData.length > 0) {
        for (let i = 0; i < settingData.length; i++) {
          if (settingData[i].value == "true") {
            allowedRoleIds.push(settingData[i]?.object_id);
          }
        }
      }

      let allowedUserIds = [];
      if (allowedRoleIds && allowedRoleIds.length > 0) {
        let userData = await User.findAll({
          where: {
            role: { [Op.in]: allowedRoleIds },
            company_id: companyId,
            ...userWhere
          }
        });
        if (userData && userData.length > 0) {
          for (let i = 0; i < userData.length; i++) {
            allowedUserIds.push(userData[i]?.id);
          }
        }
      }

      if (manageOthersPermission) {
        if (allowedRoleIds && allowedRoleIds.length > 0) {
          if (
            allowedUserIds &&
            allowedUserIds.length > 0 &&
            !Number.isNotNull(user)
          ) {
            attendanceWhere.user_id = { [Op.in]: allowedUserIds };
          }
        } else {
          attendanceWhere.user_id = null;
        }
      } else {
        if (allowedRoleIds && allowedRoleIds.length > 0) {
          let userId = null;

          if (allowedUserIds && allowedUserIds.length > 0) {
            userId = allowedUserIds.includes(req.user.id) ? req.user.id : null;
          }
          attendanceWhere.user_id = userId;
        } else {
          attendanceWhere.user_id = null;
        }
      }

      let query = {
        where: attendanceWhere,
        order: order,
        include: [
          {
            required: true,
            model: User,
            as: "user",
            where: userWhere,
          },
          {
            required: false,
            model: LocationModel,
            as: "location",
          },
          {
            required: false,
            model: Shift,
            as: "shift",
          },
        ],
        attributes: [
          "store_id",
          "user_id",
          "date",
          [Sequelize.literal(`CASE WHEN COUNT(*) > 1 THEN 1 ELSE COUNT(*) END`), "count"],
        ],
        group: ["store_id", "user_id", "user.id", "location.id", "date", "shift.id"],
        raw: true,
      };

      let list = [];

      let attendanceArray = [];
      let stockEntryProductArray = [];
      const attendanceData = await Attendance.findAndCountAll(query);

      let attendanceList = attendanceData && attendanceData.rows;
      if (attendanceList && attendanceList.length > 0) {
        for (let i = 0; i < attendanceList.length; i++) {
          const values = attendanceList[i];
          attendanceArray.push({
            user_id: values?.user_id,
            store_id: values?.store_id,
            location: values["location.name"],
            first_name: values["user.name"],
            last_name: values["user.last_name"],
            media_url: values["user.media_url"],
            shift_name: values["shift.name"],
            shift_id: values["shift.id"],
            date: values?.date,
          });
        }
      }

      let where = {};
      if (startDate && !endDate) {
        where.createdAt = {
          [Op.and]: {
            [Op.gte]: DateTime.toGMT(start_date, timeZone),
          },
        };
      }

      if (endDate && !startDate) {
        where.createdAt = {
          [Op.and]: {
            [Op.lte]: DateTime.toGMT(end_date, timeZone),
          },
        };
      }

      if (startDate && endDate) {
        where.createdAt = {
          [Op.and]: {
            [Op.gte]: DateTime.toGMT(start_date, timeZone),
            [Op.lte]: DateTime.toGMT(end_date, timeZone),
          },
        };
      }

      if (date && Number.isNotNull(req?.query?.date)) {
        where.createdAt = {
          [Op.and]: {
            [Op.gte]: date?.startDate,
            [Op.lte]: date?.endDate,
          },
        };
      }

      let completedStatus = await StatusService.Get(ObjectName.STOCK_ENTRY_PRODUCT, Status.GROUP_COMPLETED, companyId);
      if(Number.isNotNull(completedStatus)){
        where.status = completedStatus?.id
      }
      
      let stockEntryList = await StockEntryProduct.findAndCountAll({
        where: where,
      });
      let stockEnrtyData = stockEntryList && stockEntryList?.rows;
      if (stockEnrtyData && stockEnrtyData.length > 0) {
        for (let i = 0; i < stockEnrtyData.length; i++) {
          const { store_id, owner_id, createdAt, shift_id } = stockEnrtyData[i];
          stockEntryProductArray.push({
            user_id: owner_id,
            store_id: store_id,
            date: createdAt.toISOString().split('T')[0],
            shift_id: shift_id
          });
        }
      }

      if (attendanceArray && attendanceArray.length > 0) {
        for (let i = 0; i < attendanceArray.length; i++) {
          const { user_id, store_id, location, first_name, last_name, media_url, date, shift_name, shift_id } = attendanceArray[i];

          const filteredArray = stockEntryProductArray.filter(
            (entry) => entry.user_id === user_id && entry.store_id === store_id && entry.date === date && entry.shift_id === shift_id
          );
          const count = filteredArray.length;

          list.push({
            user_id,
            store_id,
            location,
            first_name,
            last_name,
            media_url,
            date,
            product_count: count,
            shift_name
          });
        }
      }


      if (sort == "name") {
        if (sortDir == "DESC") {
          list.sort((a, b) => {
            return b.first_name.localeCompare(a.first_name);
          });
        } else {
          list.sort((a, b) => {
            return a.first_name.localeCompare(b.first_name);
          });
        }
      }

      if (sort == "product_count") {
        if (sortDir == "DESC") {
          list.sort((a, b) => b.product_count - a.product_count);
        } else {
          list.sort((a, b) => a.product_count - b.product_count);
        }
      }
      if (!sort) {

        list.sort((a, b) => a.product_count - b.product_count);
      }


      if (sort == "location") {
        if (sortDir == "ASC") {
          list.sort((a, b) => a.location - b.location);
        } else {
          list.sort((a, b) => b.location - a.location);
        }
      }

      if (sort == "date") {
        if (sortDir == "ASC") {
          list.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else {
          list.sort((a, b) => new Date(b.date) - new Date(a.date));

        }
      }

      const offset = (page - 1) * pageSize;

      const stockEntryReportList = list.slice(offset, offset + pageSize);

      return res.json(Response.OK, {
        totalCount: list.length,
        currentPage: page,
        pageSize,
        data: stockEntryReportList,
        sort,
        sortDir,
      });
    } catch (err) {
      console.log(err);
      return res.json(Response.BAD_REQUEST, { message: err.message });
    }
  }
}

module.exports = StockEntryReportService;
