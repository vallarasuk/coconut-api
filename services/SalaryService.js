const {
  Attendance,
  User: UserModel,
  UserEmployment,
  Holiday,
  Salary,
  FineBonus,
  Shift,
  Tag,
} = require("../db").models;
const { Op, Sequelize, QueryTypes } = require("sequelize");
const DataBaseService = require("../lib/dataBaseService");
const UserEmploymentService = new DataBaseService(UserEmployment);
const String = require("../lib/string");
const DateTime = require("../lib/dateTime");
const Number = require("../lib/Number");
const Response = require("../helpers/Response");
const ArrayList = require("../lib/ArrayList");
const { getSettingValueByObject, getSettingValue } = require("./SettingService");
const Setting = require("../helpers/Setting");
const ObjectName = require("../helpers/ObjectName");
const Request = require("../lib/request");
const history = require("./HistoryService");
const StatusService = require("./StatusService");
const Status = require("../helpers/Status");
const Currency = require("../lib/currency");
const Month = require("../lib/Month");
const db = require("../db");
const fineType = require("../helpers/FineType");
const { Type } = require("../helpers/AttendanceType");

class SalaryService {
  static getCalculatedData = async (params) => {
    const { data, companyId, timeZone } = params;

    let SalaryDate = DateTime.getMonthStartEndDates(
      data.month,
      data.year,
      timeZone
    );

    const user_id = data.user ? data.user : data.user_id;
    const endDate = data.endDate ? data.endDate : SalaryDate?.endDate;
    const startDate = data.startDate ? data.startDate : SalaryDate?.startDate;

    try {
      // Get count based on type
      const getAttendanceData = async () => {
        try {
          let whereCondition = "";

          companyId ? (whereCondition += ` attendance."company_id" = ${companyId}`) : "";
          user_id ? (whereCondition += ` AND attendance."user_id" = ${user_id}`) : "";
          startDate
            ? (whereCondition += ` AND attendance."date" >= '${startDate}'`)
            : "";
          endDate ? (whereCondition += ` AND attendance."date" <= '${endDate}'`) : "";
          whereCondition += ` AND attendance."deleted_at" IS NULL`;
          let query = `
          SELECT 
              attendanceType.name AS type_name, 
              attendanceType.is_leave, 
              attendanceType.is_working_day,
              attendanceType.days_count,
              COUNT(attendance.type) AS count, 
              attendance.type AS type
      
          FROM 
              Attendance AS attendance
          LEFT JOIN 
              attendance_type AS attendanceType ON attendance.type = attendanceType.id
          WHERE 
              ${whereCondition}
          GROUP BY 
              attendanceType.name, 
              attendanceType.is_leave, 
              attendanceType.is_working_day,
              attendanceType.days_count,
              attendance.type;
      `;

          // list
          const list = await db.connection.query(query, {
            type: QueryTypes.SELECT,
          });
          let attendanceList = list && list;

          let attendanceDataList = [];

          if (attendanceList && attendanceList.length > 0) {
            for (let i = 0; i < attendanceList.length; i++) {
              attendanceDataList.push(attendanceList[i]);
            }
          }
          return attendanceDataList;
        } catch (err) {
          console.log(err);
        }
      };

      let attendaceList = await getAttendanceData();

      if (attendaceList && attendaceList.length > 0) {

        let additional_hours;
        let totalAdditionalMinutes;
        let allowAdditonalHour = await getSettingValue(Setting.ENABLE_SALARY_ADDITIONAL_HOURS,companyId)
         if(allowAdditonalHour && allowAdditonalHour == "true"){
          totalAdditionalMinutes = await Attendance.sum("additional_hours", {
            where: {
              user_id: user_id,
              date: {
                [Op.and]: {
                  [Op.gte]: startDate,
                  [Op.lte]: endDate,
                },
              },
              company_id: companyId,
            },
          });
  
          // Additional Hours
           additional_hours = DateTime.HoursAndMinutes(totalAdditionalMinutes);
         }
        // Get Store list and count
        const userDetail = await UserModel.findOne({
          where: {
            id: user_id,
            company_id: companyId,
          },
        });

        let completeStatus = await StatusService.getAllStatusByGroupId(
          ObjectName.FINE,
          Status.GROUP_COMPLETED,
          companyId
        );
        let bonusCompleteStatus = await StatusService.getAllStatusByGroupId(
          ObjectName.BONUS,
          Status.GROUP_COMPLETED,
          companyId
        )
        let completeStatusIds =
          completeStatus && completeStatus.length > 0
            ? completeStatus?.map((value) => value.id)
            : [];

            let bonusCompleteStatusIds =
            bonusCompleteStatus && bonusCompleteStatus.length > 0
              ? bonusCompleteStatus?.map((value) => value.id)
              : [];
  

        // Bonus Amount
        let bonusAmountValue = 0;

        const bonusTypeList = await Tag.findAll({
          where: {
            company_id: companyId,
            type: fineType.BONUS,
          },
        });

        if (ArrayList.isArray(bonusTypeList)) {
          const tagIds = bonusTypeList.map((tag) => tag.id);
          let bonusAmount = await FineBonus.sum("amount", {
            where: {
              user: Number.Get(user_id),
              company_id: companyId,
              status: { [Op.in]: bonusCompleteStatusIds },
              date: {
                [Op.and]: {
                  [Op.gte]: startDate,
                  [Op.lte]: endDate,
                },
              },
              type: tagIds,
            },
          });
          bonusAmountValue = Number.GetFloat(bonusAmount);
        }

        // Fine Amount
        let fineAmountValue = 0;

        const fineTypeList = await Tag.findAll({
          where: {
            company_id: companyId,
            type: fineType.FINE,
          },
        });

        if (ArrayList.isArray(fineTypeList)) {
          const tagIds = fineTypeList.map((tag) => tag.id);

          let fineAmount = await FineBonus.sum("amount", {
            where: {
              user: Number.Get(user_id),
              company_id: companyId,
              status: { [Op.in]: completeStatusIds },
              date: {
                [Op.and]: {
                  [Op.gte]: startDate,
                  [Op.lte]: endDate,
                },
              },
              type: tagIds,
            },
          });

          fineAmountValue = Number.GetFloat(fineAmount);
        }

        const userEmployeeDetails = await UserEmploymentService.findOne({
          where: {
            user_id: user_id,
            company_id: companyId,
          },
        });

        // Monthly Salary
        let monthlySalary = Number.Get(userEmployeeDetails?.salary);

        const attendanceList = [];
        let roleWorkingDays = await getSettingValueByObject(
          Setting.USER_WORKING_DAYS,
          companyId,
          userDetail?.role,
          ObjectName.ROLE
        );

        // Working Days
        let workingDays = DateTime.getDaysInAMonth(
          startDate,
          endDate,
          roleWorkingDays
        );

        let holidays;
        let totalWorkingDays;

        if (startDate && endDate) {
          holidays = await Holiday.findAndCountAll({
            where: {
              date: {
                [Op.between]: [startDate, endDate],
              },
            },
          });

          totalWorkingDays = workingDays - holidays.count;
        }

        const totalMonths = DateTime.getMonthCount(startDate, endDate);

        // salary Per Day
        let salaryPerDay = monthlySalary / totalWorkingDays;

        let leaveDays = attendaceList.filter((value) => value.is_leave == true);

        let leaveDaysData = [];
        if (leaveDays && leaveDays.length > 0) {
          for (let i = 0; i < leaveDays.length; i++) {
            leaveDaysData.push({
              amount:
                leaveDays[i].count *
                Number.GetFloat(salaryPerDay * leaveDays[i].days_count),
              typeName: leaveDays[i].type_name,
              count: leaveDays[i].count,
              days_count: leaveDays[i].days_count,
              type: Type.LEAVE_TEXT,
            });
          }
        }

        let workedDay = attendaceList.filter(
          (value) => value.is_working_day == true
        );

        let workedDaysData = [];
        if (workedDay && workedDay.length > 0) {
          for (let i = 0; i < workedDay.length; i++) {
            let salary =
              workedDay[i].count *
              Number.GetFloat(salaryPerDay * (workedDay[i].days_count));
            if (salary && Number.GetFloat(salary) > 0) {
              workedDaysData.push({
                amount: salary,
                typeName: workedDay[i].type_name,
                count: workedDay[i].count,
                days_count: workedDay[i].days_count,
                type: Type.WORKING_DAY_TEXT,
              });
            }
          }
        }

        let mergedData = [...leaveDaysData, ...workedDaysData];

        const attendanceCount =
          mergedData && mergedData.length > 0 ? JSON.stringify(mergedData) : "";
        // total Leave Salary
        const totalLeaveSalary = leaveDaysData
        .filter(item => item.days_count > 1) // Filter items with days_count > 1
        .reduce((sum, item) => sum + Number.GetFloat(item.amount || 0), 0); // Sum the filtered items
        const totalWorkedDays = workedDaysData.reduce(
          (sum, item) => sum + Number.GetFloat(item.count || 0),
          0
        );

        // total Worked Salary
        const totalWorkedSalary = workedDaysData.reduce(
          (sum, item) => sum + Number.GetFloat(item.amount || 0),
          0
        ); 

        // pf
        let pf = Number.GetFloat(data.provident_fund);

        // Pt
        let pt = Number.GetFloat(data.professional_tax);

        // medical insurance
        let medical_insurance =
          Number.GetFloat(data.medical_insurance) *
          Number.GetFloat(totalMonths);

        // Gratuity
        let gratuity =
          Number.GetFloat(data.gratuity) * Number.GetFloat(totalMonths);

        // Other Deductions
        let other_deductions =
          Number.GetFloat(data.other_deductions) * Number.GetFloat(totalMonths);

        // Other Allowances
        let other_allowance =
          Number.GetFloat(data.other_allowance) * Number.GetFloat(totalMonths);

        // Tds
        let tds = Number.GetFloat(data.tds) * Number.GetFloat(totalMonths);

        // Additional Hour Amount
        const additionalHourAmount =
          (Number.GetFloat(totalAdditionalMinutes / 60) / 8) * salaryPerDay;

        // Net Salary
        let netSalaryAmount =
        Number.truncateDecimal(totalWorkedSalary) +
        Number.GetFloat(bonusAmountValue) +
        Number.GetFloat(data.other_allowance) +
        Number.GetFloat(additionalHourAmount) -
        (Number.truncateDecimal(totalLeaveSalary) +
          Number.GetFloat(data.other_deductions) +
          Number.GetFloat(fineAmountValue));

        // Hra
        let hra = netSalaryAmount
          ? Number.GetFloat((netSalaryAmount / 2) * 0.5) *
            Number.GetFloat(totalMonths)
          : null;

        // Basic
        let basic = netSalaryAmount
          ? Number.GetFloat(netSalaryAmount / 2) * Number.GetFloat(totalMonths)
          : null;

        // Standard Allowance
        let standardAllowance = netSalaryAmount
          ? Number.GetFloat(data.standard_allowance) *
            Number.GetFloat(totalMonths)
          : null;

        // Special Allowance
        let specialAllowance = netSalaryAmount
          ? Number.GetFloat(netSalaryAmount - (hra + basic + standardAllowance))
          : null;

        attendanceList.push({
          monthlySalary: monthlySalary,
          user: userDetail && userDetail.id,
          userName:
            userDetail &&
            String.concatName(userDetail.name, userDetail.last_name),
          firstName: userDetail && userDetail.name,
          LastName: userDetail && userDetail.last_name,
          avatarUrl: userDetail && userDetail.media_url,
          additional_hours: additional_hours || "",
          startDate: startDate || "",
          endDate: endDate || "",
          totalWorkingDays: totalWorkingDays,
          workedDays:totalWorkedDays,
          basic: basic,
          pf: pf,
          pt: pt,
          medical_insurance: medical_insurance,
          gratuity: gratuity,
          hra: hra,
          salaryPerDay: salaryPerDay,
          bonus: bonusAmountValue,
          special_allowance: specialAllowance,
          tds: tds,
          other_deductions: other_deductions,
          id: Number.Get(data.id),
          fine: Number.GetFloat(fineAmountValue),
          additionalHourAmount: additionalHourAmount,
          totalMinutes: totalAdditionalMinutes || "",
          other_allowance: other_allowance,
          data: data,
          standardAllowance: standardAllowance,
          net_salary: netSalaryAmount,
          attendanceCount:attendanceCount
        });

        return attendanceList;
      }
    } catch (err) {
      console.log(err);
    }
  };

