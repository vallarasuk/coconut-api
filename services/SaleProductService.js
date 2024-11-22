const Request = require("../lib/request");
const { Op } = require("sequelize");
const {
  BAD_REQUEST,
  OK,
  UPDATE_SUCCESS,
  UNAUTHORIZED,
} = require("../helpers/Response");
const {
  SaleSettlement,
  SaleProduct,
  product,
  storeProduct,
  order,
  orderProduct,
  productIndex,
} = require("../db").models;
const { sequelize } = require("../db");
const Permission = require("../helpers/Permission");

//systemLog
const History = require("../services/HistoryService");
const DateTime = require("../lib/dateTime");
const ObjectName =require("../helpers/ObjectName")

const create = async (req, res) => {
  try {
    //get company Id from request
    let body = req.body;
    //validate sale entry ID exist or not
    if (!body.saleId) {
      res.json(400, {
        message: "saleID Id is required",
      });
    }

    //get quantity from body
    const company_id = Request.GetCompanyId(req);

    let query = {
      order: [["createdAt", "DESC"]],
      where: {
        company_id,
      },
      attributes: ["item"],
    };

    let ProductData = await SaleProduct.findOne(query);

    let ProductNumber;
    let ProductNumberData = ProductData && ProductData.get("item");

    if (!ProductNumberData) {
      ProductNumber = 1;
    } else {
      ProductNumber = ProductNumberData + 1;
    }

    let quantity = body && body.quantity ? body.quantity : null;
    let net_amount = body && body.net_amount ? parseFloat(body.net_amount, 10) : null
    let pack_size = body && body.pack_size ? parseInt(body.pack_size, 10) : 1
    let unit_price = body && body.unitPrice ? parseFloat(body.unitPrice, 10) : net_amount / (quantity * pack_size);


    const companyId = Request.GetCompanyId(req);
    const productId = body.productId;

    const getProductDetails = await productIndex.findAll({
      where: { company_id: companyId, product_id: productId },
    });
    let SaleProductCreateData = {
      company_id: companyId,
      sale_id: body.saleId,
      product_id: body.productId,
      quantity: quantity,
      item: ProductNumber,
      cost_price: getProductDetails.cost,
      unit_price: unit_price,
      mrp: getProductDetails.mrp,
      tax: getProductDetails.tax,
      price: body.net_amount,
      amount:body.amount,
      profit:
        (Number(getProductDetails.sale_price) -
          Number(getProductDetails.cost)) *
        Number(quantity),
    };

    //create sale entry
    let SaleProductDetails = await SaleProduct.create(SaleProductCreateData);

    //return response
    res.json(200, {
      message: "Sale Product Added",
      SaleProductDetails: SaleProductDetails,
    });
    res.on("finish", async () => {
      History.create(`Sale Product Added`);
    });
  } catch (err) {
    console.log(err);
      return res.json(400, {
      message: err.message,
    });
  }
};


const search = async (req, res) => {
  try {
    //get req params
    let params = req.query;

    //destructure the params
    let { page, pageSize, search, sort, sortDir, pagination, saleId } = params;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);
   
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw {
        message: "Invalid page",
      };
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw {
        message: "Invalid page size",
      };
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      product_id: "product_id",
      product_name: "product_name",
      quantity: "quantity",
      price: "price",
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
      return res.json(BAD_REQUEST, {
        message: "Invalid sort order",
      });
    }

    //cretae where object
    let where = new Object();

    //get product details object
    let productDetailWhere = new Object();

    if (saleId) {
      where.sale_id = saleId;
    }

    //append the company id
    where.company_id = companyId;

    // Search term
    const searchTerm = search ? search.trim() : null;

    //validate search term
    if (searchTerm) {
      productDetailWhere[Op.or] = [
        {
          product_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          brand_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    const include = [
      {
        required: true,
        model: productIndex,
        as: "productIndex",
        where: productDetailWhere,
      },
    ];

    //create query object
    const query = {
      attributes: { exclude: ["deletedAt"] },
      // order: [["createdAt", "DESC"]],
      order:
        [sortParam !== ("product_name") ? [[sortableFields[sortParam], sortDirParam]] : [
          { model: productIndex, as: 'productIndex' }, 'product_name', sortDirParam]
        ],
      include,
      where,
    };

    if (pagination) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }



    // Get Store list and count
    const saleProductList = await SaleProduct.findAndCountAll(query);
    //create saleProduct array
    let productData = [];


    //loop the saleProductList
    saleProductList.rows.forEach((saleProducts) => {
      const {
        id,
        quantity,
        unit_price,
        productIndex,
        createdAt,
        updatedAt,
        discount_percentage,
        pack_size,
        purchase_id,
        product_id,
        discount_amount,
        tax_percentage,
        tax_amount,
        net_amount,
        sale_id,
        item,
        amount
      } = saleProducts;

      const product_index = { ...productIndex.get() };
      const dateTime = new DateTime();


      const data = {
        id,
        unit_price: unit_price,
        product_name: product_index.product_name,
        quantity: quantity,
        image: product_index.featured_media_url,
        purchase_id: purchase_id,
        product_id: product_id,
        sale_id:sale_id,
        discount_percentage: discount_percentage,
        pack_size: pack_size,
        discount_amount: discount_amount,
        tax_percentage: tax_percentage,
        tax_amount: tax_amount,
        net_amount: net_amount,
        price: parseFloat(unit_price) * parseInt(quantity, 10),
        size: product_index.size,
        brand_name: product_index.brand_name,
        sale_price: product_index.sale_price,
        mrp: product_index.mrp,
        unit: product_index.unit,
        item:item,
        amount:amount
      };
      // Formate Object Property
      data.createdAt = createdAt, dateTime.formats.shortMonthDateAndTime
      data.updatedAt = updatedAt, dateTime.formats.shortMonthDateAndTime

      productData.push(data);
    });
    //return response
    return res.json(200, {
      totalCount: saleProductList.count,
      currentPage: page,
      pageSize,
      data: productData,
      sort,
      sortDir,
    });
  } catch (err) {
    console.log(err);
    return res.json(400, {
      message: err.message,
    });
  }
};

const del = async (req, res) => {
  try {
    //get sale product entry Id
    const { id } = req.params;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    //validate sale product entry Id exist or not
    if (!id) {
      return res.json(400, { message: "Sale Product Id is required" });
    }

    //validate sale product exist or not
    let isSaleProductExist = await SaleProduct.findOne({
      where: { company_id: companyId, id: id },
    });

    //validate sale product exist or not
    if (!isSaleProductExist) {
      return res.json(400, { message: "Sale Product Not Found" });
    }

    //delete the sale product
    await SaleProduct.destroy({ where: { company_id: companyId, id: id } });

    res.json(200, { message: "Sale Product  Deleted" });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const updateStatus = async (req, res, next) => {
  const hasPermission = await Permission.Has(
    Permission.SALE_SETTLEMENT_STATUS_UPDATE,
    req
  );


  const data = req.body;
  const { id } = req.params;

  try {
    const save = await service.updateSaleStatus(id, data, req);

    //create a log
    res.on('finish', async () => {
      //create system log for sale updation
      History.create(`Sale updated`, req,ObjectName.SALE_SETTLEMENT_PRODUCT,id);

    });
    // API response
    res.json(UPDATE_SUCCESS, {
      message: "Sale updated",
      data: save,
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};
module.exports = {
  create,
  search,
  del,
  updateStatus,
};
