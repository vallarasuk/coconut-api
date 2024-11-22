const ObjectName = require("../helpers/ObjectName");
const DateTime = require("../lib/dateTime");
const Request = require("../lib/request");
const History = require("./HistoryService");
const Permission = require("../helpers/Permission");
const {
  BAD_REQUEST,
  UPDATE_SUCCESS,
  OK,
  DELETE_SUCCESS,
} = require("../helpers/Response");
const String = require("../lib/string");
const validator = require("../lib/validator");
const Boolean = require("../lib/Boolean");
const { Op } = require("sequelize");
const TicketNotificationService = require("./notifications/ticket");
const StatusService = require("../services/StatusService");
const Url = require("../lib/Url");
const Status = require("../helpers/Status");
const projectSettingService = require("./projectSettingService");
const { DEFAULT_REVIEWER } = require("../helpers/Setting");
const Setting = require("../helpers/Setting");
const TicketTestService = require("./TicketTestService");
const UserService = require("./UserService");
const CompanyService = require("./CompanyService");
const SlackService = require("./SlackService");
const CommentService = require("./CommentService");
const Number = require("../lib/Number");
const Response = require("../helpers/Response");
const NotificationService = require("./NotificationService");
const SlackTicketService = require("./SlackTicketService");
const ArrayList = require("../lib/ArrayList");
const LocationService = require("./LocationService");
const { STATUS_ACTIVE } = require("../helpers/User");
const { getSettingValueByObject, getSettingValue } = require("./SettingService");
const StockEntryProductService = require("./StockEntryProductService");
const Currency = require("../lib/currency");
const { fineService } = require("./FineBonusService");

// Model
const {
  Ticket,
  User,
  Project,
  status: StatusModal,
  TicketIndex,
  ProjectSettingModel,
  ProjectTicketType,
  ProjectComponent,
  SaleSettlement,
  Attendance,
  Shift: shiftModel,
  order: orderModel,
  Tag

} = require("../db").models;

const reindex = async (ticket_id, companyId) => {
  if (!ticket_id) {
    History.create("Ticket Reindex : Ticket Id Required");
    return null;
  }
  if (!companyId) {
    History.create("Ticket Reindex : company_id Id Required");
    return null;
  }

  let isTicketExist = await TicketIndex.findOne({ where: { ticket_id: ticket_id, company_id: companyId } });

  if (isTicketExist) {
    // Delete All Privious Records
    await TicketIndex.destroy({
      where: { company_id: companyId, ticket_id: ticket_id },
      force: true,
    });
  }

  History.create("Ticket Reindex : Ticket index Table Destroyed");

  // Get All Ticket Details

  const ticketDetail = await Ticket.findOne({
    where: { company_id: companyId, id: ticket_id },
    include: [{ model: StatusModal, as: "statusDetail" }],
  });
  let reIndexData = {};

  reIndexData.company_id = companyId;
  if (ticketDetail) {
    if (ticketDetail.id) {
      reIndexData.ticket_id = ticketDetail.id;
    }
    if (ticketDetail.summary) {
      reIndexData.summary = ticketDetail.summary;
    }
    if (ticketDetail.from_location) {
      reIndexData.from_location = ticketDetail.from_location;
    }
    if (ticketDetail.to_location) {
      reIndexData.to_location = ticketDetail.to_location;
    }

    if (ticketDetail.due_date) {
      reIndexData.due_date = ticketDetail.due_date;
    }
    if (ticketDetail.ticket_number) {
      reIndexData.ticket_number = ticketDetail.ticket_number;
    }
    if (ticketDetail.assignee_id) {
      reIndexData.assignee_id = ticketDetail.assignee_id;
    }
    if (ticketDetail.reviewer) {
      reIndexData.reviewer = ticketDetail.reviewer;
    }
    if (ticketDetail.project_id) {
      reIndexData.project_id = ticketDetail.project_id;
    }
    if (ticketDetail.reporter_id) {
      reIndexData.reporter_id = ticketDetail.reporter_id;
    }
    if (ticketDetail.status) {
      reIndexData.status = ticketDetail.status;
    }
    if (ticketDetail.description) {
      reIndexData.description = ticketDetail.description;
    }
    if (ticketDetail.sprint) {
      reIndexData.sprint = ticketDetail.sprint;
    }
    if (ticketDetail.acceptance_criteria) {
      reIndexData.acceptance_criteria = ticketDetail.acceptance_criteria;
    }
    if (ticketDetail.environment) {
      reIndexData.environment = ticketDetail.environment;
    }
    if (ticketDetail.test_step) {
      reIndexData.test_step = ticketDetail.test_step;
    }
    if (ticketDetail.actual_results) {
      reIndexData.actual_results = ticketDetail.actual_results;
    }
    if (ticketDetail.expected_results) {
      reIndexData.expected_results = ticketDetail.expected_results;
    }
    if (ticketDetail.type_id) {
      reIndexData.type_id = ticketDetail.type_id;
    }
    if (ticketDetail.component_id) {
      reIndexData.component_id = ticketDetail.component_id;
    }
    if (ticketDetail.severity_id) {
      reIndexData.severity_id = ticketDetail.severity_id;
    }
    if (ticketDetail.priority) {
      reIndexData.priority = ticketDetail.priority;
    }
    if (ticketDetail.story_points) {
      reIndexData.story_points = ticketDetail.story_points;
    }
    if (ticketDetail.estimated_hours) {
      reIndexData.estimated_hours = ticketDetail.estimated_hours;
    }
    if (ticketDetail.reviewer) {
      reIndexData.reviewer = ticketDetail.reviewer;
    }
    if (ticketDetail && ticketDetail?.statusDetail && ticketDetail?.statusDetail?.group) {
      reIndexData.status_group_id = ticketDetail && ticketDetail.statusDetail && ticketDetail.statusDetail.group;
    }
    if (ticketDetail.recurring_task_id) {
      reIndexData.recurring_task_id = ticketDetail.recurring_task_id;
    }
    if (ticketDetail.parent_ticket_id) {
      reIndexData.parent_ticket_id = ticketDetail.parent_ticket_id;
    }

    if (ticketDetail.developer_id) {
      reIndexData.developer_id = ticketDetail.developer_id;
    }
    if (ticketDetail.tester_id) {
      reIndexData.tester_id = ticketDetail.tester_id;
    }
    if (ticketDetail.ticket_date) {
      reIndexData.ticket_date = ticketDetail.ticket_date;
    }
    if (ticketDetail.createdAt) {
      reIndexData.createdAt = ticketDetail.createdAt;
    }
    if (ticketDetail.initial_eta) {
      reIndexData.initial_eta = ticketDetail.initial_eta;
    }
    // create reindex
    await TicketIndex.create(reIndexData);
  }
};

