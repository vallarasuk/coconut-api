// import service
const { Op } = require("sequelize");
const Permission = require("../../helpers/Permission");
const { defaultDateFormat } = require("../../lib/utils");
const { companyService } = require("../../services/CompanyService");
const DateTime = require("../../lib/dateTime");
const Request = require("../../lib/request");


async function search(req, res, next) {
  try {
    //Permission Check
    const hasPermission = await Permission.Has(Permission.COMPANY_VIEW, req);
    let userDefaultTimeZone = Request.getTimeZone(req);
 
    let { page, pageSize, search, sort, sortDir, pagination, status } =
      req.query;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(400, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(404, { message: "Invalid page size" });
    }

    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      company_name: "company_name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      status: "status",
    };

    const sortParam = sort || "company_name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(400, { message: `Unable to sort tag by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(400, { message: "Invalid sort order" });
    }

    const where = {};
    // // Search by status
    if (status) {
      where.status = status;
    }

    // Search by term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          company_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    const query = {
      order: [[sortParam, sortDirParam]],
      where,
      attributes: { exclude: ["deletedAt"] },
    };

    if (pagination) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }
    let data = [];
    const companyDetail = await companyService.findAndCount(query);
    companyDetail.rows.forEach((value) => {
      data.push({
        id: value.id,
        company_name: value.company_name,
        mobile_number: value.mobile_number1,
        portal_url: value.portal_url,
        template: value.template,
        status: value.status ? value.status : "",
        createdAt: DateTime.getCurrentDateTimeByUserProfileTimezone(value.createdAt, userDefaultTimeZone),
        updatedAt: DateTime.getCurrentDateTimeByUserProfileTimezone(value.updatedAt, userDefaultTimeZone),
      });
    });

    res.send({
      totalCount: companyDetail.count,
      currentPage: page,
      pageSize,
      data,
    });
  } catch (error) {
    next(error);
    console.log(error);
  }
}

module.exports = search;
