const ObjectName = require("../helpers/ObjectName");
const Permission = require("../helpers/Permission");
const { BAD_REQUEST } = require("../helpers/Response");
const Request = require("../lib/request");
const DateTime = require("../lib/dateTime")
const statusService = require("../services/StatusService");

const History = require("./HistoryService");
const { 
  Activity: activityModel,
  User,
  status: StatusModal,
  ActivityType,
  RecurringActivity,
  Location
  } = require("../db").models;
const validator = require("../lib/validator");
const errors = require("restify-errors");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const Boolean = require("../lib/Boolean");
const ActivityTypeGroup = require("../helpers/ActivityTypeGroup");
const Number = require("../lib/Number");
const { Media } = require("../helpers/Media");
const mediaService = require("./media");
const StatusSerivce = require("./StatusService");
const Status = require("../helpers/Status");
const Activity = require("../helpers/Activity");
const { getSettingValue } = require("./SettingService");
const Setting = require("../helpers/Setting");
const Response = require("../helpers/Response");
const ArrayList = require("../lib/ArrayList");


const create = async (params) => {
  try {
    let {
      user_id,
      activity_type_id,
      date,
      activity,
      activity_type,
      userId,
      company_id,
      notes,
      location_id
    } = params;

    const status = await StatusSerivce.getFirstStatus(
      ObjectName.ACTIVITY,
      company_id
    );

    date = date ? DateTime.GetCurrentDateTime(date): new Date();

    let createData = {
      activity_type_id: activity_type_id,
      owner_id: user_id ? user_id : userId,
      date,
      company_id,
      activity,
      activity_type,
      status: status,
      start_date: new Date(),
      started_at: new Date(),
      notes: notes,
      location_id: location_id
    };
    const activityResponseData = await activityModel.create(createData);
    return activityResponseData;
  } catch (err) {
    console.log(err);
  }
};

const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    const company_id = Request.GetCompanyId(req);

    if (ids && Array.isArray(ids) && ids.length > 0) {
      activityModel
        .destroy({
          where: { id: { [Op.in]: ids }, company_id }
        })
        .then(() => {
          res.json({ message: "Activty bulk deleted" });
          History.create("Activty Bulk Deleted", req, ObjectName.ACTIVITY, id);
        })
        .catch((err) => {
          req.log.error(err);
          return next(err);
        });
    } else {
      res.json(400, { message: "Select Activity" });
    }

  } catch (err) {
    console.log(err);
  }
};

const del = async (req, res, next) => {

  const id = req.params.id;
  const company_id = Request.GetCompanyId(req);
  if (!validator.isInteger(id)) {
    return next(new errors.BadRequestError("Invalid Account id"));
  }

  activityModel
    .findOne({
      where: { id, company_id: company_id },
    })
    .then((activity) => {
      if (!activity) {
        return next(new errors.NotFoundError("Activity not found"));
      }

      activityModel
        .destroy({
          where: { id: id, company_id }
        })
        .then(() => {
          res.json(Response.DELETE_SUCCESS,{ message: "Activty deleted" });
          History.create("Activty Deleted", req, ObjectName.ACTIVITY, id);
        })
        .catch((err) => {
          req.log.error(err);
          console.log(err);
          return next(err);
        });
    });
};

