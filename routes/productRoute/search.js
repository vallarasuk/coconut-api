// Utils
const { Op } = require("sequelize");
const { getMediaUrl } = require("../../lib/utils");

// Status
const { BAD_REQUEST } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");

// Lib
const Request = require("../../lib/request");

// Constants

const { productIndex, productTag: productTagModel, ProductPrice,storeProduct } = require("../../db").models;

const Permission = require("../../helpers/Permission");
const Product = require("../../helpers/Product");

const Boolean = require("../../lib/Boolean");
const DataBaseService = require("../../lib/dataBaseService");
const productTagService = new DataBaseService(productTagModel);

const Number = require("../../lib/Number");
const validator = require("../../lib/validator");
const { sequelize } = require("../../db");

const ProductPriceService = require("../../services/ProductPriceService");

async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.PRODUCT_VIEW, req);

  
  try {
    let {
      page,
      pageSize,
      search,
      sort,
      section,
      sortDir,
      pagination,
      category,
      param,
      brand,
      tag,
      excludeIds,
      locationId,
      manufacture,
      allow_online_sale,
      brand_id,
      show_duplicate,
      product,
    } = req.query;

    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: "Invalid page size" });
    }

    let companyId = Request.GetCompanyId(req);
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
      mrp: "mrp",
      profit_amount: "profit_amount",
      tax_percentage: "tax_percentage",
      cost: "cost",
      max_quantity: "max_quantity",
      min_quantity: "min_quantity",
      profit_percentage: "profit_percentage",
      size: "size",
      cgst_percentage: "cgst_percentage",
      sgst_percentage: "sgst_percentage",
      cgst_amount: "cgst_amount",
      sgst_amount: "sgst_amount",
      manufacturer_name: "manufacturer_name",
      id: "id",
      discount_percentage: "discount_percentage",
      margin_percentage: "margin_percentage",
      sku: "sku",
      pack_size: "pack_size",
      shelf_life: "shelf_life",
      rack_number: "rack_number",
      hsn_code: "hsn_code",
      reward: "reward",
      order_quantity: "order_quantity",
    };

    const sortParam = sort || "product_name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, {
        message: `Unable to sort product by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;

    const where = {};
    

    if(Number.isNotNull(product)){

      where.product_id = product
    }

    where.company_id = companyId;

    // Search by name
    const name = data.name;
    if (name) {
      where.product_name = {
        [Op.like]: `%${name}%`,
      };
    }
    if (Number.isNotNull(category)) {
      where.category_id = {
        [Op.in]: category.split(","),
      };
    }

    if (Number.isNotNull(brand) || Number.isNotNull(brand_id)) {

      where.brand_id = {
        [Op.in]: brand ? brand.split(",") : brand_id.split(","),
      };
    }

    if (Number.isNotNull(param)) {
      where.brand_id = param;
    }

    if (Number.isNotNull(manufacture)) {
      where.manufacture_id = manufacture;
    }
    if (Number.isNotNull(allow_online_sale)) {
      where.allow_online_sale = allow_online_sale;
    }

    // Search by status
    const status = data.status;
    if (Number.Get(status)) {
      where.status = status;
    }
    // Search term
    const searchTerm = search ? search.trim() : null;

    let filteredProductIds = await ProductPriceService.getProductIds(searchTerm, companyId);

    if (filteredProductIds && filteredProductIds.length > 0) {
      where.product_id = { [Op.in]: filteredProductIds };
    }

    if (searchTerm && filteredProductIds.length == 0) {
      where[Op.or] = [
        {
          product_display_name: {
            [Op.iLike]: `%${searchTerm.replace(/\s+/g, "%")}%`,
          },
        },
        {
          product_name: {
            [Op.iLike]: `%${searchTerm.replace(/\s+/g, "%")}%`,
          },
        },
      ];
    }

    let orderQuantitySortNullsLast = sortDirParam == "DESC" ? "NULLS LAST" : "NULLS FIRST";

    const order = [];

    if (sortParam == "product_name") {
      order.push(["brand_name", sortDirParam], ["product_name", sortDirParam], ["mrp", sortDirParam]);
    } else if(sortParam == "order_quantity") {
      order.push([sortParam, sortDirParam, orderQuantitySortNullsLast])
    }else{
      order.push([sortParam, sortDirParam]);
    }

    const productIds = [];
    if (Number.isNotNull(tag)) {
      let tagData = await productTagService.find({ where: { tag_id: tag, company_id: companyId } });
      for (let i = 0; i < tagData.length; i++) {
        productIds.push(tagData[i].product_id);
      }
    }
    if (Number.isNotNull(tag)) {
      where.product_id = { [Op.in]: productIds };
    }

    if (locationId) {

      let storeProductData = await storeProduct.findAll({where:{store_id:locationId, company_id:companyId}})
      let productIds = [];
      for (let i = 0; i < storeProductData.length; i++) {
        const data = storeProductData[i];
        productIds.push(parseInt(data.product_id));
      }
      where.product_id = { [Op.notIn]: productIds };
      where.status=Product.STATUS_ACTIVE
    }
    if (excludeIds) {
      let ids = excludeIds.split(",");
      let productIds = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        productIds.push(parseInt(id));
      }
      where.product_id = { [Op.notIn]: productIds };
    }

    const query = {
      distinct: true,
      attributes: { exclude: ["deletedAt"] },
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

    let productData = [];

    if (show_duplicate == "true") {
      const subquery = `(SELECT p1.id 
FROM product_index AS p1
JOIN (
  SELECT product_name, brand_name, size
  FROM product_index
  GROUP BY product_name, brand_name, size
  HAVING COUNT(*) > 1
  OR (product_name IS NULL AND brand_name IS NULL AND size IS NULL)
) AS p2
ON (
  p1.product_name = p2.product_name
  OR (p1.product_name IS NULL AND p2.product_name IS NULL)
)
AND (
  p1.brand_name = p2.brand_name
  OR (p1.brand_name IS NULL AND p2.brand_name IS NULL)
)
AND (
  p1.size = p2.size
  OR (p1.size IS NULL AND p2.size IS NULL)
))`;

      (where.id = {
        [Op.in]: sequelize.literal(subquery),
      }),
        (productData = await productIndex.findAndCountAll(query));
    } else {
      productData = await productIndex.findAndCountAll(query);
    }
    // Return products is null
    if (productData.count === 0) {
      return res.json({});
    }
    const productList = [];
    productData.rows.forEach((productDetails) => {
      const {
        product_id,
        product_name,
        size,
        unit,
        sale_price,
        brand_name,
        category_name,
        brand_id,
        category_id,
        status,
        featured_media_url,
        max_quantity,
        min_quantity,
        quantity,
        mrp,
        cost,
        tax_percentage,
        image,
        product_display_name,
        createdAt,
        updatedAt,
        profit_amount,
        profit_percentage,
        allow_transfer_out_of_stock,
        allow_sell_out_of_stock,
        product_media_id,
        company_id,
        hsn_code,
        pack_size,
        print_name,
        cgst_percentage,
        sgst_percentage,
        igst_percentage,
        product_price_id,
        manufacture,
        manufacture_name,
        cgst_amount,
        sgst_amount,
        discount_percentage,
        margin_percentage,
        sku,
        shelf_life,
        rack_number,
        reward,
        notes,
        order_quantity
      } = productDetails;

      const product = {
        id: product_id,
        name: product_name,
        brand: brand_name,
        brand_id: brand_id,
        category_id: category_id,
        size: size,
        unit: unit,
        cost: cost,
        category: category_name,
        sale_price: Number.GetFloat(sale_price),
        image: featured_media_url,
        mrp: Number.GetFloat(mrp),
        tax_percentage: tax_percentage,
        featured_media_url: image,
        status:
          status == Product.STATUS_ACTIVE
            ? Product.STATUS_ACTIVE_TEXT
            : status === Product.STATUS_DRAFT
            ? Product.STATUS_DRAFT_TEXT
            : Product.STATUS_INACTIVE_TEXT,
        statusValue: status,
        quantity: quantity,
        min_quantity: min_quantity,
        max_quantity: max_quantity,
        product_display_name: product_display_name,
        profit_amount: profit_amount,
        profit_percentage: profit_percentage,
        cgst_percentage: cgst_percentage,
        sgst_percentage: sgst_percentage,
        igst_percentage: igst_percentage,
        allow_transfer_out_of_stock: allow_transfer_out_of_stock,
        allow_sell_out_of_stock: allow_sell_out_of_stock,
        product_media_id: product_media_id,
        company_id: company_id,
        hsn_code: hsn_code,
        pack_size: pack_size,
        sku: sku,
        shelf_life: shelf_life,
        rack_number: rack_number,
        notes: notes,
        reward: reward,
        print_name: print_name,
        product_price_id: product_price_id,
        manufacture: manufacture,
        cgst_amount: cgst_amount,
        sgst_amount: sgst_amount,
        manufacture_name: manufacture_name,
        discount_percentage: discount_percentage,
        margin_percentage: margin_percentage,
        order_quantity: order_quantity,
      };

      product.createdAt = DateTime.defaultDateFormat(createdAt);
      product.updatedAt = DateTime.defaultDateFormat(updatedAt);
      productList.push(product);
    });

    res.json({
      totalCount: productData.count,
      currentPage: page,
      pageSize,
      data: productList ? productList : [],
      sort,
      sortDir,
      search,
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}
module.exports = search;