const ReindexAll = async (companyId, req) => {
  // Hard delete all previous records
  await TicketIndex.destroy({
    where: { company_id: companyId },
    force: true,
  });
  History.create("Ticket Reindex : Ticket index Table Destroyed", req);

  // Get all Tickets
  const Tickets = await Ticket.findAll({
    where: { company_id: companyId },
  });
  if (!Tickets) return null;

  if (Tickets && Tickets.length > 0) {
    try {
      for (let i = 0; i < Tickets.length; i++) {
        // Create index record
        await reindex(Tickets[i].id, companyId);
      }
    } catch (err) {
      console.log(err);
      History.create(`Ticket Reindex Error :${err} `, req);
    }
  }
};
const getNextTicketNumber = async (projectDetail, company_id) => {

  try {
    let item;
    let ticketNumber = projectDetail && projectDetail?.last_ticket_number;
    let code = projectDetail && projectDetail?.code

    if (!ticketNumber) {
      item = 1;
    } else {
      item = parseInt(ticketNumber) + 1;
    }

    let newTicketNumber = `${code}-${item || 1}`;

    let isExists = await TicketIndex.findOne({ where: { ticket_number: newTicketNumber, company_id: company_id } });

    while (isExists) {
      item++;
      newTicketNumber = `${code}-${item}`;
      isExists = await TicketIndex.findOne({ where: { ticket_number: newTicketNumber, company_id: company_id } });
    }

    return { newTicketNumber: newTicketNumber, lastTicketNumber: item };

  } catch (err) {
    console.log(err);
  }
}
const create = async (req, res) => {
  try {
    const company_id = Request.GetCompanyId(req);

    let { allowDuplicate = true } = req.body;
    let body;
    if (req && req?.params && req?.params?.id) {
      body = await TicketIndex.findOne({ where: { ticket_id: req?.params?.id, company_id: company_id } });
    } else {
      body = req.body;
    }
    const projectDetail = await Project.findOne({
      where: { company_id: company_id, id: body.projectId ? body.projectId : body.project_id }, attributes: ["last_ticket_number", "code", "id"]
    });
    const data = body?.projectId ? body?.projectId : null;
    const defaultReviewer =
      body?.projectId && (await projectSettingService.getProjectSettingValue(DEFAULT_REVIEWER, company_id, data));

    if (defaultReviewer !== null) {
      body.reviewer = Number.Get(defaultReviewer);
    } else {
      body.reviewer = null;
    }

    let response = await getNextTicketNumber(projectDetail, company_id);

    let userId = req?.user?.id;
    const status = await StatusService.getFirstStatus(
      ObjectName.TICKET,
      company_id,
      body?.type_id ? body?.type_id : body?.ticketType?.value ? body?.ticketType?.value : body?.ticketType
    );
    let getStatusDetail = await StatusService.getData(status, company_id);
    let historyMessage = new Array();
    if (body.summary && body.summary !== "") {
      historyMessage.push(`Summary : ${body.summary}`);
    }
    if (body.fromLocation && body.fromLocation !== "") {
      historyMessage.push(`FromLocation : ${body.fromLocation}`);
    }
    if (body.toLocation && body.toLocation !== "") {
      historyMessage.push(`ToLocation : ${body.toLocation}`);
    }

    if (body.due_date && body.due_date !== "") {
      historyMessage.push(`Due Date: ${DateTime.shortMonthDate(body.due_date)}`);
    }
    if (response && response.newTicketNumber !== "") {
      historyMessage.push(`Ticket Number: ${response.newTicketNumber}`);
    }
    if (status && status !== "") {
      historyMessage.push(`Status: ${getStatusDetail?.name}`);
    }
    if (body.description && body.description !== "") {
      let textValue;

      try {
        const descriptionData = JSON.parse(body.description);
        textValue = descriptionData.blocks[0].text || body.description;
      } catch (error) {
        textValue = body.description;
      }

      historyMessage.push(`Description: ${textValue}`);
    }

    let ticketCreateData = {
      company_id: company_id,
      summary: body.summary,
      due_date: body.due_date && body.due_date,
      ticket_number: response.newTicketNumber ? response.newTicketNumber : "",
      assignee_id: body?.assignee_id?.id
        ? body?.assignee_id?.id
        : body?.assignee_id?.value
          ? body?.assignee_id?.value
          : body?.assignee_id
            ? body?.assignee_id
            : getStatusDetail?.default_owner ? getStatusDetail?.default_owner
              : null,
      project_id: body?.projectId ? body?.projectId : body.project_id ? body.project_id : null,
      reporter_id: req?.body?.systemUser ? req?.body?.systemUser : body?.reporter_id ? body?.reporter_id : userId,
      status: status,
      description: body?.description ? body?.description : null,
      type_id: body?.type_id ? body?.type_id : body?.ticketType?.value ? body?.ticketType?.value : body?.ticketType,
      component_id: body?.component_id ? body?.component_id : null,
      story_points: body?.story_points ? body?.story_points : null,
      recurring_task_id: body?.recurring_task_id ? body?.recurring_task_id : null,
      ticket_date: body?.ticket_date ? body?.ticket_date : new Date(),
      initial_eta: new Date(),
      from_location: body.fromLocation,
      to_location: body.toLocation,
    };

    if (body && body?.parent_ticket_id) {
      ticketCreateData.parent_ticket_id = body?.parent_ticket_id;
    }
    let ticketDetails;
    if (!allowDuplicate) {
      const [record, created] = await Ticket.findOrCreate({
        where: { summary: body.summary, project_id: ticketCreateData?.project_id, type_id: ticketCreateData?.type_id, due_date: DateTime.getSQlFormattedDate(new Date()), ticket_date: ticketCreateData?.ticket_date },
        defaults: { ...ticketCreateData, assignee_id: ticketCreateData?.assignee_id },
      });
      ticketDetails = record?.dataValues
    } else {
      ticketDetails = await Ticket.create(ticketCreateData);
    }

    await Project.update({ last_ticket_number: response.lastTicketNumber }, { where: { id: projectDetail?.id, company_id: company_id } })

    return {
      ticketDetails: ticketDetails,
      historyMessage,
    };
  } catch (err) {
    console.log(err);
  }
};

const del = async ({ id, company_id }, req) => {
  try {
    const ticketDetails = await Ticket.findOne({
      where: { id, company_id },
    });
    if (!ticketDetails) {
    }
    const assignee_id = ticketDetails?.assignee_id;
    const ticket_number = ticketDetails?.ticket_number;
    const ticket_summary = ticketDetails?.summary;

    // Delete tag
    await ticketDetails.destroy();
    await reindex(id, company_id);

    History.create("Ticket deleted", req, ObjectName.TICKET, id);
    TicketNotificationService &&
      TicketNotificationService?.sendTicketDeletedNotification &&
      TicketNotificationService?.sendTicketDeletedNotification(assignee_id, ticket_number, company_id, ticket_summary);
  } catch (err) {
    console.log(err);
  }
};

const bulkDelete = async (req, res) => {
  try {
    let ids = req?.body?.selectedId;

    const company_id = Request.GetCompanyId(req);

    if (!ids.length > 0) {
      return res.json(BAD_REQUEST, { message: "Ticket ids is required" });
    }

    if (ids && ids.length > 0) {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        await del({ id, company_id }, req);
      }
    }
    res.json(DELETE_SUCCESS, { message: "Ticket deleted" });
  } catch (err) {
    console.log(err);
  }
};
/**
 * Module dependencies
 */

