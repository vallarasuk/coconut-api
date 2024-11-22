/**
 * Module dependencies
 */
const { Op, Sequelize } = require("sequelize");
const { BAD_REQUEST, OK, CREATE_SUCCESS } = require("../helpers/Response");
const Permission = require("../helpers/Permission");
const Product = require("../helpers/Product");

// Models
const { productIndex } = require("../db").models;

const Category = require("../helpers/Category");

// Models
const { productCategory } = require("../db").models;
const Boolean = require("../lib/Boolean");
const validator = require("../lib/validator");
const ProductIndexService = require("./ProductIndexService");

module.exports = {
  /**
   * Create Product Category
   */
  getProductCategoryId: async (categoryName, companyId) => {
    try {
      if (!categoryName) {
        return null;
      }

      const categoryExist = await productCategory.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')), Sequelize.fn('LOWER', categoryName)
        )
      });

      // Validate category name exist
      if (categoryExist) {
        return categoryExist.id;
      } else {
        const newCategoryData = {
          name: categoryName,
          status: Category.STATUS_ACTIVE,
          company_id: companyId
        };

        // Create new category
        const newCategory = await productCategory.create(newCategoryData);
        return newCategory.id;
      }
    } catch (err) {
      console.log(err);
    }
  },

  async createProduct(req, res, next) {
    const data = req.body;
    const companyId = req.user && req.user.company_id;

    try {
      if (data.productIds == "") {
        return res.json(Response.BAD_REQUEST, { message: 'Product is Required' });
      }
      let ids = [];

      ids = req.body.productIds.split(",");

      for (let index = 0; index < ids.length; index++) {
        const id = ids[index];
        const productDetails = await productIndex.findOne({
          where: { product_id: id, company_id: companyId },
        });
        const newCategoryId = data?.category_id; // Replace with your desired category ID

        if (productDetails) {
          await productDetails.update({ category_id: newCategoryId });
        }
      }



      res.json(CREATE_SUCCESS, { message: "Products added" });
    } catch (err) {
      res.json(BAD_REQUEST, { message: err.message });
    }
  },
  //search product list
  async search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.BRAND_VIEW, req);

    let { page, pageSize, search, sort, sortDir, pagination, categoryName, categoryId } = req.query;


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
      status: "status",
      name: "name"
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
    if (data.categoryId) {
      where.category_id = data.categoryId;
    }

    const order = [];

    if (sort == "name" || sort == "") {
      order.push(["brand_name", sortDirParam], ["product_name", sortDirParam], ["mrp", sortDirParam])
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
        "category_id",
        "status",
        "brand_id"
      ],
      order,
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
          mrp,
          unit,
          sale_price,
          brand_name,
          category_id,
          status,
          brand_id

        } = productList.get();

        data.push({
          id: product_id,
          product_id,
          product_category_id: id,
          product_name,
          size,
          featured_media_url,
          unit,
          brand_name,
          sale_price,
          mrp,
          category_id,
          brand_id,
          status:
            status == Product.STATUS_ACTIVE ? Product.STATUS_ACTIVE_TEXT : status === Product.STATUS_DRAFT ? Product.STATUS_DRAFT_TEXT : Product.STATUS_INACTIVE_TEXT
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
};

