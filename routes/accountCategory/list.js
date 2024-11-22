const restify = require("restify");
const errors = require("restify-errors");
const utils = require("../../lib/utils");
const { AccountCategory } = require("../../db").models;
const moment = require("moment");
const { Op } = require("sequelize");

const sortOrders = ["ASC", "DESC"];

const {
  ACTIVE_STATUS,
  IN_ACTIVE_STATUS,
  IN_ACTIVE,
  ACTIVE,
} = require("../../helpers/AccountCategory");

const DateTime = require("../../lib/dateTime");

const dateTime = new DateTime();

function list(req, res, next) {
 

  const data = req.query;
  let page = 1;
  let pageSize = 20;

  for (const key in data) {
    if (key) {
      data[key] = data[key].trim();
    }
  }
  const {
    id,
    idFrom,
    idTo,
    name,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    sortOrder,
  } = data;

  const accountCategorySearch = {};
  if (id) {
    accountCategorySearch.id = { $eq: id };
  }
  if (idFrom) {
    accountCategorySearch.id = { $gte: idFrom };
  }
  if (idTo) {
    accountCategorySearch.id = { $lte: idTo };
  }
  if (idFrom && idTo) {
    accountCategorySearch.id = {
      $gte: `${idFrom}`,
      $lte: `${idTo}`,
    };
  }

  if (name) {
    accountCategorySearch.name = { [Op.like]: `%${name}%` };
  }

  if (createdAtFrom) {
    accountCategorySearch.created_at = {
      $gte: moment(createdAtFrom).startOf("day"),
    };
  }
  if (createdAtTo) {
    accountCategorySearch.created_at = {
      $lte: moment(createdAtTo).endOf("day"),
    };
  }
  if (createdAtFrom && createdAtTo) {
    accountCategorySearch.created_at = {
      $gte: moment(createdAtFrom).startOf("day"),
      $lte: moment(createdAtTo).endOf("day"),
    };
  }

  if (updatedAtFrom) {
    accountCategorySearch.updated_at = {
      $gte: moment(updatedAtFrom).startOf("day"),
    };
  }
  if (updatedAtTo) {
    accountCategorySearch.updated_at = {
      $lte: moment(updatedAtTo).endOf("day"),
    };
  }
  if (updatedAtFrom && updatedAtTo) {
    accountCategorySearch.updated_at = {
      $gte: moment(updatedAtFrom).startOf("day"),
      $lte: moment(updatedAtTo).endOf("day"),
    };
  }

  const query = {
    where: accountCategorySearch,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  const sortableFields = {
    id: "id",
    name: "name",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };

  const sort = data.sort || "name";
  if (sort) {
    if (!Object.keys(sortableFields).includes(sort)) {
      return next(
        new errors.BadRequestError(`Unable to sort account entries by ${sort}`)
      );
    }
    if (sortOrder && !sortOrders.includes(sortOrder.toUpperCase())) {
      return next(new errors.BadRequestError("Invalid sort order"));
    }
    query.order = `${sortableFields[sort]} ${(
      sortOrder || "Asc"
    ).toUpperCase()}`;
  }

  if (data.pagination) {
    page = data.page ? parseInt(data.page, 10) : 1;
    if (isNaN(page)) {
      return next(new errors.BadRequestError("Invalid page"));
    }

    pageSize = data.pageSize ? parseInt(data.pageSize, 10) : 20;
    if (isNaN(pageSize)) {
      return next(new errors.BadRequestError("Invalid page size"));
    }

    query.limit = pageSize;
    query.offset = (page - 1) * pageSize;
  }

  AccountCategory.findAndCountAll(query)
    .then((accountCategories) => {
      const count = accountCategories.count;
      accountCategories = accountCategories.rows;

      if (count > 0) {
        accountCategories = accountCategories.map((accountCategoryDetail) => {
          const accountCategory = accountCategoryDetail.get();

          return {
            id: accountCategory.id,
            name: accountCategory.name,
            createdAt: utils.formatLocalDate(
              accountCategory.created_at,
              dateTime.formats.frontendDateTime12HoursFormat
            ),
            updatedAt: accountCategory.updated_at,
            status:
              accountCategory.status === ACTIVE_STATUS ? ACTIVE : IN_ACTIVE,
          };
        });
      }

      const lastPage = utils.getLastPage(count, pageSize);
      res.json({ count, currentPage: page, lastPage, accountCategories });
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = list;
