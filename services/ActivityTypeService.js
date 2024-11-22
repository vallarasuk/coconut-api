const ObjectName = require("../helpers/ObjectName");
const Permission = require("../helpers/Permission");
const { BAD_REQUEST, OK } = require("../helpers/Response");
const Request = require("../lib/request");
const History = require("./HistoryService");
const errors = require("restify-errors");
const validator = require("../lib/validator");
const DateTime = require("../lib/dateTime")
const activityType = require("../routes/activityType/processList");

const { ActivityType } = require("../db").models;
const { Op } = require("sequelize");
const Boolean = require("../lib/Boolean");

const ActivityTypeGroup = require("../helpers/ActivityTypeGroup");

const create = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.ACTIVITY_TYPE_ADD, req);


  const data = req.body;
  // Validate name
  if (!data.name) {
    return res.json(BAD_REQUEST, { message: "Name is required" });
  }

  const companyId = req.user && req.user.company_id;

  if (!companyId) {
    return res.json(400, { message: "Company Not Found" });
  }

  try {

    const name = data.name.trim();

    // Validate duplicate product brand name
    const activityExist = await ActivityType.findOne({
      where: { name: name, company_id: companyId },
    });

    if (activityExist) {
      return res.json(BAD_REQUEST, { message: " Activity Type Name Already Exist" });
    }

    let approves;
    if (data.approvers && data.approvers.label) {
      approves = data.approvers.label;
    }
    let maxHours;
    if (data.max_hours && data.max_hours.key) {
      maxHours = data.max_hours.key;
    }

    let defaultStatus;
    if (data.default_status && data.default_status.value) {
      defaultStatus = data.default_status.value;
    }
    const userRoles = data.user_roles || "";

    //To find the keys of userRoles
    const Keys = [];
    for (let i = 0; i < userRoles.length; i++) {
      Keys.push(userRoles[i].value);
    }
    const userKeys = [...Keys];
    // Activity Type data
    const activityTypeData = {
      name: data.name,
      company_id: companyId,
      name: data.name,
      type: data.type,
      sort: data.sort,
      user_roles: userKeys.toString(),
      question: data.question,
      slack_id: data.slack_id,
      approvers: approves,
      auto_add: data.auto_add ? data.auto_add : false,
      max_hours: maxHours,
      update_login: data.update_login ? data.update_login : false,
      update_logout: data.update_logout ? data.update_logout : false,
      validate_completed_tickets: data.validation_completed_ticket ?data.validation_completed_ticket : false,
      validate_eta: data.validation_eta ? data.validation_eta : false,
      validate_needexplanation_activities:
        data.validation_need_explanation_activity ? data.validation_need_explanation_activity : false,
      validate_next_working_day_story_points:
        data.validation_next_working_day_story_points ? data.validation_next_working_day_story_points : false, 
      validate_pending_activities: data.validation_pending_activities ? data.validation_pending_activities : false,
      validate_productive_hours: data.validation_productive_hours ? data.validation_productive_hours : false,
      validate_productivity_cost: data.validation_productivity_cost ? data.validation_productivity_cost : false,
      validate_reported_tickets: data.validation_reported_tickets ? data.validation_reported_tickets : false,
      validate_reported_tickets_story_points:
        data.validation_reported_tickets_story_points ? data.validation_reported_tickets_story_points : false,
      validate_working_hours: data.validate_working_hours ? data.validate_working_hours : false,
      is_screenshot_required: data.is_screenshot_required ? data.is_screenshot_required : false,
      allow_manual_entry: data.allow_manual_entry ? data.allow_manual_entry : false,
      need_explanation: data.need_explanation ? data.need_explanation : false,
      show_executed_test_case_count: data.show_executed_test_case_count ?data.show_executed_test_case_count : false,
      show_hour_selection: data.show_hour_selection ? data.show_hour_selection : false,
      show_notes: data.show_notes ? data.show_notes : false,
      show_reported_tickets_count: data.show_reported_tickets_count ? data.show_reported_tickets_count : false,
      max_entries_per_day: data.max_entries_per_day,
      default_status: defaultStatus,
      model: data.model_name,
      allow_date_selection: data.allow_date_selection ? data.allow_date_selection : false,
      is_ticket_required: data.is_ticket_required ? data.is_ticket_required : false,
      validate_required_activities: data.validation_required_activities ? data.validation_required_activities : false,
      is_code_commit_required: data.is_code_commit_required ? data.is_code_commit_required : false,
      notify_user: data.notify_user ? data.notify_user : false,
      show_in_user_status: data.show_in_user_status ? data.show_in_user_status :  false,
      is_ticket_activity: data.is_ticket_activity ? data.is_ticket_activity : false,
      required: data.requiredactivity ? data.requiredactivity : false,
      ticket_types: data.ticket_types,
      validate_pending_review_tickets:
        data.validation_pending_review_tickets ? data.validation_pending_review_tickets : false,
      group: data.activityTypeGroup ? data.activityTypeGroup.value : null

    };
    // Create new Activity Type
    const detail = await ActivityType.create(activityTypeData);
    //create a log
    History.create("Activity Type Added", req, ObjectName.ACTIVITY_TYPE, detail?.id);

    // API response
    res.json(OK, { message: "Activity Type Added" });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

const del = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.ACTIVITY_TYPE_DELETE, req);



  let companyId = Request.GetCompanyId(req)
  try {
    const id = parseInt(req.params.id);
    //validating id
    if (!id) {
      return res
        .status(400)
        .send({ message: "Activity type id is required" });
    }

    const activityTypeDetails = await ActivityType.findOne({
      attributes: ["id"],
      where: {
        id: id,
        company_id: companyId
      },
    });
    try {

      //Validating id the id
      if (!activityTypeDetails) {
        return res.status(400).send({ message: "Activity Type not found" });
      }
      const detail = await activityTypeDetails.destroy();
      //create a log for error
      History.create("Activity Type Deleted", req, ObjectName.ACTIVITY_TYPE,detail?.id);

      res.send({
        message: "Activity Type Deleted",
      });
    } catch (err) {
      res.status(400).send({ message: err.message });
      next(err);
    }
  } catch (err) {
    console.log(err);
  }
}
const update = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.ACTIVITY_TYPE_EDIT, req);


  let companyId = Request.GetCompanyId(req)
  try {
    const data = req.body;
    const id = parseInt(req.params.id, 10);

    const userRoles = data.user_roles || "";

    //To find the keys of userRoles
    const Keys = [];
    for (let i = 0; i < userRoles.length; i++) {
      Keys.push(userRoles[i].value);
    }
    const userKeys = [...Keys];

    let approves;
    if (data.approvers && data.approvers.label) {
      approves = data.approvers.label;
    }

    //to find the key of max_house to store in db
    let maxHours;
    if (data.max_hours && data.max_hours.key) {
      maxHours = data.max_hours.key;
    }

    let defaultStatus;
    if (data.default_status && data.default_status.value) {
      defaultStatus = data.default_status.value;
    }

    const updateData = {
      name: data.name,
      type: data.type,
      sort: data.sort,
      user_roles: userKeys.toString(),
      question: data.question,
      slack_id: data.slack_id,
      approvers: approves,
      auto_add: data.auto_add,
      max_hours: maxHours,
      update_login: data.update_login,
      update_logout: data.update_logout,
      validate_completed_tickets: data.validation_completed_ticket,
      validate_eta: data.validation_eta,
      validate_needexplanation_activities:
        data.validation_need_explanation_activity,
      validate_next_working_day_story_points:
        data.validation_next_working_day_story_points,
      validate_pending_activities: data.validation_pending_activities,
      validate_productive_hours: data.validation_productive_hours,
      validate_productivity_cost: data.validation_productivity_cost,
      validate_reported_tickets: data.validation_reported_tickets,
      validate_reported_tickets_story_points:
        data.validation_reported_tickets_story_points,
      validate_working_hours: data.validate_working_hours,
      is_screenshot_required: data.is_screenshot_required,
      allow_manual_entry: data.allow_manual_entry,
      need_explanation: data.need_explanation,
      show_executed_test_case_count: data.show_executed_test_case_count,
      show_hour_selection: data.show_hour_selection,
      show_notes: data.show_notes,
      show_reported_tickets_count: data.show_reported_tickets_count,
      max_entries_per_day: data.max_entries_per_day,
      default_status: defaultStatus,
      model: data.model_name,
      allow_date_selection: data.allow_date_selection,
      is_ticket_required: data.is_ticket_required,
      validate_required_activities: data.validation_required_activities,
      is_code_commit_required: data.is_code_commit_required,
      notify_user: data.notify_user,
      show_in_user_status: data.show_in_user_status,
      is_ticket_activity: data.is_ticket_activity,
      required: data.requiredactivity,
      ticket_types: data.ticket_types,
      validate_pending_review_tickets:
        data.validation_pending_review_tickets,
      group: data.activityTypeGroup ? data.activityTypeGroup : null
    };    
    const [detail] = await ActivityType.update(updateData, {
      where: { id,company_id: companyId },
    });
    //create log for error
    History.create("Activity Type Updated", req, ObjectName.ACTIVITY_TYPE, detail);
    res.send(200, {
      message: "Activity Type Updated",
    });

  } catch (err) {
    console.log(err);
  }
}

