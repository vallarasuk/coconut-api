const { dashboardIndex } = require("../../db").models;
const errors = require("restify-errors");
const Sequelize = require("sequelize");

function list(req, res, next) {
  const data = req.query;
  const where = {};
  if (!req.isAdmin && !req.isManager && !req.isScrumMaster) {
    where.user_id = req.user.id;
  }

  const validOrder = ["ASC", "DESC"];

  const sortableFields = {
    userName: "dashboardIndex.user_name",
    todaysTickets: "dashboardIndex.todays_tickets",
    openTickets: "dashboardIndex.open_tickets",
    reopenedTickets: "dashboardIndex.reopen_tickets",
    holdTickets: "dashboardIndex.hold_tickets",
    inProgressTickets: "dashboardIndex.inprogress_tickets",
    reviewTickets: "dashboardIndex.review_tickets",
    completedTickets: "dashboardIndex.completed_tickets",
    myReviewTickets: "dashboardIndex.myreview_tickets",
    newTickets: "dashboardIndex.new_tickets",
    finalReviewTickets: "dashboardIndex.final_review_tickets",
  };
  const sort = data.sort || "userName";
  const sortDir = data.sortDir || "ASC";
  if (!validOrder.includes(sortDir)) {
    return next(new errors.BadRequestError("Invalid sort order"));
  }

  dashboardIndex
    .findAll({
      attributes: [
        "user_id",
        "user_name",
        "user_status",
        "pending_tickets",
        "pending_estimated_hours",
        "pending_story_points",
        "todays_tickets",
        "todays_estimated_hours",
        "todays_story_points",
        "open_tickets",
        "open_estimated_hours",
        "open_story_points",
        "reopen_tickets",
        "reopen_estimated_hours",
        "reopen_story_points",
        "hold_tickets",
        "hold_estimated_hours",
        "hold_story_points",
        "inprogress_tickets",
        "inprogress_estimated_hours",
        "inprogress_story_points",
        "review_tickets",
        "review_estimated_hours",
        "review_story_points",
        "completed_tickets",
        "completed_estimated_hours",
        "completed_story_points",
        "myreview_tickets",
        "myreview_estimated_hours",
        "myreview_story_points",
        "new_tickets",
        "new_estimated_hours",
        "new_story_points",
        "future_tickets",
        "future_estimated_hours",
        "future_story_points",
        "profile_status",
        "final_review_tickets",
        "final_review_estimated_hours",
        "final_review_story_points",
      ],
      where,
      order: [[Sequelize.literal(`${sortableFields[sort]}`), `${sortDir}`]],
    })
    .then((results) => {
      const dashboardCounts = [];
      results.forEach((dashboard) => {
        dashboardCounts.push({
          userId: dashboard.user_id,
          userName: dashboard.user_name,
          userStatus: dashboard.user_status,
          profileStatus: dashboard.profile_status,
          pendingTickets: dashboard.pending_tickets,
          pendingEstimatedHours: dashboard.pending_estimated_hours,
          pendingStoryPoints: dashboard.pending_story_points,
          todaysTickets: dashboard.todays_tickets,
          todaysEstimatedHours: dashboard.todays_estimated_hours,
          todaysStoryPoints: dashboard.todays_story_points,
          openTickets: dashboard.open_tickets,
          openEstimatedHours: dashboard.open_estimated_hours,
          openStoryPoints: dashboard.open_story_points,
          reopenedTickets: dashboard.reopen_tickets,
          reopenedEstimatedHours: dashboard.reopen_estimated_hours,
          reopenedStoryPoints: dashboard.reopen_story_points,
          holdTickets: dashboard.hold_tickets,
          holdEstimatedHours: dashboard.hold_estimated_hours,
          holdStoryPoints: dashboard.hold_story_points,
          inProgressTickets: dashboard.inprogress_tickets,
          inProgressEstimatedHours: dashboard.inprogress_estimated_hours,
          inProgressStoryPoints: dashboard.inprogress_story_points,
          reviewTickets: dashboard.review_tickets,
          reviewEstimatedHours: dashboard.review_estimated_hours,
          reviewStoryPoints: dashboard.review_story_points,
          completedTickets: dashboard.completed_tickets,
          completedEstimatedHours: dashboard.completed_estimated_hours,
          completedStoryPoints: dashboard.completed_story_points,
          myReviewTickets: dashboard.myreview_tickets,
          myReviewEstimatedHours: dashboard.myreview_estimated_hours,
          myReviewStoryPoints: dashboard.myreview_story_points,
          newTickets: dashboard.new_tickets,
          newEstimatedHours: dashboard.new_estimated_hours,
          newStoryPoints: dashboard.new_story_points,
          futureTickets: dashboard.future_tickets,
          futureEstimatedHours: dashboard.future_estimated_hours,
          futureStoryPoints: dashboard.future_story_points,
          finalReviewTickets: dashboard.final_review_tickets,
          finalReviewEstimatedHours: dashboard.final_review_estimated_hours,
          finalReviewStoryPoints: dashboard.final_review_story_points,
        });
      });

      res.json(dashboardCounts);
    }).catch((err)=>{
      console.log(err);
    })
}

module.exports = list;
