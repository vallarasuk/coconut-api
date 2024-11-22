const { Op } = require("sequelize");
const Response = require("../helpers/Response");
const Boolean = require("../lib/Boolean");
const DataBaseService = require("../lib/dataBaseService");
const DateTime = require("../lib/dateTime");
const Number = require("../lib/Number");
const Request = require("../lib/request");
const History = require("./HistoryService");
const { userRoleService } = require("./UserRoleService");
const { status, User : UserModal } = require("../db").models;
const statusService = new DataBaseService(status);
const Status = require("../helpers/Status");
const ArrayList = require("../lib/ArrayList");
const validator = require(".././lib/validator")
const StatusGroup = require("../helpers/StatusGroup");
const ObjectName = require("../helpers/ObjectName");
const DateHelper = require("../helpers/Date");
const User = require("../helpers/User");
const { userService } = require("./UserService");
const OrderTypeService = require("./OrderTypeService");

const create = async (req, res) => {
  try {
    const data = req.body;
    const companyId = Request.GetCompanyId(req);

    // Validate name
    if (!data.name) {
      return res.json(Response.BAD_REQUEST, { message: "Name is required" });
    }
    const role = [];
    if (data.allowedUser) {
      JSON.parse(data.allowedUser).forEach((data) => {
        role.push(data.value);
      });
    }

    const nextStatus = [];
    if (data.nextStatus) {
      JSON.parse(data.nextStatus).forEach((data) => {
        nextStatus.push(data.value);
      });
    }
    let where = {};

    if (data?.objectName) {
      where.object_name = data?.objectName;
    }
    const sortOrder = await status.findOne({ where, attributes: ["sort_order"], order: [["updatedAt", "DESC"]] });
    let sortNumber;
    if (sortOrder) {
      sortNumber = sortOrder?.dataValues?.sort_order + 1;
    } else {
      sortNumber = 1;
    }
    // Status data
    const createData = {
      name: data?.name,
      company_id: companyId,
      object_name: data?.objectName,
      color_code: data?.colorCode,
      allowed_role_id : role.join(","),
      update_quantity:
        data?.update_quantity == "true" ? Status.UPDATE_QUANTITY_ENABLED : Status.UPDATE_QUANTITY_DISABLED,
      update_quantity_in_location_product:
        data?.update_quantity_in_location_product == "true"
          ? Status.UPDATE_QUANTITY_IN_LOCATION_PRODUCT_ENABLED
          : Status.UPDATE_QUANTITY_IN_LOCATION_PRODUCT_DISABLED,
      not_received_product:
        data?.not_received_product == "true"
          ? Status.NOT_RECEIVED_PRODUCT_ENABLED
          : Status.NOT_RECEIVED_PRODUCT_DISABLED,
      rejected_product:
        data?.rejected_product == "true"
          ? Status.REJECTED_PRODUCT_ENABLED
          : Status.REJECTED_PRODUCT_DISABLED,
      next_status_id: nextStatus.join(","),
      allow_edit: data?.allow_edit == "true" ? Status.ALLOW_EDIT_ENABLED : Status.ALLOW_EDIT_DISABLED,
      notify_to_owner:
        data?.send_notification_to_owner == "true" ? Status.NOTIFY_TO_OWNER_ENABLED : Status.NOTIFY_TO_OWNER_DISABLED,
      group: Number.Get(data?.group),
      sort_order: sortNumber,
      default_owner: data?.default_owner ? data?.default_owner : null,
      location_product_last_stock_entry_date_update:
        data?.location_product_last_stock_entry_date_update == "true"
          ? Status.LOCATION_PRODUCT_LAST_STOCK_ENTRY_DATE_UPDATE_ENABLED
          : Status.LOCATION_PRODUCT_LAST_STOCK_ENTRY_DATE_UPDATE_DISABLED,
      update_product_price:
        data?.update_product_price == "true"
          ? Status.UPDATE_PRODUCT_PRICE_ENABLED
          : Status.UPDATE_PRODUCT_PRICE_DISABLED,
      allow_cancel: data.allow_cancel ? Status.ALLOW_CANCEL : Status.DENY_CANCEL,
      default_reviewer: Number.Get(data?.default_reviewer),
      validate_amount:
        data?.validate_amount == "true" ? Status.VALIDATE_AMOUNT_ENABLED : Status.VALIDATE_AMOUNT_DISABLED,
      allow_refund:
        data?.allow_refund == "true" ? Status.ALLOW_REFUND_ENABLED : Status.ALLOW_REFUND_DISABLED,
      update_account_product:
        data?.update_account_product == "true"
          ? Status.UPDATE_ACCOUNT_PRODUCT_ENABLED
          : Status.UPDATE_ACCOUNT_PRODUCT_DISABLED,
      allow_to_view: data?.allow_to_view == "true" ? Status.ALLOW_TO_VIEW_ENABLED : Status.ALLOW_TO_VIEW_DISABLED,
      allow_replenishment:
        data?.allow_replenishment == "true" ? Status.ALLOW_REPLENISHMENT : Status.ALLOW_REPLENISHMENT,
      is_active_price: data?.is_active_price == "true" ? Status.IS_ACTIVE_PRICE : Status.IS_NOT_ACTIVE_PRICE,
      allow_product_add: data.allow_product_add == "true" ? Status.ALLOW_PRODUCT_ADD : Status.DENY_PRODUCT_ADD,
      ticket_type_id: data?.ticket_type_id ? data?.ticket_type_id : null,
      notify_to_reviewer: data.send_notification_to_reviewer == "true" ? Status.NOTIFY_TO_REVIEWER_ENABLED : Status.NOTIFY_TO_REVIEWER_DISABLED,
      object_id: data?.object_id ? data?.object_id : null,
    };

    if (data.update_distribution_quantity != undefined) {
      createData.update_transferred_quantity = data.update_distribution_quantity
        ? Status.UPDATE_DISTRIBUTION_QUANTITY_ENABLED
        : Status.UPDATE_DISTRIBUTION_QUANTITY_DISABLED;
    }

    try {
      const name = data.name.trim();

      let where = {};
      if (name) {
        where.name = name;
      }
      if (data.objectName) {
        where.object_name = data.objectName;
      }
      if (data.ticket_type_id) {
        where.ticket_type_id = data.ticket_type_id;
      }
      if (data.object_id) {
        where.object_id = data.object_id;
      }
      where.company_id = companyId;
      // Validate duplicate Status name
      const statusExists = await status.findOne({
        where: where,
      });

      if (statusExists) {
        return res.json(Response.BAD_REQUEST, { message: "Status Already Exist" })
      }
      // Create Status
      const statusDetail = await status.create(createData);

      // create a log
      res.on("finish", async () => {
        History.create("Status Created", req, data.objectName, statusDetail?.id);
      });
      // API response
      res.json(Response.OK, { message: "Status Added" });
    } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, { message: err.message });
    }
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const search = async (req, res) => {
  let { page, pageSize, search, sort, sortDir, pagination, ticket_type_id, allow_to_view, object_id } = req.query;
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

  const companyId = Request.GetCompanyId(req);

  // Sortable Fields
  const validOrder = ["ASC", "DESC"];
  const sortableFields = {
    id: "id",
    name: "name",
    color_code: "color_code",
    next_status_id: "next_status_id",
    allowed_role_id: "allowed_role_id",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    object_name: "object_name",


  };

  const sortParam = sort || "object_name";

  // Validate sortable fields is present in sort param
  if (!Object.keys(sortableFields).includes(sortParam)) {
    return res.json(Response.BAD_REQUEST, { message: `Unable to sort product by ${sortParam}` })
  }

  const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
  // Validate order is present in sortDir param
  if (!validOrder.includes(sortDirParam)) {
    return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
  }

  const data = req.query;
  const where = {};

  where.company_id = companyId;

  if (data.statusName) {
    where.name = data.statusName;
  }
  if (data.object_name) {
    where.object_name = data.object_name;
  }

  if (Number.isNotNull(data.order_type)) {
    where.object_id = {
      [Op.in]: data.order_type
    }
  }


  if (Number.isNotNull(ticket_type_id)) {
    where.ticket_type_id = ticket_type_id;
  }

  if (Number.isNotNull(object_id)) {
    where.object_id = object_id;
  }

  if(Number.isNotNull(allow_to_view)){
    where.allow_to_view = allow_to_view
  }
  // Search by name
  const name = data.name;
  if (name) {
    where.name = {
      $like: `%${name}%`,
    };
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
    where,
    order: [["sort_order", "ASC"]],
    include: [
      {
        required: false,
        model: UserModal,
        as: "userDetail",
        attributes: ["id", "name", "last_name", "media_url"],
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

  try {
    // Get Status list and count
    const statusList = await status.findAndCountAll(query);

    // Return Status is null
    if (statusList.count === 0) {
      return res.json({});
    }

    const data = [];
    for (let i = 0; i < statusList.rows.length; i++) {
      const value = statusList.rows[i];
      const roleValue = [];
      if (value.allowed_role_id) {
        const roleIds = value.allowed_role_id.split(",");
        for (let j = 0; j < roleIds.length; j++) {
          const roleId = roleIds[j].trim();
          if (roleId && roleId !== "") {
            try {
              const roleName = await userRoleService.findOne({ where: { id: roleId, company_id: companyId } });
              const dataValue = roleName && roleName.get();
              roleValue.push({
                name: dataValue?.role_name,
                id: dataValue?.id,
              });
            } catch (err) {
              console.log(err);
            }
          }
        }
      }

      let defaultReviewerName = '';
      let defaultReviewerLastName = '';
      let defaultReviewerMediaUrl = '';
      if (value.default_reviewer) {
        try {
          const defaultReviewerDetails = await UserModal.findOne({ where: { id: value.default_reviewer } });
          if (defaultReviewerDetails) {
            defaultReviewerName = defaultReviewerDetails.name;
            defaultReviewerLastName = defaultReviewerDetails.last_name;
            defaultReviewerMediaUrl = defaultReviewerDetails.media_url;
          }
        } catch (err) {
          console.log(err);
        }
      }

      const roleValues = roleValue.map((allowedRole) => allowedRole.name);
      const roles = roleValue;
      let nextStatusValue = [];
      if (value.next_status_id) {
        const nextStatusVlue = value.next_status_id.split(",");
        for (let j = 0; j < nextStatusVlue.length; j++) {
          const nextStatusId = nextStatusVlue[j].trim();
          if (nextStatusId !== "") {
            try {
              const nextStatusName = await status.findOne({ where: { id: nextStatusId, company_id: companyId } });
              const dataValue = nextStatusName.get();
              nextStatusValue.push({
                name: dataValue.name,
                id: dataValue.id,
              });
            } catch (err) {
              console.log(err);
            }
          }
        }
      }

      const nextStatusValues = nextStatusValue.map((nextStatus) => nextStatus.name);
      const nextStatus = nextStatusValue;
      const group = value.group ? StatusGroup.find((data) => data.value == value.group) : '';

      let userId = value?.default_owner == User.LOGGED_IN_USER?req.user.id :value?.default_owner
      let userData = await userService.findOne({where:{id:userId, company_id:companyId}})

      data.push({
        id: value.id,
        name: value.name,
        objectName: value.object_name,
        colorCode: value.color_code,
        sortOrder: value.sort_order,
        nextStatus: nextStatusValues,
        nextStatusId: nextStatus,
        allowedRole: roleValues,
        allowedRoleIds: roles,
        update_quantity: value?.update_quantity === Status.UPDATE_QUANTITY_ENABLED ? true : false,
        update_quantity: value?.allow_edit === Status.ALLOW_EDIT_ENABLED ? true : false,
        createdAt: DateTime.defaultDateFormat(value.createdAt),
        updatedAt: DateTime.defaultDateFormat(value.updatedAt),
        groupValue: value?.group ? value?.group : "",
        group: group ? group?.label : "",
        default_owner:  userData ? userData?.id : "",
        default_owner_name: value?.default_owner == User.LOGGED_IN_USER ? User.LOGGED_IN_USER_TEXT: userData ? userData?.name : "",
        default_owner_media_url: userData ? userData?.media_url : "",
        default_owner_last_name: value && value?.userDetail ? value?.userDetail?.last_name : "",
        updateDistributionQuantity:
          value?.update_transferred_quantity == Status.UPDATE_DISTRIBUTION_QUANTITY_ENABLED ? true : false,
        default_due_date: value && value?.default_due_date ? value?.default_due_date : "",
        defaultDueDate:value && value?.default_due_date === DateHelper.TODAY ? DateTime.toGetISOStringWithDayStartTime(new Date()): value?.default_due_date === DateHelper.TOMORROW ? DateTime.getTomorrow(new Date()):"",
        default_reviewer: value?.default_reviewer,
        default_reviewer_name: defaultReviewerName,
        default_reviewer_last_name: defaultReviewerLastName,
        default_reviewer_media_url: defaultReviewerMediaUrl,
        allowReplenishment: value?.allow_replenishment == Status.ALLOW_REPLENISHMENT ? true : false,
        isActivePrice: value?.is_active_price == Status.IS_ACTIVE_PRICE ? true : false,
        allow_product_add: value?.allow_product_add == Status.ALLOW_PRODUCT_ADD ? true : false,
        update_account_product: value?.update_account_product == Status.UPDATE_ACCOUNT_PRODUCT_ENABLED ? true : false,
        update_quantity_in_location_product:
          value?.update_quantity_in_location_product === Status.UPDATE_QUANTITY_IN_LOCATION_PRODUCT_ENABLED
            ? true
            : false,
            not_received_product:
          value?.not_received_product === Status.NOT_RECEIVED_PRODUCT_ENABLED
            ? true
            : false,
            rejected_product:
          value?.rejected_product === Status.REJECTED_PRODUCT_ENABLED
            ? true
            : false,
        ticket_type: Number.Get(value?.ticket_type_id),
        object_id: Number.Get(value?.object_id),
      });
    }

    res.json(Response.OK, {
      totalCount: statusList.count,
      currentPage: page,
      pageSize,
      data,
      search,
      sort,
      sortDir,
    });
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const updateSortOrder = async (req, res) => {
  const companyId = Request.GetCompanyId(req);
  try {
    const newOrder = req.body;
    // Array of status IDs in the new order
    // Loop through the new order and update each status with its new position
    for (let i = 0; i < newOrder.length; i++) {
      await status.update(
        { sort_order: i + 1 },
        {
          where: {
            id: newOrder[i].id,
            company_id: companyId,
          },
        }
      );
    }
    res.json(Response.OK, {
      message: "Status order updated.",
    });
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const data = req.body;
    const companyId = Request.GetCompanyId(req);
    // Validate name
    if (!data.name) {
      return res.json(Response.BAD_REQUEST, { message: "Name is required" });
    }

    const role = [];
    if (data.allowedUser) {
      JSON.parse(data.allowedUser).forEach((data) => {
        role.push(data.value);
      });
    }

    const nextStatus = [];
    if (data.nextStatus) {
      JSON.parse(data.nextStatus).forEach((data) => {
        nextStatus.push(data.value);
      });
    }

    const updateData = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.object_name) {
      updateData.object_name = data.objectName;
    }
    if (data.colorCode) {
      updateData.color_code = data.colorCode;
    }
    if (ArrayList.isNotEmpty(role)) {
      updateData.allowed_role_id = role.join(",");
    }

    updateData.next_status_id = nextStatus.join(",");

    if (data.sortorder) {
      updateData.sort_order = Number.Get(data.sortOrder);
    }
    if (data?.default_owner || data?.default_owner === "") {
      updateData.default_owner = Number.isNotNull(data?.default_owner) ? data?.default_owner : null;
    }
    if (data?.default_reviewer || data?.default_reviewer === "") {
      updateData.default_reviewer = Number.isNotNull(data?.default_reviewer) ? data?.default_reviewer :null;
    }

    updateData.location_product_last_stock_entry_date_update =
      data.location_product_last_stock_entry_date_update == "true"
        ? Status.LOCATION_PRODUCT_LAST_STOCK_ENTRY_DATE_UPDATE_ENABLED
        : Status.LOCATION_PRODUCT_LAST_STOCK_ENTRY_DATE_UPDATE_DISABLED;

    (updateData.update_product_price =
      data?.update_product_price == "true"
        ? Status.UPDATE_PRODUCT_PRICE_ENABLED
        : Status.UPDATE_PRODUCT_PRICE_DISABLED),
      (updateData.update_quantity =
        data.update_quantity == "true" ? Status.UPDATE_QUANTITY_ENABLED : Status.UPDATE_QUANTITY_DISABLED);
    updateData.update_quantity_in_location_product =
      data.update_quantity_in_location_product == "true"
        ? Status.UPDATE_QUANTITY_IN_LOCATION_PRODUCT_ENABLED
        : Status.UPDATE_QUANTITY_IN_LOCATION_PRODUCT_DISABLED;
    updateData.not_received_product=
      data?.not_received_product == "true"
        ? Status.NOT_RECEIVED_PRODUCT_ENABLED
        : Status.NOT_RECEIVED_PRODUCT_DISABLED,
      updateData.rejected_product=
      data?.rejected_product == "true"
        ? Status.REJECTED_PRODUCT_ENABLED
        : Status.REJECTED_PRODUCT_DISABLED,

      updateData.allow_edit = data.allow_edit == "true" ? Status.ALLOW_EDIT_ENABLED : Status.ALLOW_EDIT_DISABLED;

    updateData.notify_to_owner =
      data.send_notification_to_owner == "true" ? Status.NOTIFY_TO_OWNER_ENABLED : Status.NOTIFY_TO_OWNER_DISABLED;
    updateData.validate_amount =
      data.validate_amount == "true" ? Status.VALIDATE_AMOUNT_ENABLED : Status.VALIDATE_AMOUNT_DISABLED;
    updateData.allow_refund =
      data.allow_refund == "true" ? Status.ALLOW_REFUND_ENABLED : Status.ALLOW_REFUND_DISABLED;
    updateData.update_account_product =
      data.update_account_product == "true"
        ? Status.UPDATE_ACCOUNT_PRODUCT_ENABLED
        : Status.UPDATE_ACCOUNT_PRODUCT_DISABLED;
    updateData.allow_to_view =
      data.allow_to_view == "true" ? Status.ALLOW_TO_VIEW_ENABLED : Status.ALLOW_TO_VIEW_DISABLED;

    if (data.group) {
      updateData.group = Number.Get(data.group);
    }

    if (data.allow_cancel != undefined) {
      updateData.allow_cancel = data.allow_cancel ? Status.ALLOW_CANCEL : Status.DENY_CANCEL;
    }

    if (data.update_distribution_quantity != undefined) {
      updateData.update_transferred_quantity = data.update_distribution_quantity
        ? Status.UPDATE_DISTRIBUTION_QUANTITY_ENABLED
        : Status.UPDATE_DISTRIBUTION_QUANTITY_DISABLED;
    }

    if (data.allow_replenishment != undefined) {
      updateData.allow_replenishment =
        data.allow_replenishment == "true" ? Status.ALLOW_REPLENISHMENT : Status.DENY_REPLENISHMENT;
    }
    if (data.allow_product_add != undefined) {
      updateData.allow_product_add =
        data.allow_product_add == "true" ? Status.ALLOW_PRODUCT_ADD : Status.DENY_PRODUCT_ADD;
    }

    if (data.is_active_price != undefined) {
      updateData.is_active_price = data.is_active_price == "true" ? Status.IS_ACTIVE_PRICE : Status.IS_NOT_ACTIVE_PRICE;
    }

    updateData.default_due_date = data?.default_due_date ? data?.default_due_date : "";

    updateData.notify_to_reviewer = data.send_notification_to_reviewer == "true" ? Status.NOTIFY_TO_REVIEWER_ENABLED : Status.NOTIFY_TO_REVIEWER_DISABLED;
    try {
      const name = data.name.trim();

      let where = {};

      if (name) {
        where.name = name;
      }

      if (Number.isNotNull(data.objectName)) {
        where.object_name = data.objectName;
      }

      if (Number.isNotNull(data.id)) {
        where.id = { [Op.ne]: data.id };
      }

      if (Number.isNotNull(data.ticket_type_id)) {
        where.ticket_type_id = data.ticket_type_id;
      }

      if (Number.isNotNull(data.object_id)) {
        where.object_id = data.object_id;
      }

      where.company_id = companyId;
      // Validate duplicate Status name
      const statusExists = await status.findOne({
        where: where,
      });
      if (statusExists) {
        return res.json(Response.BAD_REQUEST, { message: "Status Already Exist" });
      }
      await status.update(updateData, {
        where: {
          id: data.id,
          company_id: companyId,
        },
      });

      // create a log
      res.on('finish', async () => {
        History.create("Status Updated", req, data.objectName, data.id);
      });
      // API response
      res.json(Response.OK, { message: "Status Updated" });
    } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, { message: err.message });
    }
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const get = async (req, res, next) => {
  try {
    const company_id = Request.GetCompanyId(req);

    const id = req.params.id;

    if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid Id" });
    }

    let statusWhere = {};

    if (id && id !== "null") {
      statusWhere.id = id;
    }

    statusWhere.company_id = company_id;

    const statusDetail = await status.findOne({ where: statusWhere });

    let roleValue = [];

    if (statusDetail && statusDetail.allowed_role_id) {
      let role = statusDetail.allowed_role_id.split(`,`);
      if (role && role.length > 0) {
        try {
          for (let i = 0; i < role.length; i++) {
            let roleName = await userRoleService.findOne({ where: { id: role[i], company_id } });
            const data = roleName.get();
            roleValue.push({
              id: data.id,
              name: data.role_name,
            });
          }
        } catch (err) {
          console.log(err);
        }
      }
    }

    let nextStatusValue = [];
    
    if (statusDetail && statusDetail.next_status_id) {
      let statusId = statusDetail.next_status_id.split(`,`);

      if (status) {
        try {
          for (let i = 0; i < statusId.length; i++) {
            let where = {};

            if (statusId[i]) {
              where.id = statusId[i];
            }

            where.company_id = company_id;

            let statusName = await status.findOne({ where: where });
            const data = statusName && statusName.get();
            nextStatusValue.push({
              id: data?.id,
              name: data?.name,
            });
          }
        } catch (err) {
          console.log(err);
        }
      }
    }

    let data = {
      id: statusDetail.id,
      name: statusDetail.name,
      colorCode: statusDetail.color_code !== "undefined" ? statusDetail.color_code : "",
      object_name: statusDetail.object_name,
      allowedUser: roleValue,
      nextStatus: nextStatusValue,
      sortOrder: statusDetail.sort_order,
      update_quantity: statusDetail.update_quantity,
      not_received_product: statusDetail.not_received_product,
      rejected_product: statusDetail.rejected_product,
      update_quantity_in_location_product: statusDetail.update_quantity_in_location_product,
      allow_edit: statusDetail.allow_edit,
      groupValue: statusDetail.group,
      location_product_last_stock_entry_date_update: statusDetail.location_product_last_stock_entry_date_update,
      update_product_price: statusDetail.update_product_price,
      notifyToOwner: statusDetail.object_name === "FINE" ? 1 : statusDetail.notify_to_owner,
      allowCancel: statusDetail.allow_cancel,
      updateDistributionQuantity:
        statusDetail.update_transferred_quantity == Status.UPDATE_DISTRIBUTION_QUANTITY_ENABLED ? true : false,
      allowReplenishment: statusDetail.allow_replenishment == Status.ALLOW_REPLENISHMENT ? true : false,
      allow_product_add: statusDetail.allow_product_add == Status.ALLOW_PRODUCT_ADD ? true : false,
      isActivePrice: statusDetail?.is_active_price == Status.IS_ACTIVE_PRICE ? true : false,
      ticket_type: statusDetail?.ticket_type_id,
      object_id: statusDetail?.object_id,
      group:
        statusDetail.group == Status.GROUP_NEW
          ? Status.GROUP_NEW_TEXT
          : statusDetail.group === Status.GROUP_DRAFT
            ? Status.GROUP_DRAFT_TEXT
            : statusDetail.group === Status.GROUP_REVIEW
              ? Status.GROUP_REVIEW_TEXT
              : statusDetail.group === Status.GROUP_PENDING
                ? Status.GROUP_PENDING_TEXT
                : statusDetail.group === Status.GROUP_APPROVED
                  ? Status.GROUP_APPROVED_TEXT
                  : (statusDetail.group === Status.GROUP_COMPLETED) == Status.GROUP_COMPLETED_TEXT,
      default_owner: statusDetail?.default_owner && await GetDefaultOwner(statusDetail?.default_owner, req.user.id),
      default_due_date: statusDetail?.default_due_date ? statusDetail?.default_due_date : '',
      default_reviewer: statusDetail?.default_reviewer,
      validate_amount: statusDetail?.validate_amount,
      allow_refund: statusDetail?.allow_refund,
      update_account_product: statusDetail?.update_account_product,
      allow_to_view: statusDetail?.allow_to_view,
      notifyToReviewer: statusDetail.notify_to_reviewer,
    };
    res.json(data);
  } catch (err) {
    console.log(err);
    next(err);
  }
};

const del = async (req, res, next) => {
  const id = req.params.id;
  let data = req.params;
  try {
    console.log("req.params-", req.params);

    const company_id = Request.GetCompanyId(req);
    await status.destroy({
      where: {
        id: id,
        company_id: company_id,
      },
    });

    res.json(Response.OK, { message: "Status Deleted" });

    res.on("finish", async () => {
      // create system log for Status updation
      History.create("Status Deleted", req, data?.objectName, id);
    });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const nextStatusSearch = async (req, res) => {
  try {
    const { currentStatus, projectId, allowed_statuses } = req.query;

    if (!currentStatus || isNaN(currentStatus)) {
      return res.json(Response.BAD_REQUEST, { message: "Current Status is Required" });
    }

    const companyId = Request.GetCompanyId(req);

    const userRole = Request.getUserRole(req);

    let currentStatusWhere = {};

    if (currentStatus && currentStatus !== "undefined") {
      currentStatusWhere.id = currentStatus;
    }

  

    currentStatusWhere.company_id = companyId;

    const currentStatusData = await status.findOne({ where: currentStatusWhere });
    if (!currentStatusData) {
      return res.json(Response.BAD_REQUEST, { message: "Current Status Not Found" });
    }

    let nextStatusIds = new Array();

    const where = new Object();

    if (currentStatusData && currentStatusData.next_status_id) {
      nextStatusIds = ArrayList.StringIntoArray(currentStatusData.next_status_id);

      where.company_id = companyId;

      if (nextStatusIds && nextStatusIds.length > 0 && allowed_statuses =="undefined") {
        where.id = {
          [Op.in]: nextStatusIds,
        };
      }

      if(allowed_statuses && allowed_statuses !=="undefined"){
        let includedIds = nextStatusIds.filter((id) => allowed_statuses.includes(id.toString()));
        where.id = { [Op.in]: includedIds };
      }

      const query = {
        where,
        sort: [["sort_order", "ASC"]],
    };

      // Get Status list and count
      const statusList = await status.findAll(query);

      // Return Status is null
      if (statusList.count === 0) {
        return res.json({});
      }

      const data = [];
      statusList.forEach((list) => {
        let allowedRoleIds;
        const { id, name, object_name, color_code, createdAt, updatedAt, sort_order, allowed_role_id } = list.get();

        if (allowed_role_id) {
          allowedRoleIds = ArrayList.StringIntoArray(allowed_role_id);
        }

        if (allowedRoleIds && allowedRoleIds.length > 0 && allowedRoleIds.indexOf(userRole) > -1) {
          data.push({
            id,
            name,
            objectName: object_name,
            color_code,
            sort_order,
            allowed_role_id,
            createdAt: DateTime.defaultDateFormat(createdAt),
            updatedAt: DateTime.defaultDateFormat(updatedAt),
          });
        }
      });

      res.json(Response.OK, {
        totalCount: statusList.count,
        data,
      });
    } else {
      res.json(Response.OK, {
        data: [],
      });
    }
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const getData = async (status, companyId) => {
  try {
    let statusDetail = await statusService.findOne({
      where: { id: status, company_id: companyId },
    });

    if (statusDetail && statusDetail?.default_due_date === DateHelper.TODAY) {
      statusDetail["default_due_date"] = DateTime.toGetISOStringWithDayStartTime(new Date());
    } else if (statusDetail && statusDetail?.default_due_date === DateHelper.TOMORROW) {
      statusDetail["default_due_date"] = DateTime.getTomorrow(new Date());
    }

    return statusDetail;
  } catch (err) {
    console.log(err);
  }
};
const getFirstStatus = async (objectName, companyId, typeId,objectId) => {
  try {
    let where = {};

    if (objectName) {
      where.object_name = objectName;
    }
    if (objectId) {
      where.object_id = objectId;
    }

    where.company_id = companyId;

    if (typeId) {
      where.ticket_type_id = typeId;
    }

    let statusDetail = await statusService.findOne({
      where: where,
      order: [["sort_order", "ASC"]],
    });

    return statusDetail && statusDetail.id;
  } catch (err) {
    console.log(err);
  }
};
const getFirstStatusDetail = async (objectName, companyId, allowed_statuses,objectId) => {
  try {
    let where = {};

    if (objectName) {
      where.object_name = objectName;
    }

    where.company_id = companyId;

    if (objectId) {
      where.object_id = objectId;
    }

    if (allowed_statuses) {
      where.id = { [Op.in]: allowed_statuses };
    }

    let statusDetail = await statusService.findOne({
      where: where,
      order: [["sort_order", "ASC"]],
    });

    if (statusDetail && statusDetail?.default_due_date === DateHelper.TODAY) {
      statusDetail['due_date'] = DateTime.toGetISOStringWithDayStartTime(new Date());
    } else if (statusDetail && statusDetail?.default_due_date === DateHelper.TOMORROW) {
      statusDetail['due_date'] = DateTime.getTomorrow(new Date());
    }

    return statusDetail;
  } catch (err) {
    console.log(err);
  }
};
const isCompleted = async (statusId, companyId) => {
  try {
    let statusDetail = await statusService.findOne({
      where: { company_id: companyId, object_name: ObjectName.TICKET, id: statusId },
    });

    return statusDetail && statusDetail;
  } catch (err) {
    console.log(err);
  }
};

const Get = async (object, groupId, companyId, condition) => {
  try {
    let where = new Object();

    where.company_id = companyId;

    where.object_name = object;

    if (groupId) {
      where.group = groupId;
    }

    if (condition) {
      where = { ...where, ...condition };
    }

    const statusDetail = await statusService.findOne({ where: where });

    return statusDetail;
  } catch (err) {
    console.log(err);
  }
};

const list = async (req, res) => {
  try {
    let { group_id, objectName } = req.query;
    const companyId = Request.GetCompanyId(req);

    const where = new Object();

    where.company_id = companyId;

    if (group_id) {
      where.group = group_id;
    }

    if (objectName) {
      where.object_name = objectName;
    }

    const query = {
      where,
      order: [["sort_order", "ASC"]],
    };

    // Get Status list and count
    const statusList = await status.findAndCountAll(query);

    // Return Status is null
    if (statusList.count === 0) {
      return res.json({});
    }

    const data = [];

    for (let i = 0; i < statusList.rows.length; i++) {
      const value = statusList.rows[i];
      data.push({
        value: value.id,
        label: value.name,
        id: value.id,
        name: value.name,
      });
    }

    return {
      data,
    };
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const GetDefaultOwner = async (id, userId) => {
  try{
    if(Number.isNotNull(id)){
      return  id == User.LOGGED_IN_USER?Number.Get(userId): Number.Get(id);
    }else{
      return Number.Get(userId)
    }
  }catch(err){
    console.log(err);
  }
};

const getDueDate = async (status_id, companyId) => {
  let statusDetail = await getData(status_id, companyId);

  let dueDate = null;
  if (statusDetail && statusDetail?.default_due_date === DateHelper.TODAY) {
    dueDate = DateTime.toGetISOStringWithDayStartTime(new Date());
  } else if (statusDetail && statusDetail?.default_due_date === DateHelper.TOMORROW) {
    dueDate = DateTime.getTomorrow(new Date());
  }
  return dueDate;
};

const GetAllowToViewStatusIds = async (objectName, companyId) => {
  try {
    let where = new Object();

    where.company_id = companyId;
    where.object_name = objectName;
    where.allow_to_view = Status.ALLOW_TO_VIEW_ENABLED;

    const statusDetail = await statusService.find({ where: where });

    let statusArray = [];
    if (statusDetail && statusDetail.length > 0) {
      for (let i = 0; i < statusDetail.length; i++) {
        statusArray.push(statusDetail[i].id);
      }
      return statusArray;
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
  }
};

const getPendingStatuses = async (req, res) => {
  try {
    let { group_id } = req.query;
    const companyId = Request.GetCompanyId(req);

    const where = new Object();

    where.company_id = companyId;

    if (group_id) {
      where.group = group_id;
    }
    const query = {
      where,
      order: [["sort_order", "ASC"]],
    };

    // Get Status list and count
    const statusList = await status.findAndCountAll(query);
    const data = [];
    for (let i = 0; i < statusList.rows.length; i++) {
      const value = statusList.rows[i];
      data.push({
        id: value.id,
        name: value.name,
      });
    }

    return {
      data,
    };
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const getAllStatusByGroupId = async (object, groupId, companyId, excludeGroupId, condition) => {
  try {
    let where = new Object();

    where.company_id = companyId;

    where.object_name = object;

    if (groupId) {
      where.group = groupId;
    }
    if (excludeGroupId) {
      where.group = {
        [Op.ne]: excludeGroupId,
      };
    }

    if (condition) {
      where = { ...where, ...condition };
    }

    const statusDetail = await statusService.find({ where: where });

    return statusDetail;
  } catch (err) {
    console.log(err);
  }
};
const getNextStatus = async (currentStatus,companyId) => {
  try {
    let currentStatusWhere = {};

    if (currentStatus && currentStatus !== "undefined") {
      currentStatusWhere.id = currentStatus;
    }

    currentStatusWhere.company_id = companyId;

    const currentStatusData = await status.findOne({ where: currentStatusWhere });
   

    let nextStatusIds = new Array();


    if (currentStatusData && currentStatusData.next_status_id) {
      nextStatusIds = ArrayList.StringIntoArray(currentStatusData.next_status_id);

    }
    
    return nextStatusIds
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  create,
  search,
  update,
  del,
  get,
  nextStatusSearch,
  getData,
  getFirstStatus,
  Get,
  updateSortOrder,
  list,
  isCompleted,
  getFirstStatusDetail,
  GetDefaultOwner,
  getDueDate,
  GetAllowToViewStatusIds,
  getPendingStatuses,
  getAllStatusByGroupId,
  getNextStatus
};
