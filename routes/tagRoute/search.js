// Utils
/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require('../../helpers/Response');
const DateTime = require('../../lib/dateTime');

// Models
const { Tag, TagType } = require('../../db').models;

// Sequelize
const { Op } = require('sequelize');

// Lib
const Request = require('../../lib/request');
const Permission = require('../../helpers/Permission');
const TagStatus = require('../../helpers/TagStatus');
const Boolean = require('../../lib/Boolean');
const validator = require("../../lib/validator")


/**
 * tag search route
 */
async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.TAG_VIEW, req);

 
  let { page, pageSize, search, sort, sortDir, pagination, type } = req.query;

  // Validate if page is not a number
  page = page ? parseInt(page, 10) : 1;
  if (isNaN(page)) {
    return res.json(BAD_REQUEST, { message: 'Invalid page' });
  }

  // Validate if page size is not a number
  pageSize = pageSize ? parseInt(pageSize, 10) : 25;
  if (isNaN(pageSize)) {
    return res.json(BAD_REQUEST, { message: 'Invalid page size' });
  }

  const companyId = Request.GetCompanyId(req);

  // Sortable Fields
  const validOrder = ['ASC', 'DESC'];
  const sortableFields = {
    id: 'id',
    name: 'name',
    type: 'type',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    default_amount:"default_amount"
  };

  const sortParam = sort || 'name';

  // Validate sortable fields is present in sort param
  if (!Object.keys(sortableFields).includes(sortParam)) {
    return res.json(BAD_REQUEST, { message: `Unable to sort product by ${sortParam}` });
  }

  const sortDirParam = sortDir ? sortDir.toUpperCase() : 'ASC';
  // Validate order is present in sortDir param
  if (!validOrder.includes(sortDirParam)) {
    return res.json(BAD_REQUEST, { message: 'Invalid sort order' });
  }

  const data = req.query;

  const where = {};

  where.company_id = companyId;
  if (req.query.typeId) {
    where.type = req.query.typeId;
  }
  // Search by name
  const name = data.name;
  if (name) {
    where.name = {
      $like: `%${name}%`,
    };
  }

  // Search by status
  const status = data.status;
  if (status) {
    where.status = status === TagStatus.STATUS_ACTIVE_TEXT ? TagStatus.ACTIVE : TagStatus.INACTIVE;
  }
  if (type) {
    where.type = type;
  }
  // Search term
  const searchTerm = search ? search.trim() : null;
  if (searchTerm) {
    where[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${searchTerm}%`,
        },
      },
    ];
  }

  const query = {
    order: [[sortableFields[sortParam], sortDirParam]],
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

  try {
    // Get tag list and count
    const tagList = await Tag.findAndCountAll(query);

    // Return tag is null
    if (tagList.count === 0) {
      return res.json({});
    }

    const data = [];

    tagList.rows.forEach((productCategory) => {

      const { id, name, status, createdAt, updatedAt, type, default_amount } = productCategory.get();
      data.push({
        id,
        name,
        type: type,
        default_amount: default_amount,
        status: status == TagStatus.ACTIVE ? TagStatus.STATUS_ACTIVE_TEXT : TagStatus.STATUS_INACTIVE_TEXT,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });
    });

    res.json(OK, {
      totalCount: tagList.count,
      currentPage: page,
      pageSize,
      data,
      status,
      search,
      sort,
      sortDir,
    });
  } catch (err) {
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = search;
