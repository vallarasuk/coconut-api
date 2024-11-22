const { Op } = require("sequelize");
const ObjectName = require("../../helpers/ObjectName");
const { BAD_REQUEST } = require("../../helpers/Response");
const Currency = require("../../lib/currency");
const DateTime = require("../../lib/dateTime");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");
const { Salary } = require("../../db").models;
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");



const update = async (req, res, next) => {

  let data = req.body;
  let { id } = req.params;
  try {
    let companyId = Request.GetCompanyId(req);

    const hasPermission = await Permission.GetValueByName(Permission.SALARY_EDIT, req.role_permission);
   

    if (!id) {
      return res.json(400, {
        message: "Invalid Id"
      });
    }

    let salaryDetail = await Salary.findOne({
      where: {
        id: id,
        company_id: companyId
      },
    });

    let where = new Object();

    where.user_id = Number.Get(data.user);
    where.month = data.month;
    where.year = data.year;
    where.id = { [Op.ne]: Number.Get(id) };

    let salaryExist = await Salary.findOne({
      where: where,
    });


    if (!salaryDetail) {
      return res.json(BAD_REQUEST, {
          message: "Salary Detail Not Found"
      });
  }

  if(salaryExist){
      return res.json(BAD_REQUEST, { message: `Salary Already Exists` });

  }

    let updateData = {};

    updateData.other_deductions = Number.Get(data.other_deductions);
    updateData.other_allowance = Number.Get(data.other_allowance);
    updateData.notes = data.notes ? data.notes : '';

  let historyMessage= new Array()

  if(Number.Get(data?.other_deductions) !==Number.Get(salaryDetail?.other_deductions)){
  historyMessage.push(`Other Deducations changed to ${data?.other_deductions}`)
  }

   if(Number.Get(data?.other_allowance)!== Number.Get(salaryDetail?.other_allowance)){
   historyMessage.push(`Other Allowance changed to ${data?.other_allowance}`)
   }

   if(data?.notes !== salaryDetail?.notes){
    historyMessage.push(`Notes changed to ${data?.notes}`)
    }

    await Salary.update(updateData, {
      where: {
          id: id,
          company_id: companyId
      }
  });

  res.json(200, {
      message: "Salary Data Updated"
  });
  res.on("finish", async () => {
    let message = historyMessage.join();
      History.create(`${message}`, req, ObjectName.SALARY, id);
  });

  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message
    });
  }
}

module.exports = update;