  static bulkUpdate = async (params) => {
    let { data, companyId, timeZone } = params;
    try {
      let ids = data.selectedIds;
      data.selectedIds;

      if (!(ids && ids.length > 0)) {
        throw {
          message: "Id required",
        };
      }
      let reCalcuatedArray = [];
      for (let i = 0; i < ids.length; i++) {
        let id = ids[i];

        let salaryDetail = await Salary.findOne({
          where: { id: id, company_id: companyId },
        });
        let param = {
          data: salaryDetail,
          companyId: companyId,
          timeZone: timeZone,
        };
        let response = await this.getCalculatedData(param);
        reCalcuatedArray.push(...response);
      }

      let updateCalculatedData = {};

      for (let i = 0; i < reCalcuatedArray.length; i++) {
        let historyMessage = new Array();
        let value = reCalcuatedArray[i];
        let data =
          reCalcuatedArray[i].data && reCalcuatedArray[i].data?.dataValues;
        updateCalculatedData.user_id = value.user ? value.user : "";
        updateCalculatedData.working_days = value.totalWorkingDays;
        updateCalculatedData.attendance = value.attendanceCount;
        updateCalculatedData.worked_days = value.workedDays;
        updateCalculatedData.basic = Number.GetFloat(value.basic);
        updateCalculatedData.hra = Number.GetFloat(value.hra);
        updateCalculatedData.special_allowance = Number.GetFloat(
          value.special_allowance
        );
        updateCalculatedData.net_salary = Number.roundOff(value.net_salary);
        updateCalculatedData.monthly_salary = Number.GetFloat(
          value.monthlySalary
        );

        updateCalculatedData.bonus = Number.GetFloat(value.bonus);
        updateCalculatedData.salary_per_day = Number.GetFloat(
          value.salaryPerDay
        );
        updateCalculatedData.fine = Number.GetFloat(value.fine);
        updateCalculatedData.additional_hours = Number.GetFloat(
          value.totalMinutes
        );
        updateCalculatedData.additional_hours_salary = Number.GetFloat(
          value.additionalHourAmount
        );

        updateCalculatedData.other_allowance = Number.GetFloat(
          value.other_allowance
        );

        if (
          Number.Get(data?.working_days) !==
          Number.Get(updateCalculatedData?.working_days)
        ) {
          historyMessage.push(
            `Working Days changed to ${updateCalculatedData?.working_days}`
          );
        }

        if (
          Number.Get(data?.basic) !== Number.Get(updateCalculatedData?.basic)
        ) {
          historyMessage.push(
            `Basic changed to ${Currency.IndianFormat(
              updateCalculatedData?.basic
            )}`
          );
        }
        if (Number.Get(data?.hra) != Number.Get(updateCalculatedData?.hra)) {
          historyMessage.push(
            `Hra changed to ${Currency.IndianFormat(updateCalculatedData?.hra)}`
          );
        }
        if (
          Number.Get(data?.special_allowance) !==
          Number.Get(updateCalculatedData?.special_allowance)
        ) {
          historyMessage.push(
            `Special Allowance changed to ${Currency.IndianFormat(
              updateCalculatedData?.special_allowance
            )}`
          );
        }
        if (
          Number.Get(data?.net_salary) !==
          Number.Get(updateCalculatedData?.net_salary)
        ) {
          historyMessage.push(
            `Net Salary changed to ${Currency.IndianFormat(
              updateCalculatedData?.net_salary
            )}`
          );
        }
        if (
          Number.Get(data?.monthly_salary) !==
          Number.Get(updateCalculatedData?.monthly_salary)
        ) {
          historyMessage.push(
            `Monthly Salary changed to ${Currency.IndianFormat(
              updateCalculatedData?.monthly_salary
            )}`
          );
        }
        if (
          Number.Get(data?.bonus) !== Number.Get(updateCalculatedData?.bonus)
        ) {
          historyMessage.push(
            `Bonus changed to ${Currency.IndianFormat(
              updateCalculatedData?.bonus
            )}`
          );
        }
        if (
          Number.Get(data?.salary_per_day) !==
          Number.Get(updateCalculatedData?.salary_per_day)
        ) {
          historyMessage.push(
            `Salary per day changed to ${Currency.IndianFormat(
              updateCalculatedData?.salary_per_day
            )}`
          );
        }
        if (Number.Get(data?.fine) != Number.Get(updateCalculatedData?.fine)) {
          historyMessage.push(
            `Fine changed to ${Currency.IndianFormat(
              updateCalculatedData?.fine
            )}`
          );
        }
        if (
          Number.Get(data?.additional_hours) !=
          Number.Get(updateCalculatedData?.additional_hours)
        ) {
          historyMessage.push(
            `Additional Hours changed to ${updateCalculatedData?.additional_hours}`
          );
        }
        if (
          Number.Get(data?.additional_hours_salary) !=
          Number.Get(updateCalculatedData?.additional_hours_salary)
        ) {
          historyMessage.push(
            `Additional Hours Salary changed to ${Currency.IndianFormat(
              updateCalculatedData?.additional_hours_salary
            )}`
          );
        }
        if (
          Number.Get(data?.other_allowance) !=
          Number.Get(updateCalculatedData?.other_allowance)
        ) {
          historyMessage.push(
            `Other Allowance changed to ${Currency.IndianFormat(
              updateCalculatedData?.other_allowance
            )}`
          );
        }

        await Salary.update(updateCalculatedData, {
          where: { id: value.id, company_id: companyId },
        });
        if (historyMessage && historyMessage.length > 0) {
          let message = historyMessage.join();
          history.create(
            `${message}`,
            { user: { id: data?.user_id, company_id: companyId } },
            ObjectName.SALARY,
            data?.id
          );
        }
      }
      return true;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  static async bulkDelete(req, res) {
    try {
      const ids = req?.body?.selectedId;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid IDs provided" });
      }

      const company_id = Request.GetCompanyId(req);

      for (const id of ids) {
        await Salary.destroy({ where: { id: id, company_id: company_id } });

        await history.create("Salary Deleted", req, ObjectName.SALARY, id);
      }

      res.json(200, { message: "Salary Deleted" });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async del(req, res) {
    try {
      const { id } = req.params;

      const company_id = Request.GetCompanyId(req);

      if (!id) {
        return res.json(BAD_REQUEST, { message: "Salary id is required" });
      }
      const salaryDetail = await Salary.findOne({
        where: { id, company_id },
      });
      if (!salaryDetail) {
        return res.json(Response.BAD_REQUEST, { message: "Salary not found" });
      }

      await salaryDetail.destroy();

      res.json(Response.DELETE_SUCCESS, { message: "Salary deleted" });
    } catch (err) {
      console.log(err);
    }
  }

  static create = async (data, companyId) => {
    try {
      const getNextSalaryNumber = async (company_id) => {
        let salary_number;
        //get last Salary
        let lastsalary = await Salary.findOne({
          order: [["createdAt", "DESC"]],
          where: { company_id },
        });

        salary_number = lastsalary && lastsalary.salary_number;
        if (!salary_number) {
          salary_number = 1;
        } else {
          salary_number = salary_number + 1;
        }

        return salary_number;
      };
      const userData = await UserModel.findAll({
        where: { company_id: companyId },
        attributes: ["id", "name", "last_name"],
        order: [["created_at", "ASC"]],
      });

      let SalaryData = new Object();

      let param = {
        data: SalaryData,
        companyId: companyId,
        timeZone: data.timeZone,
      };
      let reCalcuatedArray = [];
      for (let i = 0; i < userData.length; i++) {
        let salaryExist = await Salary.findOne({
          where: {
            user_id: userData[i].id,
            month: data.month,
            year: data.year,
            company_id: companyId,
          },
        });

        if (!salaryExist) {
          SalaryData.user = userData[i].id;

          SalaryData.month = data.month;

          SalaryData.year = data.year;

          let response = await this.getCalculatedData(param);
          if (response) {
            reCalcuatedArray.push(...response);
          }
        }
      }
      let createCalculatedData = {};
      let salaryNumber;
      const status = await StatusService.getFirstStatusDetail(
        ObjectName.SALARY,
        companyId
      );

      for (let i = 0; i < reCalcuatedArray.length; i++) {
        let historyMessage = new Array();

        salaryNumber = await getNextSalaryNumber(companyId);
        createCalculatedData.user_id = reCalcuatedArray[i].user
          ? reCalcuatedArray[i].user
          : "";
        createCalculatedData.working_days =
          reCalcuatedArray[i].totalWorkingDays;
        createCalculatedData.basic = Number.GetFloat(reCalcuatedArray[i].basic);
        createCalculatedData.hra = Number.GetFloat(reCalcuatedArray[i].hra);
        createCalculatedData.attendance = reCalcuatedArray[i].attendanceCount;
        createCalculatedData.worked_days = reCalcuatedArray[i].workedDays;
        createCalculatedData.special_allowance = Number.GetFloat(
          reCalcuatedArray[i].special_allowance
        );
        createCalculatedData.net_salary = Number.roundOff(
          reCalcuatedArray[i].net_salary
        );
        createCalculatedData.monthly_salary = Number.GetFloat(
          reCalcuatedArray[i].monthlySalary
        );
        createCalculatedData.bonus = Number.GetFloat(reCalcuatedArray[i].bonus);
        createCalculatedData.salary_per_day = Number.GetFloat(
          reCalcuatedArray[i].salaryPerDay
        );

        createCalculatedData.fine = Number.GetFloat(reCalcuatedArray[i].fine);
        createCalculatedData.status = status && status?.id;
        createCalculatedData.company_id = companyId;
        createCalculatedData.salary_number = salaryNumber;
        createCalculatedData.additional_hours = Number.GetFloat(
          reCalcuatedArray[i].totalMinutes
        );
        createCalculatedData.additional_hours_salary = Number.GetFloat(
          reCalcuatedArray[i].additionalHourAmount
        );
        createCalculatedData.month = Number.Get(data?.month);
        (createCalculatedData.year = Number.Get(data?.year)),
          (createCalculatedData.other_allowance = Number.Get(
            reCalcuatedArray[i]?.other_allowance
          ));

        let salaryDetail = await Salary.create(createCalculatedData);
        let userDetail = userData.find(
          (value) => value.id == salaryDetail?.user_id
        );
        if (salaryDetail && salaryDetail?.id && userDetail) {
          if (Number.isNotNull(salaryDetail?.user_id)) {
            historyMessage.push(
              `Salary added with user ${String.concatName(
                userDetail?.name,
                userDetail?.last_name
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.salary_number)) {
            historyMessage.push(
              `Salary added with salary number ${salaryDetail?.salary_number}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.month)) {
            historyMessage.push(
              `Salary added with month ${Month.get(salaryDetail?.month)}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.year)) {
            historyMessage.push(
              `Salary added with year ${salaryDetail?.year}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.monthly_salary)) {
            historyMessage.push(
              `Salary added with monthly salary ${Currency.IndianFormat(
                salaryDetail?.monthly_salary
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.working_days)) {
            historyMessage.push(
              `Salary added with working days ${salaryDetail?.working_days}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.basic)) {
            historyMessage.push(
              `Salary added with basic ${Currency.IndianFormat(
                salaryDetail?.basic
              )}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.hra)) {
            historyMessage.push(
              `Salary added with hra ${Currency.IndianFormat(
                salaryDetail?.hra
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.special_allowance)) {
            historyMessage.push(
              `Salary added with special allowance ${Currency.IndianFormat(
                salaryDetail?.special_allowance
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.salary_per_day)) {
            historyMessage.push(
              `Salary added with salary per day ${Currency.IndianFormat(
                salaryDetail?.salary_per_day
              )}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.additional_hours)) {
            historyMessage.push(
              `Salary added with additional hours ${salaryDetail?.additional_hours}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.additional_hours_salary)) {
            historyMessage.push(
              `Salary added with additional hours salary ${Currency.IndianFormat(
                salaryDetail?.additional_hours_salary
              )}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.other_allowance)) {
            historyMessage.push(
              `Salary added with other allowance ${Currency.IndianFormat(
                salaryDetail?.other_allowance
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.bonus)) {
            historyMessage.push(
              `Salary added with bonus ${Currency.IndianFormat(
                salaryDetail?.bonus
              )}\n`
            );
          }

          if (Number.isNotNull(salaryDetail?.fine)) {
            historyMessage.push(
              `Salary added with fine ${Currency.IndianFormat(
                salaryDetail?.fine
              )}\n`
            );
          }
          if (Number.isNotNull(salaryDetail?.status)) {
            historyMessage.push(`Salary added with status ${status?.name}\n`);
          }

          if (Number.isNotNull(salaryDetail?.net_salary)) {
            historyMessage.push(
              `Salary added with net salary ${Currency.IndianFormat(
                salaryDetail?.net_salary
              )}\n`
            );
          }

          if (historyMessage && historyMessage.length > 0) {
            let message = historyMessage.join();
            history.create(
              `${message}`,
              { user: { id: salaryDetail?.user_id, company_id: companyId } },
              ObjectName.SALARY,
              salaryDetail?.id
            );
          }
        }
      }
      return true;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };
  static async projectionReport(params) {
    try {
      let {
        startDate,
        endDate,
        companyId,
        user,
        page,
        pageSize,
        sort,
        sortDir,
        timeZone,
      } = params;

      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
      }

      // Validate if page size is not a number
      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
      }

      let date = DateTime.getCustomDateTime(params?.date, timeZone);

      let where = {};

      if (user) {
        where.user_id = user;
      }

      where.date = {
        [Op.and]: {
          [Op.gte]: params?.date && date ? date?.startDate : startDate,
          [Op.lte]: params?.date && date ? date?.endDate : endDate,
        },
      };

      where.company_id = companyId;

      let attendanceData = await Attendance.findAll({
        where,
        attributes: ["id", "user_id", "additional_hours"],
        include: [
          {
            model: Shift,
            as: "shift",
            attributes: ["name", "id", "start_time", "end_time"],
          },
        ],
      });

      let userIds =
        attendanceData && attendanceData.map((value) => value?.user_id);

      let uniqueUserIds = [...new Set(userIds)];

      let SalaryData = new Object();

      let param = {
        data: SalaryData,
        companyId: companyId,
        timeZone: timeZone,
      };

      let reCalcuatedArray = [];

      if (uniqueUserIds && uniqueUserIds.length > 0) {
        for (let i = 0; i < uniqueUserIds.length; i++) {
          SalaryData.user = uniqueUserIds[i];

          SalaryData.startDate = startDate;

          SalaryData.endDate = endDate;

          let response = await this.getCalculatedData(param);

          reCalcuatedArray.push(...response);
        }
      }
      let sortParam = "";
      if (sort == "additional_hours") {
        sortParam = "totalMinutes";
      } else {
        sortParam = sort;
      }

      let data = ArrayList.sort(reCalcuatedArray, sortParam, sortDir);
      const offset = (page - 1) * pageSize;
      const paginatedResults = data.slice(offset, offset + pageSize);
      return {
        paginatedResults,
        totalCount: data.length,
        page,
        pageSize,
      };
    } catch (err) {
      console.log(err);
    }
  }
}
module.exports = SalaryService;
