const { Op, Sequelize } = require("sequelize");
const { BAD_REQUEST } = require("../../helpers/Response");
const Request = require("../../lib/request");
const { Salary } = require("../../db").models;
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator");
const Permission = require("../../helpers/Permission");
const Month = require("../../lib/Month");
const statusService = require("../../services/StatusService");
const ObjectName = require("../../helpers/ObjectName");
const Status = require("../../helpers/Status");

async function list(req, res, next) {
  try {
    let { page, pageSize, search, sort, sortDir, pagination, month, year } =
      req.query;

    const salaryManageOthers = await Permission.Has(
      Permission.SALARY_MANAGE_OTHERS,
      req
    );

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

    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      month: "month",
      year: "year",
    };

    const sortParam = (sort || "year").trim();

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      console.log(sortParam);
      return res.json(BAD_REQUEST, {
        message: `Unable to sort salary by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const where = {};
    
    where.company_id = companyId;

    if (!salaryManageOthers) {
      where.user_id = req.user.id;
    }

    if (month) {
      where.month = month;
    }

    if (year) {
      where.year = year;
    }

    let statusDetail = await statusService.getAllStatusByGroupId(
      ObjectName.SALARY,
      null,
      companyId,
      Status.GROUP_CANCELLED
    );

    const statusIds = statusDetail.map((status) => status.id);

    if(statusIds) {
      where.status = statusIds
    }

    let orderArray = [];

    const searchTerm = search ? search.trim() : null;
    if (searchTerm !== null) {
      let monthValue = Month.getValue(searchTerm);
      where.month = monthValue;
    }

    if (sortParam == "month") {
      orderArray.push([sortParam, sortDirParam]);
    } else {
      orderArray.push(["year", "DESC"], ["month", "DESC"]);
    }

   
    const query = {
      group: ["year", "month"],
      attributes: [
        [Sequelize.fn("MAX", Sequelize.col("id")), "id"],
        "year",
        "month",
        [Sequelize.fn("SUM", Sequelize.col("net_salary")), "net_salary"],
      ],
      order: orderArray,
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

    // Get Vendor list and count
    const getSalaryList = await Salary.findAndCountAll(query);

    const salaryData = [];

    getSalaryList.rows.forEach(async (values) => {
      const data = {
        monthName: `${Month.get(values?.month)},${values?.year}`,
        month: values?.month,
        year: values?.year,
        net_salary: values?.net_salary,
      };
      salaryData.push(data);
    });

    return res.json(200, {
      totalCount: getSalaryList.count.length,
      currentPage: page,
      pageSize,
      data: salaryData,
      sort,
      search,
      sortDir,
    });
  } catch (err) {
    console.log(err);
  }
}

module.exports = list;