const search = async (req, res, next) => {
  try {
    let { page, pageSize, search, sort, sortDir, primary, pagination,group, user, status, startDate, endDate, activityType, type, location } = req.query;

    const manageOthersPermission = await Permission.Has(Permission.ACTIVITY_MANAGE_OTHERS, req);
    const company_id = Request.GetCompanyId(req);
    let userDefaultTimeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req?.query?.date || req?.query?.date, userDefaultTimeZone)

    let userId = Request.getUserId(req);
    const where = {};

    where.company_id = company_id;

    if (primary) {
      where.primary = primary
    }

    if (location) {
      where.location_id = location;
    }

    if (type) {
      where.activity_type_id = type
    }

    if (Number.isNotNull(status)) {
      where.status = status
    }

    if (manageOthersPermission) {
      if (Number.isNotNull(user)) {
        where.owner_id = user
      }
    } else {
      where.owner_id = userId
    }

    if(group && Number.isNotNull(group)){
      let pendingActivityStatus = await statusService.getAllStatusByGroupId(ObjectName.ACTIVITY, group, company_id);
      let pendingActivityIds = ArrayList.isArray(pendingActivityStatus)? pendingActivityStatus.map((value) =>value?.id):[]
      where.status = pendingActivityIds ;
      where.owner_id = userId
    }

    if (Number.isNotNull(activityType)) {
      where.activity_type_id = activityType
    }

    if (DateTime.isValidDate(date)) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (startDate && !endDate) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: DateTime.toGetISOStringWithDayStartTime(startDate),
        },
      };
    }

    if (endDate && !startDate) {
      where.created_at = {
        [Op.and]: {
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    if (startDate && endDate) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: DateTime.toGetISOStringWithDayStartTime(startDate),
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(400, { message: "Invalid page", })
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(400, { message: "Invalid page size", })
    }

    if (page && pageSize) {
      // Validate if page is not a number
      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        return res.json(400, { message: "Invalid page", })
      }

      // Validate if page size is not a number
      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        return res.json(400, { message: "Invalid page size", })
      }
    }
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      date: "date",
      created_at: "created_at",
      owner_id: "owner_id",
      activity: "activity",
      start_date: "start_date",
      end_date: "end_date",
      estimated_hours: "estimated_hours",
      actual_hours: "actual_hours",
      cost: "cost",
      status: "status",
      notes: "notes",
      explanation: "explanation",
      ip_address: "ip_address",
      updatedAt: "updated_at",
      createdAt: "created_at",
      location_name: "location_name",
      activity_type: "activity_type",
    };

    const sortParam = sort || "created_at";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(400, { message: `Unable to sort data by ${sortParam}`, })
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(400, { message: "Invalid sort order", })
    }

    page = page ? parseInt(page, 10) : 1;

    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          "$user.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    let order = []

    if (sort === "location_name") {
      order.push(['locationDetail', 'name', sortDir])
    }
    else {
      order.push([sortableFields[sortParam], sortDirParam])
    }

    const query = {
      order,
      include: [
        {
          model: User,
          as: "user",
          required: true,
          order: [[Sequelize.literal("user.name"), "ASC"]],
        },
        {
          model: StatusModal,
          as: "statusDetail",
          required: false,
        },
        {
          model: Location,
          as: "locationDetail",
          required: false,
        },
        {
          model: ActivityType,
          as: "activityUsers",
          required: false,
        }
      ],
      where
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

    const ActivityData = await activityModel.findAndCountAll(query);

    const data = [];

    ActivityData.rows.forEach((value => {
      data.push({
        id: value.id,
        activity: value.activity,
        activityTypeName: value.activityUsers && value.activityUsers.name,
        activity_type: value.activity_type,
        activity_type_id: value.activity_type_id,
        actual_hours: value.actual_hours,
        estimated_hours: value.estimated_hours,
        user_id: value.owner_id,
        userName: value && value.user && value.user.name,
        userLastName: value && value.user && value.user.last_name,
        userAvatarUrl: value && value.user && value.user.media_url,
        date: DateTime.getDateTimeByUserProfileTimezone(value.date, userDefaultTimeZone),
        start_date: value.start_date,
        end_date: value.end_date,
        description: value.description,
        cost: value.cost,
        explanation: value.explanation,
        notes: value.notes,
        company_id: value.company_id,
        createdAt: DateTime.getCurrentDateTimeByUserProfileTimezone(value.created_at, userDefaultTimeZone),
        updatedAt: DateTime.getCurrentDateTimeByUserProfileTimezone(value.updated_at, userDefaultTimeZone),
        status: value.statusDetail && value.statusDetail.name,
        statusId: value.statusDetail && value.statusDetail.id,
        statusColor: value.statusDetail && value.statusDetail.color_code,
        allowEdit: value.statusDetail && value.statusDetail.allow_edit,
        started_at: value?.started_at,
        completed_at: value?.completed_at,
        statusGroup: value?.statusDetail && value?.statusDetail?.group,
        location_name: value?.locationDetail?.name
      });
    }))
    res.json({
      totalCount: ActivityData.count,
      currentPage: page,
      pageSize,
      data
    })
  } catch (err) {
    next(err);
    console.log(err);
  }
};