async function update(req, res, next) {
  const hasPermission = await Permission.Has(Permission.TICKET_EDIT, req);
  const company_id = Request.GetCompanyId(req);
  const roleId = Request.getUserRole(req);

  const data = req.body;
  const { id } = req.params;
  const summary = data.summary;
  const fromLocation = data.fromLocation;
  const toLocation = data.toLocation;

  // Validate tag id
  if (!id) {
    return res.json(BAD_REQUEST, { message: "Assignee id is required" });
  }

  // Validate tag is exist or not
  const ticketDetails = await Ticket.findOne({
    where: { id: id, company_id: company_id },
    include: [
      { model: User, as: "assignee" },
      { model: User, as: "reporter" },
      { model: User, as: "reviewerDetail" },
      { model: Project, as: "projectDetail" },
      { model: StatusModal, as: "statusDetail" },
      { model: User, as: "reviewers" },
      { required: false, model: ProjectTicketType, as: "ticketTypedetail" },
      { required: false, model: ProjectComponent, as: "projectComponentDetail" },
      { model: User, as: "developerDetail" },
      { model: User, as: "testerDetail" },
    ],
  });

  const reviewerDetails =
    data?.reviewer &&
    (await User.findOne({
      where: { id: data?.reviewer, company_id: company_id },
    }));

  const assigneeDetails =
    data.assignee &&
    (await User.findOne({
      where: { id: data?.assignee, company_id: company_id },
    }));

  const reviewerDetail =
    data.reviewer &&
    (await User.findOne({
      where: { id: data?.reviewer, company_id: company_id },
    }));

  const developerDetail =
    data.developer &&
    (await User.findOne({
      where: { id: data?.developer, company_id: company_id },
    }));

  const testerDetail =
    data.tester &&
    (await User.findOne({
      where: { id: data?.tester, company_id: company_id },
    }));

  if (!ticketDetails) {
    return res.json(BAD_REQUEST, { message: "Invalid ticket id" });
  }

  // Update ticket details
  const updateTicket = new Object();

  let historyMessage = new Array();

  if (validator.isNotEmpty(data.summary) && data.summary !== ticketDetails.summary) {
    updateTicket.summary = data.summary;
    historyMessage.push(`Summary Updated from ${ticketDetails?.summary} to ${summary}\n`);
  }

  if (validator.isNotEmpty(data.fromLocation) && data.fromLocation !== ticketDetails.from_location) {
    updateTicket.from_location = data.fromLocation;
    historyMessage.push(`FromLocation Updated from ${ticketDetails?.from_location} to ${fromLocation}\n`);
  }

  if (validator.isNotEmpty(data.toLocation) && data.toLocation !== ticketDetails.to_location) {
    updateTicket.to_location = data.toLocation;
    historyMessage.push(`ToLocation Updated from ${ticketDetails?.to_location} to ${toLocation}\n`);
  }

  if (validator.isNotEmpty(data.due_date) && DateTime.getSQlFormattedDate(data.due_date) !== ticketDetails.due_date) {
    updateTicket.due_date = data.due_date;
    historyMessage.push(
      `Due Date Updated from ${DateTime.shortMonthDate(ticketDetails?.due_date)} to ${DateTime.shortMonthDate(data?.due_date)}\n`
    );
  }

  if (validator.isNotEmpty(data.initial_eta) && DateTime.getSQlFormattedDate(data.initial_eta) !== ticketDetails.initial_eta) {
    updateTicket.initial_eta = data.initial_eta;
    historyMessage.push(
      `Initial Due Date Updated from ${DateTime.shortMonthDate(ticketDetails?.initial_eta)} to ${DateTime.shortMonthDate(data?.initial_eta)}\n`
    );
  }

  if (validator.isNotEmpty(data.ticket_date) && data.ticket_date !== ticketDetails.ticket_date) {
    updateTicket.ticket_date = data.ticket_date;
    historyMessage.push(
      `Ticket Date Updated from ${DateTime.shortMonthDate(ticketDetails?.ticket_date)} to ${DateTime.shortMonthDate(data?.ticket_date)}\n`
    );
  }

  if (validator.isNotEmpty(data.delivery_date) && data.delivery_date !== ticketDetails.delivery_date) {
    updateTicket.delivery_date = data.delivery_date;
    historyMessage.push(
      `Delivery Date Updated from ${DateTime.shortMonthDate(ticketDetails?.delivery_date)} to ${DateTime.shortMonthDate(
        data?.delivery_date
      )}\n`
    );
  }

  if (validator.isNotEmpty(data.assignee) && data.assignee !== ticketDetails.assignee) {
    updateTicket.assignee_id = data.assignee ? data.assignee : null;
    historyMessage.push(
      `Assignee Updated from ${ticketDetails?.assignee?.name + ' ' + ticketDetails?.assignee?.last_name} to ${assigneeDetails?.name + '' + assigneeDetails?.last_name
      }\n`
    );
  }

  if (validator.isNotEmpty(data.reviewer) && data.reviewer !== ticketDetails.reviewer) {
    updateTicket.reviewer = data.reviewer ? data.reviewer : null;
    historyMessage.push(
      `Reviewer Updated from ${ticketDetails?.reviewer?.name + ' ' + ticketDetails?.reviewer?.last_name} to ${reviewerDetail?.name + '' + reviewerDetail?.last_name
      }\n`
    );
  }

  if (validator.isNotEmpty(data.developer) && data.developer !== ticketDetails.developer_id) {
    updateTicket.developer_id = data.developer ? data.developer : null;
    historyMessage.push(
      `Developer Updated from ${ticketDetails?.developerDetail?.name + ' ' + ticketDetails?.developerDetail?.last_name} to ${developerDetail?.name + '' + developerDetail?.last_name
      }\n`
    );
  }

  if (validator.isNotEmpty(data.tester) && data.tester !== ticketDetails.tester_id) {
    updateTicket.tester_id = data.tester ? data.tester : null;
    historyMessage.push(
      `Tester Updated from ${ticketDetails?.testerDetail?.name + ' ' + ticketDetails?.testerDetail?.last_name} to ${testerDetail?.name + '' + testerDetail?.last_name
      }\n`
    );
  }

  if (typeof data.description === 'string') {
    if (data.description && data.description !== ticketDetails.description) {
      try {
        const parsedDescription = JSON.parse(data.description);
        const newValue = parsedDescription?.blocks[0]?.text || '';
        updateTicket.description = data?.description;
        historyMessage.push(`Description Updated To "${newValue}"\n`);
      } catch (error) {
        updateTicket.description = data?.description;
        console.error(error);
        historyMessage.push(`Description Updated To ${data.description}\n`);
      }
    }
  } else {
    try {
      const descriptionData = data.description ? JSON.parse(data.description) : "";

      if (validator.isNotEmpty(data.description) && data.description !== ticketDetails.description) {
        updateTicket.description = Url.RawURLEncode(data?.description);

        const oldDescriptionDecoded = Url.RawURLDecode(ticketDetails.description);
        const oldDescriptionData = JSON.parse(oldDescriptionDecoded);

        const oldValue = oldDescriptionData?.blocks[0]?.text || '';
        const newValue = descriptionData?.blocks[0]?.text || '';

        historyMessage.push(`Description Updated from ${oldValue} to ${newValue}\n`);
      }
    } catch (error) {
      updateTicket.description = data?.description;
      console.error("Error parsing JSON:", error);
      console.log("Data that caused the error:", data.description);
    }
  }

  if (validator.isKeyAvailable(data, "sprint") && data.sprint !== ticketDetails.sprint) {
    updateTicket.sprint = data.sprint;
    historyMessage.push(`Sprint Updated from ${ticketDetails.sprint} to ${data.sprint}\n`);
  }

  if (validator.isNotEmpty(data.project) && data.project !== ticketDetails.project_id) {
    updateTicket.project_id = Number.Get(data.project);
    historyMessage.push(`Project Updated from ${ticketDetails.project_id} to ${data.project}\n`);
  }

  if (validator.isNotEmpty(data.status) && ticketDetails.status != data.status) {
    updateTicket.status = Number.Get(data.status);
    historyMessage.push(`Status Updated from ${ticketDetails.status} to ${data.status}\n`);
  }

  if (
    validator.isNotEmpty(data.acceptance_criteria) &&
    data.acceptance_criteria !== ticketDetails.acceptance_criteria
  ) {
    updateTicket.acceptance_criteria = data.acceptance_criteria;
    historyMessage.push(
      `Acceptance Criteria Updated from ${ticketDetails.acceptance_criteria} to ${data.acceptance_criteria}\n`
    );
  }

  if (validator.isNotEmpty(data.environment) && data.environment !== ticketDetails.environment) {
    updateTicket.environment = data.environment;
    historyMessage.push(`Environment Updated from ${ticketDetails.environment} to ${data.environment}\n`);
  }

  if (validator.isNotEmpty(data.test_step) && data.test_step !== ticketDetails.test_step) {
    updateTicket.test_step = data.test_step;
    historyMessage.push(`Test Step Updated from ${ticketDetails.test_step} to ${data.test_step}\n`);
  }

  if (validator.isNotEmpty(data.actual_results) && data.actual_results !== ticketDetails.actual_results) {
    updateTicket.actual_results = data.actual_results;
    historyMessage.push(`Actual Results Updated from ${ticketDetails.actual_results} to ${data.actual_results}\n`);
  }

  if (validator.isNotEmpty(data.expected_results) && data.expected_results !== ticketDetails.expected_results) {
    updateTicket.expected_results = data.expected_results;
    historyMessage.push(
      `Expected Results Updated from ${ticketDetails.expected_results} to ${data.expected_results}\n`
    );
  }

  if (validator.isKeyAvailable(data, "type_id") && data.type_id !== ticketDetails.type_id) {
    updateTicket.type_id = data.type_id;
    historyMessage.push(`Type Updated from ${ticketDetails.type_id} to ${data.type_id}\n`);
  }

  if (validator.isKeyAvailable(data, "component_id") && data.component_id !== ticketDetails.component_id) {
    updateTicket.component_id = data.component_id ? data.component_id : null;
    historyMessage.push(`Component Updated from ${ticketDetails.component_id} to ${data.component_id}\n`);
  }

  if (validator.isKeyAvailable(data, "severity_id") && data.severity_id !== ticketDetails.severity_id) {
    updateTicket.severity_id = data.severity_id;
    historyMessage.push(`Severity Updated from ${ticketDetails.severity_id} to ${data.severity_id}\n`);
  }

  if (validator.isKeyAvailable(data, "priority") && data.priority !== ticketDetails.priority) {
    updateTicket.priority = data.priority;
    historyMessage.push(`Priority Updated from ${ticketDetails.priority} to ${data.priority}\n`);
  }

  if (
    (data.story_points && data.story_points !== ticketDetails.story_points)
  ) {
    updateTicket.story_points = data.story_points ? data.story_points : null;
    historyMessage.push(`Story Points Updated from ${ticketDetails.story_points} to ${data.story_points}\n`);
  }

  if (
    (data.estimated_hours && data.estimated_hours !== ticketDetails.estimated_hours) ||
    (data.estimated_hours === '' && data.estimated_hours !== ticketDetails.estimated_hours)
  ) {
    updateTicket.estimated_hours = data.estimated_hours ? data.estimated_hours : null;
    historyMessage.push(`Estimated Hours Updated from ${ticketDetails.estimated_hours} to ${data.estimated_hours}\n`);
  }

  if (validator.isNotEmpty(data.reviewer) && data.reviewer !== ticketDetails.reviewer) {
    updateTicket.reviewer = data.reviewer ? data.reviewer : null;

    historyMessage.push(
      `Reviewer Updated from ${ticketDetails?.reviewers?.name + " " + ticketDetails?.reviewers?.last_name} to ${reviewerDetails?.name + " " + reviewerDetails?.last_name
      }\n`
    );
  }

  try {
    const save = await Ticket.update(updateTicket, {
      where: { id: id, company_id: company_id },
    });
    const ticketData = await Ticket.findOne({
      where: { id: id, company_id: company_id },
      attributes: ['id', 'project_id'],
      include: [{ model: Project, as: "projectDetail", attributes: ["slug"] }],
    });
    // API response
    res.json(UPDATE_SUCCESS, {
      message: "Ticket updated",
      data: save,
      slug: ticketData?.projectDetail?.slug,
    });
    res.on("finish", async () => {
      await reindex(id, company_id);

      // create system log for ticket updation
      if (historyMessage && historyMessage.length > 0) {
        let message = historyMessage.join();
        History.create(message, req, ObjectName.TICKET, id);
      } else {
        History.create("Ticket Updated", req, ObjectName.TICKET, id);
      }

      if (data?.assignee && ticketDetails && ticketDetails.assignee_id != data?.assignee) {
        SlackTicketService.sendTicketAssigneeNotification(id, req?.user?.id, ticketDetails?.assignee_id);
      }
      let isDateDifferent = DateTime.CompareTwoDate(ticketDetails.due_date, data.due_date);
      if (isDateDifferent) {
        NotificationService.sendDueDateChangeNotification(id, req?.user?.id);
      }


      if (validator.isNotEmpty(data?.due_date) && DateTime.getSQlFormattedDate(data?.due_date) !== ticketDetails?.due_date) {
        if ((validator.isNotEmpty(data?.due_date) && DateTime.getSQlFormattedDate(data?.due_date) !== ticketDetails?.due_date) && (DateTime.getSQlFormattedDate(data?.due_date) > ticketDetails?.initial_eta)) {
          let isEnabledFineAddForTicketETAChange = await getSettingValueByObject(
            Setting.FINE_ADD_FOR_TICKET_DUE_DATE_CHANGE,
            company_id,
            roleId,
            ObjectName.ROLE
          );
          let numOfDueDateDays = DateTime.getDayCountByDateRange(ticketDetails?.initial_eta, DateTime.getSQlFormattedDate(data?.due_date));
          let params = {
            company_id,
            type: ticketDetails && ticketDetails?.ticketTypedetail?.fine_type ? ticketDetails?.ticketTypedetail?.fine_type : null,
            user_id: ticketDetails?.assignee_id,
            due_date: DateTime.getSQlFormattedDate(data?.due_date),
            numOfDueDateDays
          }
          if (isEnabledFineAddForTicketETAChange && isEnabledFineAddForTicketETAChange == "true") {
            await addFineForDueDateChange(params)
          }
        }
      }

    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

async function updateStatus(req, res, next) {
  let id = req?.params?.id;
  let data = req?.body?.status;
  const companyId = Request.GetCompanyId(req);

  const ticketDetail = await Ticket.findOne({ where: { id: id, company_id: companyId } });
  if (!ticketDetail) {
    return res.json(BAD_REQUEST, { message: "Ticket Details Not Found" });
  }

  const statusDetails = await StatusModal.findOne({
    where: { id: ticketDetail.status, company_id: companyId },
  });

  const getStatusDetail = await StatusService.getData(data, companyId);
  if (getStatusDetail?.group == Status.GROUP_REVIEW) {
    let projectSettingDetail = await ProjectSettingModel.findOne({
      where: { project_id: ticketDetail?.project_id, name: Setting.MINIMUM_TEST_CASE_COUNT, company_id: companyId },
    });
    const isTestCase = await TicketTestService.getDetails(id, companyId);
    if (isTestCase && projectSettingDetail?.value !== "" && isTestCase.count < Number.Get(projectSettingDetail?.value)) {
      return res.json(BAD_REQUEST, { message: "Test Case is Required" });
    }
  }

  let updateData = {};

  const status = await StatusService.isCompleted(id, companyId);
  if (status?.group == Status.GROUP_COMPLETED) {
    updateData.completed_at = new Date();
  }

  updateData.status = data;
  if (Number.isNotNull(getStatusDetail?.default_owner)) {
    updateData.assignee_id = await StatusService.GetDefaultOwner(getStatusDetail?.default_owner, req.user.id);
  }

  if (Number.isNotNull(getStatusDetail?.default_reviewer)) {
    updateData.reviewer = getStatusDetail?.default_reviewer;
  }

  if (Number.isNotNull(getStatusDetail?.default_due_date)) {
    updateData.due_date = getStatusDetail?.default_due_date;
  }

  ticketDetail.update(updateData).then((response) => {
    res.json(200, { message: "Ticket Status Updated" });

    res.on("finish", async () => {
      if ((getStatusDetail && getStatusDetail?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED) || (getStatusDetail && getStatusDetail?.notify_to_owner == Status.NOTIFY_TO_REVIEWER_ENABLED)) {
        let params = {
          project_id: response?.project_id,
          company_id: companyId,
          assignee_id: response?.assignee_id,
          ticket_number: response?.ticket_number,
          summary: response?.summary,
          statusName: getStatusDetail?.name,
        };
        TicketNotificationService.sendTicketStatusChangeNotification(params);
      }
      if (Number.isNotNull(getStatusDetail?.default_due_date)) {
        TicketNotificationService.sendDueDateChangeNotification(id, req?.user?.id);
      }

      History.create(
        `Ticket Status Updated from ${statusDetails?.name} to ${getStatusDetail?.name}`,
        req,
        ObjectName.TICKET,
        id
      );
      await reindex(id, companyId);
    });
  });
}

async function bulkUpdate(req, res, next) {
  const data = req.body;

  const { id } = req.params;

  const company_id = Request.GetCompanyId(req);

  let ticketIds = JSON.parse(req?.body?.selected_ids);

  if (ticketIds && !ticketIds.length > 0) {
    return res.json(400, { message: "Ticket Id Required" });
  }

  try {
    const updateData = {};

    if (data.assignee_id) {
      updateData.assignee_id = req.body.assignee_id;
    }

    if (data.project) {
      updateData.project = data.project;
    }

    if (data.component_id) {
      updateData.component_id = data.component_id;
    }

    if (data.type_id) {
      updateData.type_id = data.type_id;
    }

    if (data.due_date) {
      updateData.due_date = data.due_date;
    }

    if (data.story_points) {
      updateData.story_points = data.story_points;
    }

    if (data.summary) {
      updateData.summary = data.summary;
    }

    if (data.fromLocation) {
      updateData.fromLocation = data.fromLocation;
    }

    if (data.toLocation) {
      updateData.toLocation = data.toLocation;
    }

    if (data.description) {
      updateData.description = data.description;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.statusName) {
      updateData.statusName = data.statusName;
    }

    for (let i = 0; i < ticketIds.length; i++) {
      const id = ticketIds[i];

      if (data?.due_date) {
        NotificationService.sendDueDateChangeNotification(id, req?.user?.id);
      }

      await Ticket.update(updateData, {
        where: { id: id, company_id: company_id },
      });

      await reindex(id, company_id);
    }
    res.json(Response.CREATE_SUCCESS, {
      message: "Ticket Bulk updated",
    });
  } catch (err) {
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

async function getdetail(req, res, next) {
  const { id } = req.params;
  let params = req.params?.id ? JSON.parse(req.params?.id) : null;

  try {
    const company_id = Request.GetCompanyId(req);
    let timeZone = Request.getTimeZone(req)
    if (!params?.ticket_number) {
      return res.json(400, { message: "Invalid Id" });
    }

    let getProjectDetail = await Project.findOne({ where: { slug: params?.slug, company_id: company_id } });

    const TicketData = await Ticket.findOne({
      where: {
        ticket_number: params?.ticket_number,
        project_id: getProjectDetail?.id,
        company_id: company_id,
      },
      include: [
        { model: User, as: "assignee" },
        { model: User, as: "reporter" },
        { model: Project, as: "projectDetail" },
        { model: StatusModal, as: "statusDetail" },
        { model: User, as: "reviewers" },
        { required: false, model: ProjectTicketType, as: "ticketTypedetail" },
        { required: false, model: ProjectComponent, as: "projectComponentDetail" },
        { model: User, as: "developerDetail" },
        { model: User, as: "testerDetail" },

      ],
    });

    if (!TicketData) return res.json(200, { message: "No Records Found" });
    let {
      id,
      summary,
      from_location,
      to_location,
      due_date,
      ticket_number,
      createdAt,
      assignee_id,
      reviewer,
      updatedAt,
      description,
      reporter_id,
      assignee,
      reporter,
      sprint,
      projectDetail,
      project_id,
      status,
      statusDetail,
      ticketTypedetail,
      projectComponentDetail,
      acceptance_criteria,
      environment,
      test_step,
      actual_results,
      expected_results,
      type_id,
      component_id,
      severity_id,
      priority,
      story_points,
      estimated_hours,
      reviewers,
      completed_at,
      delivery_date,
      developerDetail,
      testerDetail,
      ticket_date,
      initial_eta,
    } = TicketData.get();

    const UserRolePermission = async (name) => {
      let selectedRole = await ProjectSettingModel.findOne({
        where: { project_id: project_id, name: name, company_id: company_id },
      });

      let selectedRoleArray = selectedRole && selectedRole.value.split(",");

      let rolePermission = selectedRoleArray && selectedRoleArray.includes(req.user.role.toString());
      return rolePermission;
    };

    let data = {
      id,
      summary,
      from_location,
      to_location,
      sprint,
      project: project_id,
      projectName: projectDetail?.name,
      due_date: due_date,
      initial_eta: initial_eta,
      etaTime: DateTime.getTimeOrNull(due_date),
      ticket_number: ticket_number,
      createdAt: DateTime.getDateTimeByUserProfileTimezone(createdAt, timeZone),
      assignee_id,
      reviewer,
      updatedAt: DateTime.getDateTimeByUserProfileTimezone(updatedAt, timeZone),
      assignee: String.concatName(assignee?.name, assignee?.last_name),
      assignee_url: assignee?.media_url,
      description:
        description && validator.isValidDraftFormat(Url.RawURLDecode(description))
          ? Url.RawURLDecode(description)
          : validator.convertTextToDraftFormat(description),
      reporter_id,
      reporter: String.concatName(reporter?.name, reporter?.last_name),
      reporter_url: reporter?.media_url,
      status,
      statusName: statusDetail && statusDetail.name,
      statusId: statusDetail && statusDetail.id,
      acceptance_criteria: acceptance_criteria,
      environment: environment,
      test_step: test_step,
      actual_results: actual_results,
      expected_results: expected_results,
      type_id: type_id,
      component_id: component_id,
      severity_id: severity_id,
      priority: priority,
      story_points: story_points,
      estimated_hours: estimated_hours,
      reviewerName: String.concatName(reviewers?.name, reviewers?.last_name),
      reviewer_url: reviewers?.media_url,
      reviewer: reviewers?.id,
      completed_at: DateTime.getDateTimeByUserProfileTimezone(completed_at, timeZone),
      type_name: ticketTypedetail && ticketTypedetail?.name,
      component: projectComponentDetail && projectComponentDetail?.name,
      dueDatePermission: await UserRolePermission(Setting.PROJECT_SETTING_ALLOWED_USER),
      storyPointPermission: await UserRolePermission(Setting.PROJECT_SETTING_ALLOWED_ROLES_FOR_STORY_POINT_CHANGE),
      delivery_date,
      allow_for_assignee_change_permission: await UserRolePermission(
        Setting.PROJECT_SETTING_ALLOWED_ROLES_FOR_ASSIGNEE_CHANGE
      ),
      developerName: String.concatName(developerDetail?.name, developerDetail?.last_name),
      developer_url: developerDetail?.media_url,
      developer: developerDetail?.id,
      testerName: String.concatName(testerDetail?.name, testerDetail?.last_name),
      tester_url: testerDetail?.media_url,
      tester: testerDetail?.id,
      ticket_date: ticket_date,
      field: ticketTypedetail && ticketTypedetail?.fields,

    };
    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
}

async function search(req, res) {
  let {
    page,
    pageSize,
    search,
    sort,
    sortDir,
    pagination,
    status,
    group,
    user,
    reviewer,
    projectId,
    due_date,
    reporter,
    recurring_task_id,
    sprint,
    project_id,
    excludeStatus,
    ticketType,
    parent_ticket_id,
    ticketComponent,
    ticket_id,
    manageOtherPermission
  } = req.query;

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

  const companyId = Request.GetCompanyId(req);
  let timeZone = Request.getTimeZone(req);


  if (!companyId) {
    return res.json(400, { message: "Company Not Found" });
  }

  // Sortable Fields
  const validOrder = ["ASC", "DESC"];
  const sortableFields = {
    id: "id",
    summary: "summary",
    assignee_id: "assignee_id",
    reviewer: "reviewer",
    name: "name",
    due_date: "due_date",
    sprint: "sprint",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    ticketType: "type_id",
    component: "component_id",
    ticket_id: "ticket_id",
    story_points: "story_points"
  };

  const sortParam = sort || "createdAt";

  // Validate sortable fields is present in sort param
  if (!Object.keys(sortableFields).includes(sortParam)) {
    return res.json(BAD_REQUEST, {
      message: `Unable to sort Supplier by ${sortParam}`,
    });
  }

  const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
  // Validate order is present in sortDir param
  if (!validOrder.includes(sortDirParam)) {
    return res.json(BAD_REQUEST, { message: "Invalid sort order" });
  }

  const where = {};
  const assigneeWhere = {};
  const data = req.query;
  const startDate = data.startDate;
  // startDate filter
  const endDate = data.endDate;

  if (startDate && !endDate) {
    where.due_date = {
      [Op.and]: {
        [Op.gte]: DateTime.getSQlFormattedDate(startDate), // Start of the day in the specified time zone
      },
    };
  }

  // endDate filter
  if (endDate && !startDate) {
    where.due_date = {
      [Op.and]: {
        [Op.lte]: DateTime.getSQlFormattedDate(endDate), // End of the day in the specified time zone
      },
    };
  }

  // startDate and endDate filter
  if (startDate && endDate) {
    where.due_date = {
      [Op.and]: {
        [Op.gte]: DateTime.getSQlFormattedDate(startDate), // Start of the day in the specified time zone
        [Op.lte]: DateTime.getSQlFormattedDate(endDate), // End of the day in the specified time zone
      },
    };
  }

  let date = DateTime.getCustomDateTime(req.query.date, timeZone)

  if (date && Number.isNotNull(req.query.date)) {
    where.due_date = {
      [Op.and]: {
        [Op.gte]: date?.startDate,
        [Op.lte]: date?.endDate,
      },
    };
  }

  if (Number.isNotNull(sprint)) {
    where.sprint = sprint;
  }

  if (!Number.isNotNull(manageOtherPermission)) {
    let userId = Request.getUserId(req);
    if (userId) {
      where.assignee_id = userId;
    }
  }

  if (excludeStatus) {
    where.status = {
      [Op.notIn]: excludeStatus,
    };
  }

  if (Number.isNotNull(user)) {
    where.assignee_id = data.user;
  }

  if (Number.isNotNull(reviewer)) {
    where.reviewer = data.reviewer;
  }

  if (Number.isNotNull(reporter)) {
    where.reporter_id = reporter;
  }

  if (Number.isNotNull(recurring_task_id)) {
    where.recurring_task_id = recurring_task_id;
  }

  if (Number.isNotNull(ticketType)) {
    where.type_id = ticketType;
  }

  if (Number.isNotNull(ticketComponent)) {
    where.component_id = ticketComponent;
  }

  if (Number.isNotNull(projectId)) {
    where.project_id = projectId;
  }

  if (Number.isNotNull(parent_ticket_id)) {
    where.parent_ticket_id = parent_ticket_id;
  }

  where.company_id = companyId;

  if (status && status.split(",")) {
    let statusIds = status.split(",");
    where.status = {
      [Op.in]: statusIds,
    };
  }

  if (status && !status.split(",")) {
    where.status = status;
  }

  if (Number.isNotNull(group)) {
    where.status_group_id = group.split(',')
      ? {
        [Op.in]: group.split(','),
      }
      : group;
  }

  if (Number.isNotNull(project_id)) {
    where.project_id = project_id;
  }

  if (Number.isNotNull(ticket_id)) {
    where.ticket_id = ticket_id;
  }

  // Search by name
  const summary = data.summary;
  if (summary) {
    where.summary = {
      $like: `%${summary}%`,
    };
  }

  // Search term
  const searchTerm = search ? search.trim() : null;
  if (searchTerm) {
    if (searchTerm && isNaN(Number.Get(searchTerm))) {
      where[Op.or] = [
        {
          summary: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$assignee.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$assignee.last_name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          ticket_number: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }
    if (typeof Number.Get(searchTerm) == "number" && !isNaN(Number.Get(searchTerm))) {
      where[Op.or] = [
        {
          ticket_number: {
            [Op.eq]: searchTerm,
          },
        },
        {
          ticket_number: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }
  }

  const query = {
    order:
      sort == "name"
        ? [[{ model: User, as: "assignee" }, "name", sortDir]]
        : sort == "status"
          ? [["statusDetail", "name", sortDir]]
          : [[sortableFields[sortParam], sortDirParam]],

    where,
    include: [
      {
        required: false,
        model: User,
        as: "assignee",
        where: assigneeWhere,
      },
      {
        model: User,
        as: "reviewerDetail",
      },
      { required: false, model: StatusModal, as: "statusDetail" },

      { model: User, as: "reporter" },
      { model: Project, as: "projectDetail" },
      { required: false, model: ProjectTicketType, as: "ticketTypedetail" },
      {
        required: false,
        model: ProjectComponent,
        as: "projectComponentDetail",
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

  let projectSettingList = await projectSettingService.list(companyId);
  const projectSettingValue =
    projectSettingList &&
    projectSettingList.length > 0 &&
    projectSettingList.map((setting) => ({
      projectId: setting?.dataValues?.project_id,
      value: setting?.dataValues?.value,
      name: setting?.dataValues?.name,
    }));

  try {
    const UserRolePermission = async (name, project_id) => {
      let projectSettingData =
        projectSettingValue &&
        projectSettingValue.length > 0 &&
        projectSettingValue.find(
          (data) => data?.projectId == project_id && data?.name == name
        );
      let selectedRoleArray =
        projectSettingData && projectSettingData.value.split(",");
      let rolePermission =
        selectedRoleArray &&
        selectedRoleArray.includes(req.user.role.toString());
      return rolePermission;
    };

    // Get ticket list and count
    const ticketDetails = await TicketIndex.findAndCountAll(query);

    // Return ticket is null
    if (ticketDetails.count === 0) {
      return res.json([]);
    }

    const data = [];

    // ticketDetails.rows.forEach((ticket) => {
    for (let index = 0; index < ticketDetails.rows.length; index++) {
      const ticket = ticketDetails.rows[index];
      const {
        id,
        ticket_id,
        summary,
        from_location,
        to_location,
        assignee_id,
        assignee,
        reviewerDetail,
        reviewer,
        due_date,
        createdAt,
        updatedAt,
        sprint,
        project_id,
        statusDetail,
        reporter_id,
        reporter,
        projectDetail,
        ticket_number,
        description,
        ticketTypedetail,
        projectComponentDetail,
        story_points,
        estimated_hours,
        parent_ticket_id,
      } = ticket.get();

      data.push({
        id: ticket_id,
        project_code: projectDetail && projectDetail?.code,
        slug: projectDetail && projectDetail?.slug,
        ticket_number: ticket_number,
        summary: summary,
        from_location: from_location,
        to_location: to_location,
        assignee_id: assignee_id,
        reviewer: reviewer,
        firstName: assignee?.name,
        lastName: assignee?.last_name,
        reviewerFirstName: reviewerDetail?.name,
        reviewerLastName: reviewerDetail?.last_name,
        avatarUrl: assignee?.media_url,
        reviewerUrl: reviewerDetail?.media_url,
        assignee_name: String.concatName(assignee?.name, assignee?.last_name),
        reviewer_name: reviewerDetail
          ? String.concatName(reviewerDetail.name, reviewerDetail.last_name)
          : "",
        due_date: due_date,
        allow_for_assignee_change_permission: await UserRolePermission(
          Setting.PROJECT_SETTING_ALLOWED_ROLES_FOR_ASSIGNEE_CHANGE,
          project_id
        ),
        reporter: reporter?.name,
        reporterLastName: reporter?.last_name,
        reportUrl: reporter?.media_url,
        sprint: sprint,
        statusName: statusDetail && statusDetail?.name,
        statusColor: statusDetail && statusDetail?.color_code,
        statusId: statusDetail && statusDetail?.id,
        project: projectDetail?.name,
        group: statusDetail?.group,
        projectId: project_id,
        createdAt: DateTime.getDateTimeByUserProfileTimezone(createdAt, timeZone),
        updatedAt: DateTime.getDateTimeByUserProfileTimezone(updatedAt, timeZone),
        description:
          description &&
            validator.isValidDraftFormat(Url.RawURLDecode(description))
            ? validator.convertDraftFormatToText(
              JSON.parse(Url.RawURLDecode(description))
            )
            : description,
        ticketType: ticketTypedetail?.name ? ticketTypedetail?.name : '',
        ticketTypeId: ticketTypedetail?.id ? ticketTypedetail?.id : '',
        component: projectComponentDetail?.name
          ? projectComponentDetail?.name
          : '',
        componentId: projectComponentDetail?.id
          ? projectComponentDetail?.id
          : '',
        story_points: story_points,
        estimated_hours: estimated_hours,
        dueDatePermission: await UserRolePermission(
          Setting.PROJECT_SETTING_ALLOWED_USER,
          project_id
        ),
        descriptionData:
          description &&
            validator.isValidDraftFormat(Url.RawURLDecode(description))
            ? Url.RawURLDecode(description)
            : description,
        parent_ticket_id: parent_ticket_id,
      });
    }
    return {
      totalCount: ticketDetails.count,
      currentPage: page,
      pageSize,
      data,
      search,
    };
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

const dueDateRequest = async (req, res, next) => {
  let data = req.body;
  let companyId = Request.GetCompanyId(req);
  const TicketData = await Ticket.findOne({
    where: {
      id: data?.id,
      company_id: companyId,
    },
    include: [
      { model: User, as: "assignee" },
      { model: Project, as: "projectDetail" },
      { model: User, as: "reviewers" },
    ],
  });
  let companyDetail = await CompanyService.getCompanyDetailById(companyId);
  let reviewer = await UserService.getSlack(data?.reviewer, companyId);
  let assignee = await UserService.getSlack(TicketData?.assignee_id, companyId);
  const headerName = unescape(
    `<@${reviewer?.slack_id}> Ticket Due Date Change Request By <@${assignee?.slack_id}>`
  );
  const ticketSummary = ` <${companyDetail.portal_url}/ticket/${TicketData?.projectDetail?.slug}/${TicketData?.ticket_number}|${TicketData?.ticket_number} : ${TicketData?.summary}>`;
  const text = unescape(
    `${headerName}\n${ticketSummary}\n*Reason:* ${data?.message}`
  );
  SlackService.sendMessageToUser(
    companyId,
    reviewer && reviewer?.slack_id,
    text
  );
  res.json(OK, { message: "Due Date Change Request Sended" });
  res.on("finish", async () => {
    await CommentService.create(req, null);
  });
};

const getDetailById = async (params) => {
  if (!params?.ticketId) {
    throw { message: "Ticket id is Required" }
  }

  if (!params?.companyId) {
    throw { message: "Company id is Required" }
  }

  const TicketData = await TicketIndex.findOne({
    where: {
      ticket_id: params?.ticketId,
      company_id: params?.companyId,
    },
  });

  return TicketData;
};

const createEnquiryTicket = async (enquiryTicketParams) => {
  let { req, company_id, summary, type } = enquiryTicketParams;
  try {
    let timeZone = Request.getTimeZone(req);

    let currentDate = DateTime.getCurrentDateTimeByUserProfileTimezone(new Date(), timeZone)
    let reporterId = Request.getUserId(req);
    let defaultType = await getSettingValue(type, company_id);
    let ticketTypeData = await ProjectTicketType.findOne({
      where: { id: defaultType, company_id: company_id },
      attributes: ["project_id", "id", "name"],
    });

    req.body = {
      projectId: ticketTypeData?.project_id,
      summary: summary,
      type_id: defaultType,
      due_date: currentDate,
      ticket_date: currentDate,
      reporter_id: reporterId,
      allowDuplicate: false
    };
    let data = await create(req);

    if (data?.historyMessage && data?.historyMessage.length > 0) {
      let message = data?.historyMessage.join();
      await History.create(`Created with the following: ${message}`, req, ObjectName.TICKET, data?.ticketDetails?.id);
    } else {
      await History.create("Ticket Added", req, ObjectName.TICKET, data?.ticketDetails?.id);
    }

    await reindex(data?.ticketDetails?.id, company_id);

  } catch (error) {
    console.log(error);
  }
}


const createLocationCashAmountFineEnquiryTicket = async (params) => {
  let { SsValue, locationData, shiftData, userData, companyId, req } = params;
  if (locationData) {
    if (Number.Get(SsValue?.cash_in_store) < Number.Get(locationData?.cash_in_location)) {
      let minusAmount = Number.Get(locationData?.cash_in_location) - Number.Get(SsValue?.cash_in_store);
      let summary = `Sales Settlement - Location UPI Amount Missing - Rs. ${minusAmount} - ${locationData?.name} - ${DateTime.shortMonthDate(SsValue?.date)} - ${shiftData?.name} - ${String.concatName(userData?.name, userData?.last_name)}`
      let enquiryTicketParams = {
        req,
        company_id: companyId,
        summary: summary,
        type: Setting.SALE_SETTLEMENT_ENQUIRY_TICKET_TYPE
      }
      await createEnquiryTicket(enquiryTicketParams)
    }
  }
}

const createOrderCashAmountMissingFineEnquiryTicket = async (params) => {
  let { SsValue, locationData, shiftData, userData, companyId, req, completedStatus, timeZone } = params;

  let date = DateTime.getDateTimeByUserProfileTimezone(SsValue?.date, timeZone)
  let cashAmount = await orderModel.sum('cash_amount', {
    where: {
      store_id: SsValue?.store_id,
      owner: SsValue?.sales_executive,
      shift: SsValue?.shift,
      company_id: companyId,
      status: { [Op.eq]: completedStatus },
      date: {
        [Op.and]: {
          [Op.gte]: DateTime.toGetISOStringWithDayStartTime(date),
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(date),
        },
      },
    },
  });

  if (cashAmount && cashAmount !== undefined) {
    if (Number.Get(SsValue?.amount_cash) < Number.Get(cashAmount)) {
      let minusAmount = Number.Get(cashAmount) - Number.Get(SsValue?.amount_cash);
      let summary = `Sales Settlement - Order Cash Amount Missing - Rs. ${minusAmount} - ${locationData?.name} - ${DateTime.shortMonthDate(SsValue?.date)} - ${shiftData?.name} - ${String.concatName(userData?.name, userData?.last_name)}`
      let enquiryTicketParams = {
        req,
        company_id: companyId,
        summary: summary,
        type: Setting.SALE_SETTLEMENT_ENQUIRY_TICKET_TYPE
      }
      await createEnquiryTicket(enquiryTicketParams)
    }
  }
}


const createOrderUpiAmountMissingFineEnquiryTicket = async (params) => {

  let { SsValue, locationData, shiftData, userData, companyId, req, completedStatus, timeZone } = params;
  let date = DateTime.getDateTimeByUserProfileTimezone(SsValue?.date, timeZone)
  let upiAmount = await orderModel.sum('upi_amount', {
    where: {
      store_id: SsValue?.store_id,
      owner: SsValue?.sales_executive,
      shift: SsValue?.shift,
      company_id: companyId,
      status: { [Op.eq]: completedStatus },
      date: {
        [Op.and]: {
          [Op.gte]: DateTime.toGetISOStringWithDayStartTime(date),
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(date),
        },
      },
    },
  });

  if (upiAmount && upiAmount !== undefined) {
    if (Number.Get(SsValue?.amount_upi) < Number.Get(upiAmount)) {
      let minusAmount = Number.Get(upiAmount) - Number.Get(SsValue?.amount_upi);
      let summary = `Sales Settlement - Order UPI Amount Missing - Rs. ${minusAmount} - ${locationData?.name} - ${DateTime.shortMonthDate(SsValue?.date)} - ${shiftData?.name} - ${String.concatName(userData?.name, userData?.last_name)}`
      let enquiryTicketParams = {
        req,
        company_id: companyId,
        summary: summary,
        type: Setting.SALE_SETTLEMENT_ENQUIRY_TICKET_TYPE
      }
      await createEnquiryTicket(enquiryTicketParams)
    }
  }
}

const createDraftAmountMissingFineEnquiryTicket = async (params) => {
  let { SsValue, locationData, shiftData, userData, companyId, req } = params;
  let summary = `Sales Settlement - Draft Order Amount Missing - Rs. ${SsValue?.draft_order_amount} - ${locationData?.name} - ${DateTime.shortMonthDate(SsValue?.date)} - ${shiftData?.name} - ${String.concatName(userData?.name, userData?.last_name)}`
  let enquiryTicketParams = {
    req,
    company_id: companyId,
    summary: summary,
    type: Setting.SALE_SETTLEMENT_ENQUIRY_TICKET_TYPE
  }
  await createEnquiryTicket(enquiryTicketParams)
}

const noStockEntryFineEnquiryTicket = async (noStockEntryParams) => {
  let { user_id, date, timeZone, shiftData, locationData, companyId, req, minimumStockEntryCount } = noStockEntryParams;

  if (Number.isNotNull(minimumStockEntryCount)) {

    let params = {
      company_id: companyId,
      user_id: user_id,
      date: date,
      timeZone: timeZone,
      store_id: locationData?.id,
      shift_id: shiftData?.id,
      manageOthers: false
    }
    let { stockEntryProduct } = await StockEntryProductService.getCount(params)
    if (stockEntryProduct < Number.Get(minimumStockEntryCount)) {
      let missingStockEntryProductCount = Number.Get(minimumStockEntryCount) - stockEntryProduct;


      let summary = `Stock Entry - Date: ${DateTime.shortMonthDate(new Date(date))} - Shift: ${shiftData?.name} - Stock Entry Count: ${stockEntryProduct} - Missing Stock Entry Count: ${missingStockEntryProductCount}  `
      let enquiryTicketParams = {
        req,
        company_id: companyId,
        summary,
        type: Setting.STOCK_ENTRY_MISSING_ENQUIRY_TICKET_TYPE
      }
      await createEnquiryTicket(enquiryTicketParams)
    }
  }
}


const lateCheckInFineEnquiryTicket = async (lateCheckInParams) => {
  let { late_hours, startTime, gracePeriod, login, timeZone, companyId, req, shiftData, locationData, userData } = lateCheckInParams;
  let startTimeValue = DateTime.addMinutesToTime(startTime ? startTime : "00:00", gracePeriod)
  let currentTime = DateTime.getGmtHoursAndMinutes(new Date())

  if (DateTime.isValidDate(startTime)) {
    if (currentTime > startTimeValue) {
      if (late_hours && late_hours > 0) {

        let summary = `Attendance - Late Check-In for ${DateTime.getCurrentDateTimeByUserProfileTimezone(login, timeZone)} - ${locationData?.name} - ${shiftData?.name} - ${String.concatName(userData?.name, userData?.last_name)}`
        let enquiryTicketParams = {
          req,
          company_id: companyId,
          summary,
          type: Setting.ATTENDANCE_LATE_CHECK_IN_ENQUIRY_TICKET_TYPE
        }
        await createEnquiryTicket(enquiryTicketParams)
      }

    }
  }

}

const enquiryTicket = async (params) => {
  let { companyId, startDate, endDate, req, timeZone, roleId } = params;


  /* ✴---Sale Settlement---✴ */
  let saleSettlementWhere = {}
  saleSettlementWhere.company_id = companyId;

  if (startDate && endDate) {
    saleSettlementWhere.date = {
      [Op.and]: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
  }

  let saleSettlementList = await SaleSettlement.findAll({ where: saleSettlementWhere });



  /* ✴---Attendance---✴ */
  let attendanceWhere = {}
  attendanceWhere.company_id = companyId;

  if (startDate && endDate) {
    attendanceWhere.date = {
      [Op.and]: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
  }
  attendanceWhere.login = {
    [Op.ne]: null
  }
  attendanceWhere.logout = {
    [Op.ne]: null
  }

  let attendanceList = await Attendance.findAll({ where: attendanceWhere });

  let completedStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_COMPLETED, companyId);

  let shiftList = await shiftModel.findAll({ where: { company_id: companyId } });
  let locationList = await LocationService.list(companyId);
  let userList = await User.findAll({ where: { company_id: companyId, status: STATUS_ACTIVE } })

  if (ArrayList.isArray(attendanceList)) {
    let minimumStockEntryCount = await getSettingValueByObject(
      Setting.STOCK_ENTRY_MINIMUM_COUNT,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let isEnableLateCheckInFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_LATE_CHECK_IN,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let isEnableStockEntryFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_STOCK_ENTRY,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let noStockEntryParams;
    let lateCheckInParams;

    for (let i = 0; i < attendanceList.length; i++) {
      const attendanceValue = attendanceList[i];

      let shiftData = shiftList.find((data) => data?.id == attendanceValue?.shift_id);
      let locationData = ArrayList.isArray(locationList) && locationList.find((data) => data?.id == attendanceValue?.store_id);
      let userData = ArrayList.isArray(userList) && userList.find((data) => data?.id == attendanceValue?.user_id)


      if (isEnableStockEntryFineEnquiryTicket && isEnableStockEntryFineEnquiryTicket == "true") {

        noStockEntryParams = {
          user_id: attendanceValue.user_id,
          date: attendanceValue?.date,
          timeZone: timeZone,
          shiftData: shiftData,
          locationData: locationData,
          roleId: roleId,
          companyId: companyId,
          req: req,
          minimumStockEntryCount: minimumStockEntryCount
        }
        await noStockEntryFineEnquiryTicket(noStockEntryParams)
      }

      if (isEnableLateCheckInFineEnquiryTicket && isEnableLateCheckInFineEnquiryTicket == "true") {
        lateCheckInParams = {
          user_id: attendanceValue.user_id,
          late_hours: attendanceValue?.late_hours,
          startTime: shiftData?.start_time,
          gracePeriod: shiftData?.grace_period,
          login: attendanceValue?.login,
          timeZone: timeZone,
          companyId: companyId,
          location_id: attendanceValue?.store_id,
          shift_id: attendanceValue?.shift_id,
          req,
          roleId,
          shiftData: shiftData,
          locationData: locationData,
          userData: userData
        }
        await lateCheckInFineEnquiryTicket(lateCheckInParams)
      }

    }
  }


  /* ✴---SaleSettlement Loop---✴ */
  if (ArrayList.isArray(saleSettlementList)) {

    let isEnableLocationCashAmountFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_LOCATION_CASH_AMOUNT_MISSING,
      companyId,
      roleId,
      ObjectName.ROLE
    );


    let isEnableOrderCashAmountFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_ORDER_CASH_AMOUNT_MISSING,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let isEnableOrderUpiAmountFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_ORDER_UPI_AMOUNT_MISSING,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    let isEnableDraftAmountFineEnquiryTicket = await getSettingValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_DRAFT_AMOUNT_MISSING,
      companyId,
      roleId,
      ObjectName.ROLE
    );

    for (let i = 0; i < saleSettlementList.length; i++) {
      const SsValue = saleSettlementList[i];

      let shiftData = ArrayList.isArray(shiftList) && shiftList.find((data) => data?.id == SsValue?.shift);
      let locationData = ArrayList.isArray(locationList) && locationList.find((data) => data?.id == SsValue?.store_id);
      let userData = ArrayList.isArray(userList) && userList.find((data) => data?.id == SsValue?.sales_executive)

      if (isEnableLocationCashAmountFineEnquiryTicket && isEnableLocationCashAmountFineEnquiryTicket == "true") {
        await createLocationCashAmountFineEnquiryTicket({ SsValue, locationData, shiftData, userData, companyId, req })
      }

      if (isEnableOrderCashAmountFineEnquiryTicket && isEnableOrderCashAmountFineEnquiryTicket == "true") {
        await createOrderCashAmountMissingFineEnquiryTicket({ SsValue, locationData, shiftData, userData, companyId, req, completedStatus: completedStatus?.id, timeZone })
      }

      if (isEnableOrderUpiAmountFineEnquiryTicket && isEnableOrderUpiAmountFineEnquiryTicket == "true") {
        await createOrderUpiAmountMissingFineEnquiryTicket({ SsValue, locationData, shiftData, userData, companyId, req, completedStatus: completedStatus?.id, timeZone });
      }

      if ((isEnableDraftAmountFineEnquiryTicket && isEnableDraftAmountFineEnquiryTicket == "true") && (SsValue && Number.Get(SsValue?.draft_order_amount) > 0)) {
        await createDraftAmountMissingFineEnquiryTicket({ SsValue, locationData, shiftData, userData, companyId, req })
      }
    }
  }

}

const addFineForDueDateChange = async (params) => {
  let { company_id, type, user_id, due_date, numOfDueDateDays } = params;

  if (Number.isNotNull(type)) {
    const tagDetail = await Tag.findOne({
      where: { id: type, company_id: company_id },
    });

    if (Number.isNotNull(tagDetail)) {
      let fineAmount = Number.GetFloat(tagDetail?.default_amount) * numOfDueDateDays;

      let createData = {
        user: user_id,
        type: type,
        amount: fineAmount,
        company_id: company_id,
        notes: ` Due Date Changed to ${due_date} \n Due Date Days : ${numOfDueDateDays} \n Fine Amount: ${Currency.IndianFormat(tagDetail?.default_amount)}`
      };
      await fineService.create({ body: createData, user: { id: user_id, company_id: company_id } }, null, null);
    }
  }


}

module.exports = {
  create,
  update,
  getdetail,
  search,
  updateStatus,
  ReindexAll,
  del,
  reindex,
  dueDateRequest,
  getDetailById,
  bulkDelete,
  getNextTicketNumber,
  bulkUpdate,
  enquiryTicket,
  createLocationCashAmountFineEnquiryTicket,
  createOrderCashAmountMissingFineEnquiryTicket,
  createOrderUpiAmountMissingFineEnquiryTicket,
  addFineForDueDateChange
};
