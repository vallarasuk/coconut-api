const restify = require("restify");
const utils = require("../../lib/utils");
const { AccountVendor } = require("../../db").models;
const moment = require("moment");
const { Op } = require("sequelize");
const errors = require("restify-errors");

const sortOrders = ["ASC", "DESC"];
const {
  ACTIVE_STATUS,
  IN_ACTIVE_STATUS,
  IN_ACTIVE,
  ACTIVE,
} = require("../../helpers/Account");

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

  const vendorSearch = {};
  if (id) {
    vendorSearch.id = { $eq: id };
  }
  if (idFrom) {
    vendorSearch.id = { $gte: idFrom };
  }
  if (idTo) {
    vendorSearch.id = { $lte: idTo };
  }
  if (idFrom && idTo) {
    vendorSearch.id = {
      $gte: `${idFrom}`,
      $lte: `${idTo}`,
    };
  }

  if (name) {
    vendorSearch.name = { [Op.like]: `%${name}%` };
  }

  if (createdAtFrom) {
    vendorSearch.created_at = { $gte: moment(createdAtFrom).startOf("day") };
  }
  if (createdAtTo) {
    vendorSearch.created_at = { $lte: moment(createdAtTo).endOf("day") };
  }
  if (createdAtFrom && createdAtTo) {
    vendorSearch.created_at = {
      $gte: moment(createdAtFrom).startOf("day"),
      $lte: moment(createdAtTo).endOf("day"),
    };
  }

  if (updatedAtFrom) {
    vendorSearch.updated_at = { $gte: moment(updatedAtFrom).startOf("day") };
  }
  if (updatedAtTo) {
    vendorSearch.updated_at = { $lte: moment(updatedAtTo).endOf("day") };
  }
  if (updatedAtFrom && updatedAtTo) {
    vendorSearch.updated_at = {
      $gte: moment(updatedAtFrom).startOf("day"),
      $lte: moment(updatedAtTo).endOf("day"),
    };
  }

  const query = {
    where: vendorSearch,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  const sortableFields = {
    id: "id",
    name: "name",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };

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

  AccountVendor.findAndCountAll(query)
    .then((vendorDetails) => {
      const count = vendorDetails.count;
      vendorDetails = vendorDetails.rows;

      if (count > 0) {
        vendorDetails = vendorDetails.map((vendorData) => {
          const vendorDetails = vendorData.get();

          return {
            id: vendorDetails.id,
            name: vendorDetails.name,
            email: vendorDetails.email,
            phone: vendorDetails.phone,
            address1: vendorDetails.address1,
            address2: vendorDetails.address2,
            city: vendorDetails.city,
            state: vendorDetails.state,
            country: vendorDetails.country,
            bankName: vendorDetails.bank_name,
            bankAccountNumber: vendorDetails.bank_account_number,
            bankRoutingNumber: vendorDetails.bank_routing_number,
            status: vendorDetails.status === ACTIVE_STATUS ? ACTIVE : IN_ACTIVE,
          };
        });
      }

      const lastPage = utils.getLastPage(count, pageSize);
      res.json({ count, currentPage: page, lastPage, vendorDetails });
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = list;