const get = async (req, res, next) => {
  const { id } = req.params;

  try {
    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }

    const ActivityData = await activityModel.findOne({
      where: {
        id: id,
        company_id: company_id,
      },
      include: [
        {
          model: User,
          as: "user",
          required: true,
        },
        {
          model: StatusModal,
          as: "statusDetail",
          required: false,
        }
      ],
    });

    if (!ActivityData) return res.json(200, { message: "No Records Found" });

    let {
      id: activityId,
      activity,
      activity_type,
      activity_type_id,
      estimated_hours,
      actual_hours,
      start_date,
      end_date,
      owner_id,
      date,
      status,
      notes,
      explanation,
      createdAt,
      user,
      cost,
      started_at,
      completed_at,
      statusDetail,
      location_id
    } = ActivityData.get();

    if (completed_at) {
      end_date = completed_at;
    }

    let data = {
      activityId,
      activity,
      activity_type,
      activity_type_id,
      estimated_hours,
      actual_hours,
      start_date,
      end_date,
      user_id: owner_id,
      date,
      status,
      explanation,
      notes,
      userName: user && user.name,
      createdAt,
      cost,
      allowEdit: statusDetail && statusDetail?.allow_edit,
      location_id,
      completed_at: completed_at,
      started_at: started_at,
    };
    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
}

