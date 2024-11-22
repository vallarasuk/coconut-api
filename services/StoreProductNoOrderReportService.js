// Status
const Permission = require('../helpers/Permission');
const { storeProduct, productIndex, Location, orderProduct } = require('../db').models;
const { Op, Sequelize } = require('sequelize');
const ReportType = require('../helpers/StockReport');
const DateTime = require('../lib/dateTime');
const validator = require("../lib/validator");
const Boolean = require('../lib/Boolean');
const { getSettingValue } = require("./SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../helpers/Setting");
const Request = require("../lib/request");
const Number = require("../lib/Number");

const list = async (req, res, next) => {
  try {
    const hasPermission = await Permission.Has(Permission.STORE_PRODUCT_NO_ORDER_REPORT_VIEW, req);

  
    const params = req.query;

    let companyId = req.user && req.user.company_id;

    let timeZone = Request.getTimeZone(req)

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)

    let { page, pageSize, search, sort, sortDir, pagination, product, startDate, endDate, location } = params;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: 'Invalid page' };
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: 'Invalid page size' };
    }

    // Sortable Fields
    const validOrder = ['ASC', 'DESC'];
    const sortableFields = {
      product_name: 'product_name',
      location: 'location',
      quantity: 'quantity',
      max_quantity: 'max_quantity',
      min_quantity: 'min_quantity',
      createdAt: 'createdAt',
      unit_price: 'unit_price',
      last_order_date: 'last_order_date',
      last_stock_entry_date: 'last_stock_entry_date',
      order_quantity: 'order_quantity',
      mrp:"mrp"
    };

    const sortParam = sort || 'product_name';
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort Location by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: 'Invalid sort order' };
    }

    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    let where = {};

    let whereProductIndex = new Object();

    //get product details object
    where.company_id = companyId;

    // Apply filters if there is one
    if (location && parseInt(location)) {
      where.store_id = Number(location);
    }

    where.quantity = { [Op.gt]: 0 };
    where.order_quantity = { [Op.or]: [{ [Op.eq]: 0 }, { [Op.eq]: null }] };

    const storeProductWhere = {};
    storeProductWhere.company_id = companyId;

    const storeProductDetails = await orderProduct.findAll({
      where: storeProductWhere,
    });
    let productIds = [];
    if (storeProductDetails) {
      storeProductDetails.forEach((element) => {
        productIds.push(element.product_id);
      });
    }

    if (startDate && !endDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (startDate && endDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (date && Number.isNotNull(req?.query?.date)) {
      where.last_order_date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (params.brand) {
      whereProductIndex.brand_id = params.brand.split(',');
    }

    if (params.category) {
      whereProductIndex.category_id = params.category.split(',');
    }

    where.product_id = { [Op.notIn]: productIds };

    if (product && parseInt(product)) {
      where.product_id = product;
    }
    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
            "$productIndex.product_display_name$": {
                [Op.iLike]: `%${searchTerm}%`,
            },
        },
        {
            "$location.name$": {
                [Op.iLike]: `%${searchTerm}%`,
            },
        },
    ];
    }

    let order = [];

    if (sort === 'location') {
      order.push([{ model: Location, as: 'location' }, 'name', sortDirParam]);
    }

    if (sort === 'product_name') {
      order.push(
        [{ model: productIndex, as: 'productIndex' }, 'brand_name', sortDirParam],
        [{ model: productIndex, as: 'productIndex' }, 'product_name', sortDirParam],
        [{ model: productIndex, as: 'productIndex' }, 'mrp', sortDirParam]
      );
    }
    if (sort === 'mrp') {
      order.push([
        { model: productIndex, as: 'productIndex' },
        Sequelize.literal('mrp ' + sortDirParam + ' NULLS LAST')
      ]);
    }

    if (sort !== 'product_name' && sort !== 'location' && sort !== "mrp") {
      order.push([sortParam, sortDirParam]);
    }

    const query = {
      include: [
        {
          required: true,
          model: productIndex,
          as: 'productIndex',
          where: whereProductIndex,
        },
        {
          required: true,
          model: Location,
          as: 'location',
        },
      ],
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
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

    let storeProductList = [];

    const orderProductData = await storeProduct.findAndCountAll(query);

    for (let index = 0; index < orderProductData.rows.length; index++) {
      const value = orderProductData.rows[index];

      const { location, productIndex } = { ...value.get() };

      const data = {
        size: productIndex?.size ? productIndex?.size : '',
        brand_name: productIndex?.brand_name ? productIndex?.brand_name : '',
        brand_id: productIndex?.brand_id ? productIndex?.brand_id : '',
        product_name: productIndex?.product_name ? productIndex?.product_name : '',
        image: productIndex?.featured_media_url ? productIndex?.featured_media_url : '',
        id: value?.id,
        unit: value?.unit_price ? value.unit_price : '',
        product_id: value?.product_id,
        location: location?.name ? location?.name : '',
        amount: value?.price ? value.price : '',
        quantity: value?.quantity,
        min_quantity: value?.min_quantity,
        max_quantity: value?.max_quantity,
        last_order_date: value?.last_order_date ? DateTime.Format(value?.last_order_date) : '',
        last_stock_entry_date: value?.last_stock_entry_date ? DateTime.Format(value?.last_stock_entry_date) : '',
        unit_price: productIndex?.sale_price ? productIndex?.sale_price : '',
        price: productIndex?.sale_price * value?.quantity,
        order_quantity: value?.order_quantity ? value?.order_quantity : '',
        mrp: productIndex?.mrp ? productIndex?.mrp : '',
        sale_price: productIndex?.sale_price ? productIndex?.sale_price : '',
        mrp: productIndex?.mrp ? productIndex?.mrp : '',
      };
      storeProductList.push(data);
    }
    //return response
    return res.json(200, {
      totalCount: orderProductData.count,
      currentPage: page,
      pageSize,
      data: storeProductList,
    });
  } catch (err) {
    console.log(err);
  }
};
module.exports = {
  list,
};