const search = async (req, res, next) => {
  try {

    let { page, pageSize, search, sort, sortDir, pagination, status } = req.query;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
      return res.json(400, { message: "Company Not Found" });
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      name: "name",
      status: "status",
      sort: "sort",
      created_at: "created_at",
      updated_at: "updated_at",
      type: "type",
      id:"id",
    };

    const sortParam = sort || "name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, {
        message: `Unable to sort by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;

    const where = {};

    where.company_id = companyId;

    if (status) {
      data.status_text = status
    }
    // Search term
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
      order: [[sortableFields[sortParam], sortDirParam]],
      where,
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

    // Get sprint list and count
    const activityTypeDetails = await ActivityType.findAndCountAll(query);

    // Return sprint is null
    if (activityTypeDetails.count === 0) {
      return res.json({});
    }

    const activityTypeData = [];

    activityTypeDetails.rows.forEach((activityTypeDetail) => {
      const {
        id,
        name,
        question,
        sort,
        user_roles,
        default_status,
        type,
        is_screenshot_required,
        allow_date_selection,
        is_code_commit_required,
        is_ticket_required,
        max_hours,
        max_entries_per_day,
        auto_add,
        show_executed_test_case_count,
        show_reported_tickets_count,
        approvers,
        show_hour_selection,
        required,
        update_logout,
        update_login,
        validate_pending_activities,
        validate_required_activities,
        user_ids,
        validate_working_hours,
        validate_productive_hours,
        validate_productivity_cost,
        validate_reported_tickets,
        validate_completed_tickets,
        need_explanation,
        allow_manual_entry,
        validate_eta,
        model,
        ticket_types,
        show_notes,
        slack_id,
        validate_needexplanation_activities,
        show_in_user_status,
        image,
        is_ticket_activity,
        validate_next_working_day_story_points,
        validate_reported_tickets_story_points,
        notify_user,
        validate_pending_review_tickets,
        company_id,
        created_at,
        group
      } = activityTypeDetail;

      activityTypeData.push({
        id: activityTypeDetail.id,
        status: activityTypeDetail.status,
        name: activityTypeDetail.name,
        sort: parseFloat(activityTypeDetail.sort),
        name,
        question,
        sort,
        user_roles,
        default_status,
        type,
        is_screenshot_required,
        allow_date_selection,
        is_code_commit_required,
        is_ticket_required,
        max_hours,
        max_entries_per_day,
        auto_add,
        show_executed_test_case_count,
        show_reported_tickets_count,
        approvers,
        show_hour_selection,
        required,
        update_logout,
        update_login,
        validate_pending_activities,
        validate_required_activities,
        user_ids,
        validate_working_hours,
        validate_productive_hours,
        validate_productivity_cost,
        validate_reported_tickets,
        validate_completed_tickets,
        need_explanation,
        allow_manual_entry,
        validate_eta,
        model,
        ticket_types,
        show_notes,
        slack_id,
        validate_needexplanation_activities,
        show_in_user_status,
        image,
        is_ticket_activity,
        validate_next_working_day_story_points,
        validate_reported_tickets_story_points,
        notify_user,
        validate_pending_review_tickets,
        activityTypeGroupText: group == ActivityTypeGroup.CHECK_IN ? ActivityTypeGroup.CHECK_IN_TEXT : group == ActivityTypeGroup.CHECK_OUT ? ActivityTypeGroup.CHECK_OUT_TEXT : "",
        company_id,
        created_at
      });
    });

    res.json(OK, {
      totalCount: activityTypeDetails.count,
      currentPage: page,
      pageSize,
      data: activityTypeData,
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }



}

const get = (req, res, next) => {
  try {
    let companyId = Request.GetCompanyId(req)

  const id = req.params.id;
  ActivityType.findOne({
    where: { id, company_id: companyId },
  })
    // eslint-disable-next-line new-cap
    .then((activity) => res.json(activityType(activity)));
  } catch (err) {
    console.log(err);
  }
}



module.exports = {
  create,
  del,
  update,
  search,
  get,
}