const update = async (req, res, next) => {
  let { id } = req.params;
  try {
    let data = req.body;
    const company_id = Request.GetCompanyId(req);
    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }

    const actvityDetails = await activityModel.findOne({
      // attributes: ["id"],
      where: { id, company_id: company_id },
    });

    if (!actvityDetails) {
      return res.json(BAD_REQUEST, { message: "Activity Detail Not Found" });
    }

    const updateData = {
      date: data.date,
      activity_type_id: Number.Get(data.activity_type) ? Number.Get(data.activity_type) : Number.Get(data.activity_type_id),
      actual_hours: data.actual_hours ? Number.Get(data.actual_hours) : null,
      cost: data.cost ? data.cost : null,
      start_date: data.start_date ? data.start_date : null,
      end_date: data.end_date ? data.end_date : null,
      estimated_hours: data.estimated_hours ? Number.Get(data.estimated_hours) : null,
      explanation: data.explanation,
      notes: data.notes,
      ...(data?.completed_at ? {completed_at: new Date(data?.completed_at)}: {}),
      ...(data?.started_at ? {started_at: new Date(data?.started_at)}: {}),
      location_id: data?.location_id ? data?.location_id : null
    };

    if(data?.status){
      updateData.status = data.status ? Number.Get(data.status) : null
    }

    if(data.owner){                                  
      updateData.owner_id = data.owner ? Number.Get(data.owner) : null
    }
    await activityModel.update(updateData, {
      where: { id },
    });

    res.json(200, { message: "Activity Updated" });

    // systemLog
    res.on("finish", async () => {
      History.create("Activity Updated", req, ObjectName.ACTIVITY, id);
    })

  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

const bulkUpdate = async (req, res, next) => {
  try {
    const companyId = Request.GetCompanyId(req);
    const data = req.body;

    let activityIds = data && data.activityIds.split(",");

    if (!activityIds || activityIds.length === 0) {
      return res.json(Response.BAD_REQUEST, {
        message: "activityIds ids are required",
      });
    }

    for (const id of activityIds) {
      const activityDetail = await activityModel.findOne({
        where: { id: id, company_id: companyId },
      });

      if (!activityDetail) {
        return res.json(Response.BAD_REQUEST, {
          message: `Invalid activity id: ${id}`,
        });
      }

      const updateData = {};

      if (data?.date) {
        updateData.date = data.date;
      }

      if (data?.activity_type_id) {
        updateData.activity_type_id = data.activity_type_id;
      }

      if (data?.actual_hours) {
        updateData.actual_hours = data.actual_hours;
      }

      if(data?.start_date) {
        updateData.start_date = data?.start_date;
      }

      if(data?.end_date) {
        updateData.end_date = data?.end_date;
      }

      if(data?.estimated_hours) {
        updateData.estimated_hours = data?.estimated_hours
      }

      if(data?.explanation) {
        updateData.explanation = data?.explanation
      }

      if(data?.notes) {
        updateData.notes = data?.notes
      }

      if(data?.started_at) {
        updateData.started_at = data?.started_at
      }

      if(data?.completed_at) {
        updateData.completed_at = data?.completed_at
      }

      if(data?.cost) {
        updateData.cost = data.cost;
      }

      if (data?.status) {
        updateData.status = data.status ? Number.Get(data.status) : null;
      }

      if (data.owner) {
        updateData.owner_id = data.owner ? Number.Get(data.owner) : null;
      }

      await activityModel.update(updateData, {
        where: { id },
      });

      // systemLog
      History.create("Activity Updated", req, ObjectName.ACTIVITY, id);
    }

    res.json(200, { message: "Activities Updated" });
  } catch (err) {
    next(err);
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const createCheckoutActivity = async (userId, companyId) => {
  try {
    const activityTypeDetail = await ActivityType.findOne({
      // attributes: ["id"],
      where: { company_id: companyId, group: ActivityTypeGroup.CHECK_OUT },
    });

    if (activityTypeDetail) {

      const activityDetail = await activityModel.findOne({
        where: { activity_type_id: activityTypeDetail.id, company_id: companyId, owner_id: userId }
      });

      if (!activityDetail) {
        await activityModel.create({
          activity_type_id: activityTypeDetail.id,
          owner_id: userId,
          date: new Date(),
          companyId,
          activity: activityTypeDetail.name,
          activity_type: activityTypeDetail.type,
          default_status: activityTypeDetail && activityTypeDetail.default_status,
          start_date: new Date(),
          end_date: new Date(),
          company_id: companyId
        })
      }
    }
  } catch (err) {
    console.log(err);
  }
}

const updateStatus = async (req, res, next) => {
  let { id } = req.params;
  try {
    let data = req.body;
    const company_id = Request.GetCompanyId(req);
    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }
    const status = await StatusSerivce.Get(ObjectName.ACTIVITY,Status.GROUP_COMPLETED, company_id);

    const actvityDetails = await activityModel.findOne({
      where: { id, company_id: company_id },
    });

    if (!actvityDetails) {
      return res.json(BAD_REQUEST, { message: "Activity Detail Not Found" });
    }

    const updateData = {
      status: status?.id,
      completed_at: new Date()

    };
    await activityModel.update(updateData, {
      where: { id: id, company_id: company_id },
    });

    res.json(200, { message: "Status Updated" });

    // systemLog
    res.on("finish", async () => {
      History.create("Status Updated", req, ObjectName.ACTIVITY, id);
    })

  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}


const createActivityOnUserCheckIn = async (req, attendanceData, companyId) => {
  let userId = Request.getUserId(req);
  let roleId = Request.getUserRole(req);
  let currentLocationId = Request.getCurrentLocationId(req);
  let where = {
    role_id: roleId,
    type: Activity.TYPE_ON_CHECK_IN,
    company_id: companyId,
    location_id: attendanceData?.store_id,
    shift_id: attendanceData?.shift_id,
  };
  const activityList = await RecurringActivity.findAll({
    where: where,
    include: [
      {
        required: false,
        model: ActivityType,
        as: "activityTypeDetail",
        attributes: ["name","type"],
      },
    ],
  });
  if (activityList && activityList.length > 0) {
    for (let i = 0; i < activityList.length; i++) {
      const { activityTypeDetail, assignee_id, activity_type } = activityList[i];
      let params = {
        userId: userId,
        company_id: companyId,
        user_id: assignee_id,
        activity_type_id: activity_type,
        date: new Date(),
        activity: activityTypeDetail?.name,
        activity_type: activityTypeDetail?.type,
        location_id: currentLocationId
      };
      await create(params);
    }
  }
};

module.exports = {
  create,
  del,
  get,
  update,
  search,
  bulkDelete,
  bulkUpdate,
  createCheckoutActivity,
  updateStatus,
  createActivityOnUserCheckIn
};
