// Utils
/**
 * Module dependencies
 */
const { Op } = require("sequelize");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

const DateTime = require("../../lib/dateTime");
const { getBrandImageUrl } = require("../../lib/Url");
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator")
// Models
const { productIndex } = require("../../db").models;
/**
 * Vendor search route
 */
async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.BRAND_VIEW, req);

  
  let { page, pageSize, search, sort, sortDir, pagination } = req.query;

  // Validate if page is not a number
  page = page ? parseInt(page, 10) : 1;
  if (isNaN(page)) {
    return res.json(BAD_REQUEST, { message: "Invalid page" });
  }

  // Validate if page size is not a number
  pageSize = pageSize ? parseInt(pageSize, 10) : 25;
  if (isNaN(pageSize)) {
    return res.json(BAD_REQUEST, { message: "Invalid page size" });
  }

  const companyId = req.user && req.user.company_id;

  if (!companyId) {
    return res.json(400, "Company Not Found");
  }

  // Sortable Fields
  const validOrder = ["ASC", "DESC"];
  const sortableFields = {
    id: "id",
    product_name: "product_name",
    status: "status",
    mrp: "mrp",
    size: "size",
    unit: "unit",
    brand_name: "brand_name",
    sale_price: "sale_price",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };

  const sortParam = sort || "product_name";

  // Validate sortable fields is present in sort param
  if (!Object.keys(sortableFields).includes(sortParam)) {
    return res.json(BAD_REQUEST, {
      message: `Unable to sort vendor by ${sortParam}`,
    });
  }

  const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
  // Validate order is present in sortDir param
  if (!validOrder.includes(sortDirParam)) {
    return res.json(BAD_REQUEST, { message: "Invalid sort order" });
  }

  const data = req.query;

  const where = {};

  where.company_id = companyId;
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
    where.status = status;
  }

  // Search term
  const searchTerm = search ? search.trim() : null;
  if (searchTerm) {
    where[Op.or] = [
      {
        product_name: {
          [Op.iLike]: `%${searchTerm}%`,
        },
      },
    ];
  }
  if (data.brandId) {
    where.brand_id = data.brandId;
  }

  const query = {
    attributes: [
      "id",
      "product_name",
      "featured_media_url",
      "size",
      "mrp",
      "unit",
      "sale_price",
      "brand_name",
      "product_id",
      "brand_id"
    ],
    order: [[sortParam, sortDirParam]],
    where: where,
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
    const brandProductList = await productIndex.findAndCountAll(query);

    const data = [];
    brandProductList.rows.forEach((productList) => {
      const {
        id,
        product_name,
        product_id,
        size,
        featured_media_url,
        status,
        mrp,
        unit,
        sale_price,
        brand_name,
        createdAt,
        updatedAt,
        brand_id
      } = productList.get();

      data.push({
        id,
        product_id,
        product_name,
        size,
        featured_media_url,
        unit,
        brand_name,
        sale_price,
        brand_id,
        mrp,
        status,
        createdAt: DateTime.defaultDateFormat(createdAt),
        updatedAt: DateTime.defaultDateFormat(updatedAt),
      });
    });

    res.json(OK, {
      totalCount: brandProductList.count,
      currentPage: page,
      pageSize,
      data,
      search,
      sort,
      sortDir,
      status: status ? status : "",
    });
  } catch (err) {
    console.log(err);
    res.json(OK, { message: err.message });
  }
}

module.exports = search;
