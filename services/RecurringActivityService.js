const ObjectName = require("../helpers/ObjectName");
const Response = require("../helpers/Response");
const Status = require("../helpers/Status");
const Boolean = require("../lib/Boolean");
const Request = require("../lib/request");
const History = require("./HistoryService");
const validator = require("../lib/validator");
const DateTime = require("../lib/dateTime");
const { Op } = require("sequelize");
const { monthOption, TaskType } = require("../helpers/RecurringTask");
const String = require("../lib/string");
const { getSettingValue } = require("./SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../helpers/Setting");
const Number = require("../lib/Number");
const UserService = require("./UserService");
const { RecurringActivity, User, ActivityType, UserRole, Shift, Location} = require("../db").models;


class RecurringActivityService {

  static async create(req, res) {
    try {
      let body = req.body;
      const company_id = Request.GetCompanyId(req);
      let assigneeId = body.assignee;

      if (!assigneeId) {
        return res.json(Response.BAD_REQUEST, { message: "Assignee is required" });
      }
      let query = {
        order: [["createdAt", "DESC"]],
        where: { company_id },
        attributes: ["item"],
      };
      let lastItemData = await RecurringActivity.findOne(query);
      let item;
      let itemNumberData = lastItemData && lastItemData.get("item");
      if (!itemNumberData) {
        item = 1;
      } else {
        item = itemNumberData + 1;
      }
      let dayValue;

      try {
        dayValue = body?.day && JSON.parse(body?.day);
      } catch (error) {
        dayValue = body?.day;
      }
      let createData = {
        day: dayValue.join(","),
        date: body?.date ? body?.date : null,
        month: body.month,
        item: item,
        status: Status.ACTIVE,
        company_id: company_id,
        type: body.taskType,
        assignee_id: assigneeId,
        activity_type: body?.activityType,
        role_id: body?.role_id ? body?.role_id:""
      };

      if(validator.isKeyAvailable(body,"location_id")){
        createData.location_id = body?.location_id ? body?.location_id : null
      }

      if(validator.isKeyAvailable(body,"shift_id")){
        createData.shift_id = body?.shift_id ? body?.shift_id : null
      }

      let activiteDetail = await RecurringActivity.create(createData);
      res.json(Response.OK, {
        message: "Activite Added",
        activiteDetail: activiteDetail,
      });
      res.on("finish", () => {
        History.create("Activite Added", req, ObjectName.RECURRING_ACTIVITE, activiteDetail.id);
      });
    } catch (err) {
      console.log(err);
      return res.json(Response.BAD_REQUEST, { message: err.message });
    }
  };




