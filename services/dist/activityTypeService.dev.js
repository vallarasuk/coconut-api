"use strict";

let ObjectName = require("../helpers/ObjectName");

let Permission = require("../helpers/Permission");

let _require = require("../helpers/Response"),
    BAD_REQUEST = _require.BAD_REQUEST,
    OK = _require.OK;

let Request = require("../lib/request");

let History = require("./HistoryService");

let errors = require("restify-errors");

let validator = require("../lib/validator");

let DateTime = require("../lib/dateTime");

let ActivityType = require("../db").models.ActivityType;

let _require2 = require("sequelize"),
    Op = _require2.Op;

let create = function create(req, res, next) {
  let hasPermission, data, companyId, name, activityExist, activityTypeData;
  return regeneratorRuntime.async(function create$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(Permission.Has(Permission.ACTIVITY_TYPE_ADD, req));

        case 2:
          hasPermission = _context.sent;

       
          

        case 5:
          data = req.body; // Validate name

          if (data.name) {
            _context.next = 8;
            break;
          }

          return _context.abrupt("return", res.json(BAD_REQUEST, {
            message: "Name is required"
          }));

        case 8:
          companyId = req.user && req.user.company_id;

          if (companyId) {
            _context.next = 11;
            break;
          }

          return _context.abrupt("return", res.json(400, {
            message: "Company Not Found"
          }));

        case 11:
          _context.prev = 11;
          name = data.name.trim(); // Validate duplicate product brand name

          _context.next = 15;
          return regeneratorRuntime.awrap(ActivityType.findOne({
            where: {
              name: name,
              company_id: companyId
            }
          }));

        case 15:
          activityExist = _context.sent;

          if (!activityExist) {
            _context.next = 18;
            break;
          }

          return _context.abrupt("return", res.json(BAD_REQUEST, {
            message: " Activity Type Name Already Exist"
          }));

        case 18:
          // Activity Type data
          activityTypeData = {
            name: data.name,
            company_id: companyId
          }; // Create new Activity Type

          _context.next = 21;
          return regeneratorRuntime.awrap(ActivityType.create(activityTypeData));

        case 21:
          //create a log
          History.create("Activity Type Added ", req); // API response

          res.json(OK, {
            message: "Activity Type Added"
          });
          _context.next = 29;
          break;

        case 25:
          _context.prev = 25;
          _context.t0 = _context["catch"](11);
          //create a log
          History.create("Activity Type Creation Error - ".concat(_context.t0.message), req);
          res.json(BAD_REQUEST, {
            message: _context.t0.message
          });

        case 29:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[11, 25]]);
};

module.exports = {
  create: create
};