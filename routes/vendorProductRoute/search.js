// Utils
const DateTime = require("../../lib/dateTime");
//{ defaultDateFormat, shortDateAndTime, formateDateAndTime }
// Status
const { BAD_REQUEST } = require("../../helpers/Response");

// Lib
const Request = require("../../lib/request");

// Models
const { vendorProduct, productBrand, account, productIndex } = require("../../db").models;

const { Op } = require("sequelize");
const Permission = require("../../helpers/Permission");
const Currency = require("../../lib/currency");
const validator = require("../../lib/validator");
const Boolean = require("../../lib/Boolean");


async function search(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.SUPPLIER_PRODUCT_VIEW, req);

 

    let { page, pageSize, search, sort, sortDir, pagination, vendor_id, product_id, brand, category } = req.query;
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

    const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.send(404, { message: "Company Not Found" });
    }
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      name: "name",
      price:"price",
      vendor_name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      vendor_id: "vendor_id",
      brand_name: "brand_name",
      product_name: "product_name",
      size: "size",
      mrp: "mrp",
    };

    const sortParam = sort || "createdAt";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, {
        message: `Unable to sort account product  by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;

    const where = {};
    const productDetailWhere = {};
    where.company_id = companyId;

    // Search by name
    const name = data.name;
    if (name) {
      where.name = {
        [Op.iLike]: `%${name}%`,
      };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      productDetailWhere[Op.or] = [
        {
          product_display_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }
    if (vendor_id) {
      where.vendor_id = vendor_id;
    }
    if (brand) {
      where.brand_id = brand;
    }
    if (category) {
      where.category_id = category;
    }
    if (product_id) {
      where.product_id = product_id;
    }

    if (product_id) {
      productDetailWhere.product_id = product_id;
    }

    const order = [];

    if (sort == "name") {
      order.push(
        [{ model: productIndex, as: 'productIndex' }, 'brand_name', sortDirParam],
        [{ model: productIndex, as: 'productIndex' }, 'product_name', sortDirParam],
        [{ model: productIndex, as: 'productIndex' }, 'size', sortDirParam],
        [{ model: productIndex, as: 'productIndex' }, 'mrp', sortDirParam]
      );
    }
    if (sort == '') {
      order.push(
        [{ model: productIndex, as: 'productIndex' }, 'brand_name', "ASC"],
        [{ model: productIndex, as: 'productIndex' }, 'product_name', "ASC"],
        [{ model: productIndex, as: 'productIndex' }, 'size', "ASC"],
        [{ model: productIndex, as: 'productIndex' }, 'mrp', "ASC"]
      );
    }

    if (sort == "createdAt") {
      order.push([sortParam, sortDirParam]);
    }

    // Includes
    const include = [
      {
        required: true,
        model: account,
        as: "account",
        attributes: {
          exclude: ["createdAt", "updatedAt", "deletedAt"],
        },
      },
      {
        required: true,
        distinct: true,
        model: productIndex,
        as: "productIndex",
        where: productDetailWhere,
      },
    ];

    const query = {
      distinct: true,
      attributes: { exclude: ["deletedAt"] },
      include,
      order,
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
    // Get Big Basket Product list and count
    vendorProduct.findAndCountAll(query).then((vendorProducts) => {
      // Return big Basket Products is null
      if (vendorProducts.count === 0) {
        return res.json({});
      }

      const data = [];
      const vendorProductDetail = vendorProducts && vendorProducts.rows;
      for (let i = 0; i < vendorProductDetail.length; i++) {
        const { productIndex, account, createdAt, updatedAt, price, id ,vendor_url} = vendorProductDetail[i];
        const values = {
          id: id,
          brand_name: productIndex.brand_name,
          image: productIndex.featured_media_url,
          name: productIndex.product_name,
          sale_price: productIndex.sale_price,
          mrp: productIndex.mrp,
          price: price,
          vendor_id: account?.id,
          product_id: productIndex.product_id,
          pack_size: productIndex.pack_size,
          profit_amount: Currency.Get(productIndex.mrp - price),
          profit_percentage: Currency.CalculateProfitPercentage(price, productIndex.mrp),
          vendor_name: account?.name,
          createdAt: DateTime.defaultDateFormat(createdAt),
          updatedAt: DateTime.defaultDateFormat(updatedAt),
          vendor_url:vendor_url,
          brand_id: productIndex.brand_id,
          cost:price,
        };
        data.push(values);
      }

      res.json({
        totalCount: vendorProducts.count,
        currentPage: page,
        pageSize,
        data,
        sort,
        sortDir,
        search,
      });
    });
  } catch (err) {
    console.log(err);
  }
}

module.exports = search;