  static async search(req, res, next) {

    let { page, pageSize, search, sort, sortDir, pagination, user } = req.query;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }
    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }
    const companyId = req.user && req.user.company_id;
    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      assignee_id: "assignee_id",
      role_id: "role_id",
      name: "name",
      status: "status",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      activityTypeName: "activityTypeName",
      role_name: "role_name",
      type: "type",
      date: "date",
      day: "day",
      month: "month",
    };
    const sortParam = sort || "createdAt";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(Response.BAD_REQUEST, {
        message: `Unable to sort task by ${sortParam}`,
      });
    }
    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }
    const where = {};
    const data = req.query;
    const startDate = data.startDate;
    // startDate filter
    const endDate = data.endDate;

    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    if (startDate && !endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
        },
      };
    }
    // endDate filter
    if (endDate && !startDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    // startDate and endDate filter
    if (startDate && endDate) {
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }

    // user filter
    if (user) {
      where.assignee_id = data.user;
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          "$assignee.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$roleData.role_name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    where.company_id = companyId;

    let order = []

    if (sort === "activityTypeName") {
      order.push(['activityTypeDetail', 'name', sortDir])
    }
    else if (sort === "name") {
      order.push(["assignee", 'name', sortDir])
    }
    else if (sort === "role_name") {
      order.push(["roleData", 'role_name', sortDir])
    }
    else {
      order.push([sortableFields[sortParam], sortDirParam])
    }

    const query = {
      order,
      where,
      include: [
        {
          required: false,
          model: User,
          as: "assignee",
          attributes: ["name", "last_name", "media_url"],
        },
        {
          required: false,
          model: ActivityType,
          as: "activityTypeDetail",
          attributes: ["name"],
        },
        {
          required: false,
          model: UserRole,
          attributes: ['role_name', 'id'],
          as: 'roleData',
        },
      ],
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
    const company_id = Request.GetCompanyId(req);
    try {
      const activiteDetails = await RecurringActivity.findAndCountAll(query);

      if (activiteDetails.count === 0) {
        return res.json({});
      }
      const data = [];

      for (let index = 0; index < activiteDetails.rows.length; index++) {
        const task = activiteDetails.rows[index];
        const { id, assignee_id, date, type, item, status, createdAt, day, month, activity_type, activityTypeDetail, roleData, role_id, assignee, location_id, shift_id } = task.get();
        const dayValue = day && day.split(",");

        let monthValue = monthOption.find((data) => data?.value == month)
        data.push({
          id: id,
          month: monthValue,
          date: date,
          day: dayValue,
          status: status == Status.ACTIVE ? Status.ACTIVE_TEXT : Status.INACTIVE_TEXT,
          createdAt: DateTime.getDateTimeByUserProfileTimezone(createdAt, timeZone),
          assignee_id: assignee_id,
          firstName: assignee?.name,
          lastName: assignee?.last_name,
          media_url: assignee?.media_url,
          item: item,
          type: type,
          activiteType: activity_type,
          activityTypeName: activityTypeDetail?.name,
          role_name: roleData && roleData?.role_name,
          role_id: role_id,
          location_id: location_id,
          shift_id: shift_id
        });
      }
      res.json(Response.OK, {
        totalCount: activiteDetails.count,
        currentPage: page,
        pageSize,
        data,
        search,
      });
    } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, { message: err.message });
    }
  }

  static createAuditLog = async (oldData, updatedData, req, id) => {
    let companyId = Request.GetCompanyId(req);
    let auditLogMessage = [];

    if (Number.Get(updatedData?.shift_id) !== Number.Get(oldData?.shift_id)) {
      let shiftDetail = await Shift.findOne({
        where: { id: updatedData?.shift_id },
      });
      auditLogMessage.push(`Shift Updated To ${shiftDetail.name}\n`);
    }

    if (Number.Get(updatedData?.assignee) && Number.Get(oldData.assignee_id) !== Number.Get(updatedData?.assignee)) {
      if (Number.Get(oldData.assignee_id) !== Number.Get(updatedData?.assignee)) {
        let owner_id = await UserService.getUserDetailById(updatedData?.assignee, companyId);
        auditLogMessage.push(
          `Assignee Updated To ${String.concatName(owner_id?.name, owner_id?.last_name)}\n`
        );
      }
    }

    if (updatedData?.role_id && updatedData?.role_id !== oldData?.role_id) {
      let roleDetail = await UserRole.findOne({
        where: { id: updatedData?.role_id },
      });
      auditLogMessage.push(`Role Updated to ${roleDetail.role_name}\n`);
    }

    if (updatedData?.activityType && updatedData?.activityType !== oldData?.activity_type) {
      let activityTypeDetail = await ActivityType.findOne({
        where: { id: updatedData?.activityType },
      });
      auditLogMessage.push(`Activity Type Updated to ${activityTypeDetail.name}\n`);
    }

    if (updatedData?.taskType && updatedData?.taskType !== oldData?.type) {
      if (updatedData.taskType === TaskType.DAILY) {
        auditLogMessage.push(`Type Updated to Daily\n`);
      } else if (updatedData.taskType === TaskType.WEEKLY) {
        auditLogMessage.push(`Type Updated to Weekly ${updatedData.day}\n`);
      } else if (updatedData.taskType === TaskType.MONTHLY) {
        auditLogMessage.push(`Type Updated to Monthly ${updatedData.date}\n`);
      } else if (updatedData.taskType === TaskType.ANNUALLY) {
        const selectedMonth = monthOption.find((month) => month.value === parseInt(updatedData.month));
        const monthName = selectedMonth ? selectedMonth.label : '';
        auditLogMessage.push(`Type Updated to Annually ${monthName} ${updatedData.date}\n`);
      } else {
        auditLogMessage.push(`Type updated\n`);
      }
    }

    if (updatedData?.location?.id && updatedData?.location?.id !== oldData?.location_id) {
      let locationName = await Location.findOne({
        where: { id: updatedData.location.id }, 
      });
      auditLogMessage.push(`Location Updated to ${locationName.name}\n`);
    }

    if (auditLogMessage.length > 0) {
      let message = auditLogMessage.join('');
      History.create(message, req, ObjectName.RECURRING_ACTIVITE, id);
    } else {
      History.create("Activite Updated", req, ObjectName.RECURRING_ACTIVITE, id);
    }

  };

  static async update(req, res) {
    try {
      let body = req.body;

      let activiteId = req.params.id;
      const company_id = Request.GetCompanyId(req);
      let assigneeId = body.assignee;
      if (!assigneeId) {
        return res.json(Response.BAD_REQUEST, { message: "Assignee is required" });
      }

      let dayValue;

      const Data = await RecurringActivity.findOne({
        where: {
          id: activiteId,
          company_id: company_id,
        },
        include: [{ model: User, as: "assignee" }],
      });

      try {
        dayValue = body?.day && JSON.parse(body?.day);
      } catch (error) {
        dayValue = body?.day;
      }

      let updateData = {};


      updateData.day = body.taskType == TaskType.MONTHLY ? null : body.taskType == TaskType.ANNUALLY ? null : body.taskType == TaskType.DAILY ? null : dayValue.join(",");
      if (body.date) {
        updateData.date = body.taskType == TaskType.DAILY ? null : body.date;
      }

      if (body.month) {
        updateData.month = body.taskType == TaskType.ANNUALLY ? body.month : null;
      }


      if (body.taskType) {
        updateData.type = body.taskType;
      }

      if (body.assignee) {
        updateData.assignee_id = assigneeId;
      }

      updateData.role_id = body?.role_id ? body?.role_id : null;

      if (body.activityType) {
        updateData.activity_type = body.activityType;
      }

      if (validator.isKeyAvailable(body, "location_id")) {
        updateData.location_id = body?.location_id ? body?.location_id : null
      }

      if (validator.isKeyAvailable(body, "shift_id")) {
        updateData.shift_id = body?.shift_id ? body?.shift_id : null
      }


      let activiteDetails = await RecurringActivity.update(updateData, {
        where: { id: activiteId, company_id: company_id },
      });

      res.json(Response.OK, {
        message: "Activite Updated",
        activiteDetails: activiteDetails,
      });
      res.on("finish", async () => {
        // Create system log for task creation
        await this.createAuditLog(Data, body, req, activiteId);

      });
    } catch (err) {
      console.log(err);
      return res.json(Response.BAD_REQUEST, { message: err.message });
    }
  };

  static async updateStatus(req, res, next) {
    const data = req.body;

    const { id } = req.params;


    let company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "Activite id is required" });
    }

    const updateTask = {
      status: data.status,
    };
    try {
      const save = await RecurringActivity.update(updateTask, { where: { id: id, company_id } });

      res.json(Response.UPDATE_SUCCESS, {
        message: "Activite Status updated",
      });

      res.on("finish", async () => {
        History.create(`Activite Status updated to ${data.status === Status.ACTIVE ? Status.ACTIVE_TEXT  : Status.INACTIVE_TEXT}`, req, ObjectName.RECURRING_ACTIVITE, id);
      });
    } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, {
        message: err.message,
      });
    }
  };

  static async del  (req, res) {
    try {
      //get company Id from request
      let activiteId = req.params.id;

      //get company Id from request
      const companyId = Request.GetCompanyId(req);

      //validate Recurring Activite Id exist or not
      if (!activiteId) {
        return res.json(Response.BAD_REQUEST, { message: "Recurring Activite Not Found" });
      }

      //delete Recurring Activite
      await RecurringActivity.destroy({ where: { id: activiteId, company_id: companyId } });

      res.on("finish", async () => {
        History.create("Recurring Activite Deleted", req, ObjectName.RECURRING_ACTIVITE, activiteId);
      });

      res.json(Response.OK, { message: "Recurring Activite Deleted" });
    } catch (err) {
      console.log(err);
      return res.json(Response.BAD_REQUEST, { message: err.message });
    }
  };

  static async getDetail(req, res, next) {
    const { id } = req.params;
    try {
      const company_id = Request.GetCompanyId(req);
      if (!id) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid Id" });
      }
      const activiteData = await RecurringActivity.findOne({
        where: {
          id: id,
          company_id: company_id,
        },
        include: [{ model: User, as: "assignee" }],
      });

      if (!activiteData) return res.json(Response.OK, { message: "No Records Found" });
      let {  item, day, date, month, type, createdAt, assignee_id, updatedAt, description, assignee, status, activity_type, role_id, location_id, shift_id } = activiteData.get();

      const dayValue = day && day?.split(",");


      let data = {
        id,
        item,
        createdAt,
        assignee_id,
        day: dayValue,
        date,
        month,
        type,
        updatedAt,
        assignee: String.concatName(assignee?.name, assignee?.last_name),
        description,
        status: status == Status.ACTIVE ? Status.ACTIVE_TEXT : Status.INACTIVE_TEXT,
        activityType: activity_type,
        role_id,
        location_id,
        shift_id
      };
      res.json(Response.OK, data);
    } catch (err) {
      next(err);
      console.log(err);
    }
  }

}

module.exports=RecurringActivityService