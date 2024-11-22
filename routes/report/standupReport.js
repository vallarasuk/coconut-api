const errors = require("restify-errors");
const { models, sequelize } = require("../../db");
const async = require("async");
const { Op } = require("sequelize");

// Utils
const utils = require("../../lib/utils");

// Constants
const groups = require("../ticketStatus/groups");
const { TYPE_BUG } = require("../projectTicketType/types");

// Models
const { User, Attendance, Activity, IndexTicket, ProjectTicketType } = models;

const DateTime = require("../../lib/dateTime");

const dateTime = new DateTime();

/**
 * Get Project Ticket Type By Type
 *
 * @param {*} type
 * @param {*} callback
 */
function getProjectTicketTypesByType(type, callback) {
  ProjectTicketType.findAll({
    attributes: ["id"],
    where: { type },
  }).then((projectTicketTypeDetails) => {
    if (!projectTicketTypeDetails) {
      return callback();
    }
    const projectTicketTypeIds = [];
    projectTicketTypeDetails.forEach((ticketType) => {
      projectTicketTypeIds.push(ticketType.id);
    });
    return callback(null, projectTicketTypeIds);
  });
}

function dailyReports(req, res, next) {
  const data = req.query;

 

  const todayDate = utils.getSQlFormattedDate();
  const date = data.weekdaysDate;

  const where = { active: 1 };
  const dateFilter = utils.getDateFilter(date, "", "");
  const attendanceWhereCondition = {};
  if (dateFilter) {
    attendanceWhereCondition.date = utils.getDateFilter(date, "", "");
  }

  const filedTicketWhereCondition = {};
  getProjectTicketTypesByType(TYPE_BUG, (err, projectTicketTypeIds) => {
    filedTicketWhereCondition.type_id = { $in: projectTicketTypeIds };
  });

  if (dateFilter) {
    filedTicketWhereCondition.created_at = utils.getDateFilter(date, "", "");
  }

  const activityWhereCondition = { ticket_internal_id: { [Op.ne]: null } };
  if (dateFilter) {
    activityWhereCondition.date = utils.getDateFilter(date, "", "");
  }

  const reviewTicketWhereCondition = {
    status_group_id: {
      $in: [groups.REVIEW, groups.COMPLETED, groups.FINAL_REVIEW],
    },
  };
  if (dateFilter) {
    reviewTicketWhereCondition.eta = utils.getDateFilter(date, "", "");
  }

  const pendingTicketWhereCondition = {
    status_group_id: {
      $in: [groups.OPEN, groups.INPROGRESS, groups.REOPENED, groups.HOLD],
    },
  };
  if (dateFilter) {
    pendingTicketWhereCondition.eta = utils.getDateFilter("", "", date);
  }

  const dailyReport = [];
  User.findAll({
    attributes: [
      "id",
      "name",
      "last_name",
      "profile_photo",
      "role",
      "minimum_story_points",
      "minimum_reported_tickets_story_points",
    ],
    where,
    order: [["name"]],
  }).then((users) => {
    async.each(
      users,
      (user, cb) => {
        user = user.get();

        const user_id = user.id;
        const userFirstName = user.name;
        const userLastName = user.last_name;
        const profileImage = user.profile_photo;
        const minimumStoryPoints = user.minimum_story_points;
        const minimumReportedTicketStoryPoints =
          user.minimum_reported_tickets_story_points;
        attendanceWhereCondition.user_id = user_id;
        filedTicketWhereCondition.reported_by = user_id;
        activityWhereCondition.user_id = user_id;
        reviewTicketWhereCondition.assigned_to = user_id;
        pendingTicketWhereCondition.assigned_to = user_id;
        Promise.all([
          Attendance.findOne({
            attributes: [
              "id",
              "login",
              "logout",
              "late_hours",
              "productive_hours",
              "worked_hours",
              "not_worked_hours",
            ],
            where: attendanceWhereCondition,
            order: [["id", "DESC"]],
          }),
          Activity.findOne({
            attributes: [
              [
                sequelize.literal("COUNT(DISTINCT(ticket_internal_id))"),
                "workedTicket",
              ],
              [
                sequelize.fn(
                  "group_concat",
                  sequelize.col("ticket_internal_id")
                ),
                "ticketInternalIds",
              ],
            ],
            where: activityWhereCondition,
          }),
          IndexTicket.findOne({
            attributes: [
              [sequelize.literal("COUNT(DISTINCT(ticket_id))"), "filedTicket"],
              [
                sequelize.literal("SUM(estimated_hours)"),
                "filedTicketEstimateHours",
              ],
              [
                sequelize.literal("SUM(story_points)"),
                "filedTicketStoryPoints",
              ],
            ],
            where: filedTicketWhereCondition,
          }),
          IndexTicket.findOne({
            attributes: [
              [sequelize.literal("COUNT(DISTINCT(ticket_id))"), "reviewTicket"],
              [
                sequelize.literal("SUM(estimated_hours)"),
                "reviewTicketEstimateHours",
              ],
              [
                sequelize.literal("SUM(story_points)"),
                "reviewTicketStoryPoints",
              ],
            ],
            where: reviewTicketWhereCondition,
          }),
          IndexTicket.findOne({
            attributes: [
              [
                sequelize.literal("COUNT(DISTINCT(ticket_id))"),
                "pendingTicket",
              ],
              [
                sequelize.literal("SUM(estimated_hours)"),
                "pendingTicketEstimateHours",
              ],
              [
                sequelize.literal("SUM(story_points)"),
                "pendingTicketStoryPoints",
              ],
            ],
            where: pendingTicketWhereCondition,
          }),
          IndexTicket.findAll({
            attributes: ["ticket_id", "ticket_url", "summary", "story_points"],
            where: filedTicketWhereCondition,
          }),
          Activity.findAll({
            attributes: [
              "notes",
              "activity",
              "activity_type",
              "created_at",
              "start_date",
              "end_date",
              "actual_hours",
            ],
            where: {
              date: utils.getDateFilter(date, "", ""),
              user_id: user_id,
            },
          }),
          IndexTicket.findAll({
            attributes: ["id", "ticket_id"],
            where: {
              assigned_to: user_id,
              eta: utils.getDateFilter(date, "", ""),
              status_group_id: {
                $in: [
                  groups.OPEN,
                  groups.INPROGRESS,
                  groups.REOPENED,
                  groups.HOLD,
                  groups.FINAL_REVIEW,
                  groups.REVIEW,
                ],
              },
            },
          }),
        ]).then(async (results) => {
          const [
            attendance,
            workedTickets,
            issueFiledTicket,
            reviewedTicket,
            pendingTickets,
            issueFiledTicketDetails,
            activityLists,
            pendingTicket,
          ] = results;
          let pendingTicketIds = [];
          if (pendingTicket) {
            pendingTicket.forEach((data) => {
              if (data) {
                let ticketId = data.get().id.toString();
                pendingTicketIds.push(ticketId);
              }
            });
          }
          const dailyIssueFiledTicketDetails = [];
          issueFiledTicketDetails.forEach((issueFiledTicketDetail) => {
            dailyIssueFiledTicketDetails.push({
              ticketId: issueFiledTicketDetail.ticket_id,
              ticketUrl: issueFiledTicketDetail.ticket_url,
              Summary: utils.rawURLDecode(issueFiledTicketDetail.summary),
              reportedStoryPoints: issueFiledTicketDetail.story_points,
            });
          });

          const activitiesList = [];
          activityLists.forEach((activityList) => {
            activitiesList.push({
              activity: activityList.activity ? activityList.activity : "",
              activityType: activityList.activity_type
                ? activityList.activity_type
                : "",
              activityNotes: activityList.notes
                ? utils.rawURLDecode(activityList.notes)
                : "",
              activityStartDate: activityList.start_date
                ? utils.formatLocalDate(activityList.start_date, "LT")
                : "",
              activityEndDate: activityList.end_date
                ? utils.formatLocalDate(activityList.end_date, "LT")
                : "",
              activityDuration: activityList.actual_hours
                ? DateTime.covertToHoursAndMinutes(activityList.actual_hours)
                : "",
            });
          });

          const workedTicketIds = workedTickets.get().ticketInternalIds
            ? workedTickets.get().ticketInternalIds.split(",")
            : [];
          let filteredWorkedTicketIds;
          let workedTicketLists;

          if (pendingTicketIds || workedTicketIds) {
            filteredWorkedTicketIds = pendingTicketIds.filter((val) => {
              if (!workedTicketIds.includes(val)) {
                return val;
              } else {
                return val;
              }
            });
          }
          const dailyWorkedTicketDetails = [];
          if (filteredWorkedTicketIds) {
            workedTicketLists = await IndexTicket.findAll({
              attributes: [
                "ticket_id",
                "ticket_url",
                "summary",
                "status_name",
                "status_group_id",
                "system_hours",
                "actual_hours",
                "story_points",
              ],
              where: {
                id: { $in: filteredWorkedTicketIds },
                assigned_to: user_id,
              },
              include: [
                {
                  required: false,
                  model: Activity,
                  as: "activity",
                  attributes: [
                    "notes",
                    "ticket_internal_id",
                    "start_date",
                    "end_date",
                    "actual_hours",
                    "activity",
                  ],
                  where: { date: utils.getDateFilter(date, "", "") },
                },
              ],
            });
          }

          const completedTicketList = [];
          const pendingTicketList = [];
          if (workedTicketLists && workedTicketLists.length > 0) {
            await workedTicketLists.forEach(async (workedTicketList) => {
              const ticketTaskList = [];
              const activities = workedTicketList.activity;
              if (activities && activities.length > 0) {
                await activities.forEach((activity) => {
                  const taskStartTime = activity.start_date
                    ? activity.start_date
                    : "";
                  const taskEndTime = activity.end_date
                    ? activity.end_date
                    : "";
                  const taskDuration = activity.actual_hours
                    ? activity.actual_hours
                    : "";
                  ticketTaskList.push({
                    ticketTask: utils.rawURLDecode(activity.notes),
                    ticketTaskStartTime: utils.formatLocalDate(
                      taskStartTime,
                      dateTime.formats.frontEndTime
                    ),
                    ticketTaskEndTime: utils.formatLocalDate(
                      taskEndTime,
                      dateTime.formats.frontEndTime
                    ),
                    ticketTaskDuration:
                    DateTime.covertToHoursAndMinutes(taskDuration),
                    ticketTaskActivity: activity.activity,
                  });
                });
              }
              const workedTicketData = {
                ticketId: workedTicketList.ticket_id,
                ticketUrl: workedTicketList.ticket_url,
                ticketSummary: utils.rawURLDecode(workedTicketList.summary),
                ticketCurrentStatusId: workedTicketList.status_group_id,
                ticketCurrentStatus: workedTicketList.status_name,
                ticketSystemHours: workedTicketList.system_hours
                  ? utils
                      .convertMsToHours(workedTicketList.system_hours)
                      .toFixed(2)
                  : 0,
                ticketActualHours: workedTicketList.actual_hours
                  ? utils
                      .convertMsToHours(workedTicketList.actual_hours)
                      .toFixed(2)
                  : 0,
                ticketTasks: ticketTaskList,
                ticketStoryPoints: workedTicketList.story_points,
              };
              if (
                workedTicketList.status_group_id === groups.OPEN ||
                workedTicketList.status_group_id === groups.INPROGRESS ||
                workedTicketList.status_group_id === groups.REOPENED ||
                workedTicketList.status_group_id === groups.HOLD
              ) {
                pendingTicketList.push(workedTicketData);
              }
              if (
                workedTicketList.status_group_id === groups.REVIEW ||
                workedTicketList.status_group_id === groups.COMPLETED ||
                workedTicketList.status_group_id === groups.FINAL_REVIEW
              ) {
                completedTicketList.push(workedTicketData);
              }
            });
          }

          const reviewTicketStoryPoints =
            reviewedTicket.get().reviewTicketStoryPoints;
          let completedPercentage;
          if (user.minimum_story_points) {
            completedPercentage =
              (reviewTicketStoryPoints / user.minimum_story_points) * 100;
          }

          const filedTicketStoryPoints =
            issueFiledTicket.get().filedTicketStoryPoints;
          let reportedPercentage;
          if (user.minimum_reported_tickets_story_points) {
            reportedPercentage =
              (filedTicketStoryPoints /
                user.minimum_reported_tickets_story_points) *
              100;
          }

          dailyReport.push({
            userFirstName,
            userLastName,
            profileImage,
            profilePhotoUrl: utils.getUserMediaUrl(profileImage),
            minimumStoryPoints,
            minimumReportedTicketStoryPoints,
            userInitial: userFirstName.charAt(0).toUpperCase(),
            type_id: filedTicketWhereCondition.type_id.$in,
            login: attendance
              ? utils.formatLocalDate(attendance.login, "LT")
              : null,
            logout: attendance
              ? utils.formatLocalDate(attendance.logout, "LT")
              : null,
            lateHours: attendance
              ? utils.convertToHours(attendance.late_hours)
              : null,
            productiveHours: attendance
              ? utils.convertToHours(attendance.productive_hours)
              : null,
            workedHours: DateTime.getHours(
              attendance ? attendance.login : null,
              attendance ? attendance.logout : null
            ),
            lop: attendance
              ? utils.convertToHours(attendance.not_worked_hours)
              : null,
            workedTicketsCount: workedTickets.get().workedTicket,
            date,
            user_id,
            formattedDate: utils.getSQlFormattedDate(date, "DD-MM-YYYY"),
            ticketInternalIds: workedTickets.get().ticketInternalIds,
            filedTicketCount: issueFiledTicket.get().filedTicket,
            filedTicketEstimateHours:
              issueFiledTicket.get().filedTicketEstimateHours,
            filedTicketStoryPoints: filedTicketStoryPoints
              ? issueFiledTicket.get().filedTicketStoryPoints
              : 0,
            dailyIssueFiledTicketDetails,
            dailyWorkedTicketDetails,
            completedTicketList,
            pendingTicketList,
            activitiesList,
            reviewTicketCount: reviewedTicket.get().reviewTicket,
            reviewTicketEstimateHours:
              reviewedTicket.get().reviewTicketEstimateHours,
            reviewTicketStoryPoints: reviewTicketStoryPoints
              ? reviewedTicket.get().reviewTicketStoryPoints
              : 0,
            pendingTicketCount: pendingTickets.get().pendingTicket,
            pendingTicketEstimateHours:
              pendingTickets.get().pendingTicketEstimateHours,
            pendingTicketStoryPoints:
              pendingTickets.get().pendingTicketStoryPoints,
            completedPercentage: completedPercentage,
            reportedPercentage: reportedPercentage,
          });
          return cb();
        });
      },
      (err) => {
        if (err) {
          return next(err);
        }

        dailyReport.sort((a, b) =>
          a.userFirstName.localeCompare(b.userFirstName)
        );

        res.json(dailyReport);
      }
    );
  });
}

module.exports = dailyReports;
