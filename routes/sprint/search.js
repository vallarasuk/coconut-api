// Utils
/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");

// Models
const { Sprint,status } = require("../../db").models;
const { Op, Sequelize } = require("sequelize");
const { sprintService } = require("../../services/SprintService ");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");


/**
 * Sprint search route
 */
async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.SPRINT_VIEW, req);
 
  await  sprintService.search(req,res,next);
}
module.exports = search;
