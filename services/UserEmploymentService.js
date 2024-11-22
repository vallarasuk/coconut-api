const History = require('./HistoryService');
const DateTime = require('../lib/dateTime');
const Request = require('../lib/request');
const Response = require('../helpers/Response');
// Models
const { UserEmployment, User } = require('../db').models;
const DataBaseService = require('../lib/dataBaseService');
const { Op } = require('sequelize');
const ObjectName = require('../helpers/ObjectName');
const UserEmploymentService = new DataBaseService(UserEmployment);
const Number = require('../lib/Number');
const UserService = require("./UserService");
/**
 * UserEmployment Create route
 */

const create = async (req, user_id, companyId, res) => {
  try {
    // add field values to db
    let createData = {
      start_date: req.date_of_joining,
      user_id: user_id,
      company_id: companyId,
    };

    // create a contact
    await UserEmploymentService.create(createData);
  } catch (err) {
    console.log(err);
  }
};

const add = async (req, res, next) => {
  try {
    const data = req.body;
    const { id } = req.params;

    const companyId = Request.GetCompanyId(req);
    const userEmployeeDetails = await UserEmploymentService.findOne({
      where: { user_id: id, company_id: companyId },
    });
    if (userEmployeeDetails) {
      return res.json(Response.BAD_REQUEST, { message: 'User Employment already exist' });
    }

    const createData = {
      user_id: id,
      company_id: companyId,
      designation: data.designation,
      start_date: DateTime.Get(data.start_date),
      end_date: DateTime.Get(data.end_date),
      salary: Number.Get(data.salary),
      leave_balance: data?.leave_balance,
      manager: data?.manager
    };
    const UserEmploymentDetail = await UserEmploymentService.create(createData);

    res.on('finish', async () => {
      History.create(
        "User Employment Created",
        req,
        ObjectName.USER_EMPLOYMENT,
        UserEmploymentDetail?.id
      );
    });

    res.json(Response.OK, { message: 'User Employment added' });
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const update = async (req, res, next) => {
  const data = req.params;

  const { id } = req.params;

  const companyId = Request.GetCompanyId(req);
  try {
    const useDetail = await UserEmploymentService.findOne({
      where: { user_id: id, company_id: companyId },
    });

    //update User Employment
    const updateData = {};

    updateData.designation = data?.designation ? data?.designation : null;

    updateData.manager = data?.manager ? data?.manager : null;

    updateData.primary_location = data?.primaryLocation ? data?.primaryLocation : null;

    updateData.primary_shift = data?.primaryShift ? data?.primaryShift : null;

    updateData.start_date = data?.start_date ? DateTime.formateDateAndTime(data.start_date) : null;

    updateData.end_date = data?.end_date ? DateTime.formateDateAndTime(data.end_date) : null;

    updateData.salary = data?.salary ? Number.Get(data?.salary) : null;

    updateData.company_id = companyId;

    updateData.working_days = data?.working_days ? data?.working_days : null;

    updateData.leave_balance = data?.leave_balance ? data?.leave_balance : null;

    let updateUser = {};

    updateUser.company_id = companyId;

    updateUser.login_time = data?.login_time ? data?.login_time : null;

    updateUser.minimum_working_hours = data?.minimum_working_hours ? data?.minimum_working_hours : null;

    if (useDetail) {
      const save = await useDetail.update(updateData);
      await User.update(updateUser, { where: { id: id, company_id: companyId } });
      res.on('finish', async () => {
        History.create("User Employment Updated", req, ObjectName.USER_EMPLOYMENT, save.id);
      });
      // API response
      res.json(Response.UPDATE_SUCCESS, { message: 'User Employment Updated', data: save.get() });
    } else {
      const userEmploymentDetail = await UserEmploymentService.create({
        user_id: id,
        ...updateUser,
        ...updateData
      });
      await User.update(updateUser, { where: { id: id, company_id: companyId } });
      res.on('finish', async () => {
        History.create(
          "User Employment Created",
          req,
          ObjectName.USER_EMPLOYMENT,
          userEmploymentDetail?.id
        );
        await UserService.reindex(id, companyId)
      });
      res.json(Response.OK, { message: 'User Employment added ' });
    }
  } catch (err) {
    //create a log
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
};
module.exports = {
  create,
  add,
  update,
};
