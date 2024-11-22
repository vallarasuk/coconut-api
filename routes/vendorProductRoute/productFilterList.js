
// Utils
const { Op } = require("sequelize");
const { getMediaUrl } = require("../../lib/utils");

// Status
const Boolean = require("../../lib/Boolean");
const DateTime = require("../../lib/dateTime");

// Lib
const Request = require("../../lib/request");

// Models
const {
  vendorProduct,
  productCategory,
  productBrand,
  supplierProductMedia,
  productIndex,
  
} = require("../../db").models;

// Models
const DataBaseService = require("../../lib/dataBaseService");

const vendorProductService = new DataBaseService(vendorProduct);
const productIndexService = new DataBaseService(productIndex);

const validator = require("../../lib/validator")


const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");

async function productFilterList(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_VIEW, req);


  try {
    let { page, pageSize, search, sort, sortDir, pagination, category, brand, id } = req.query;
    if (sort == 'name') {
      sort = 'product_name';
    }
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(Response.BAD_REQUEST, { message: 'Product id is required' });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }

    let companyId = Request.GetCompanyId(req);

    let vendorProductIds;

    const vendorProductDetails = await vendorProductService.find({ where: { company_id: companyId, vendor_id: id } });

    if (vendorProductDetails && vendorProductDetails.length > 0) {
      vendorProductIds = vendorProductDetails.map((vendorProduct) => {
        return vendorProduct.product_id
      })
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      product_id: "product_id",
      product_name: "product_name",
      brand_name: "brand_name",
      sale_price: "sale_price",
      status: "status",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      category_name: "category_name",
      brand_name: "brand_name",
      mrp: "mrp",
      max_quantity: "max_quantity",
      min_quantity: "min_quantity",
    };

    const sortParam = sort || "product_name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(Response.BAD_REQUEST, {
        message: `Unable to sort product by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;

    const where = {};
    if (category) {
      where.category_id = category;
    }
    if (brand) {
      where.brand_id = brand;
    }
    where.company_id = companyId;

    if (vendorProductIds && vendorProductIds.length > 0) {
      where.product_id = { [Op.notIn]: vendorProductIds }
    }
    // Search by name
    const name = data.name;
    if (name) {
      where.product_name = {
        [Op.like]: `%${name}%`,
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
        {
          brand_name: {

            [Op.iLike]: `%${searchTerm}%`
          }
        }
      ];
    }
    const query = {
      distinct: true,
      order: [
        [sortableFields[sortParam], sortDirParam],
      ],
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
    await productIndexService.findAndCount(query).then((products) => {

      // Return products is null
      if (products.count === 0) {
        return res.json({});
      }
      const data = [];
      products.rows.forEach((productDetails) => {
        const {
          product_id,
          product_name,
          size,
          unit,
          sale_price,
          brand_name,
          category_name,
          status,
          featured_media_url,
          max_quantity,
          min_quantity,
          quantity,
          mrp,
          product_display_name,
          createdAt,
          updatedAt,
        } = productDetails;
        const product = {
          id: product_id,
          name: product_name,
          brand: brand_name,
          size: size,
          unit: unit,
          category: category_name,
          brand: brand_name,
          sale_price: sale_price,
          image: featured_media_url,
          mrp: mrp,
          status: status,
          quantity: quantity,
          min_quantity: min_quantity,
          max_quantity: max_quantity,
          product_display_name: product_display_name,
        };
        product.createdAt = DateTime.defaultDateFormat(createdAt);
        product.updatedAt = DateTime.defaultDateFormat(updatedAt);
        data.push(product);
      });
      res.json({
        totalCount: products.count,
        currentPage: page,
        pageSize,
        data: data ? data : [],
        sort,
        sortDir,
        search,
      });
    });
  } catch (err) {
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
}
module.exports = productFilterList;
