const {
  orderProduct: orderProductModal,
  productIndex,
  order,
  Location,
  status: statusModel,
  storeProduct,
  ProductPrice,
  product
} = require('../db').models;

const DateTime = require('../lib/dateTime');


const { Op, Sequelize, QueryTypes } = require('sequelize');
const StoreProductService = require('../service/storeProductService');
const DataBaseService = require('../lib/dataBaseService');
const Boolean = require('../lib/Boolean');
const orderProduct = new DataBaseService(orderProductModal);
const statusModal = new DataBaseService(statusModel);
const ObjectName = require('../helpers/ObjectName');
const Numbers = require('../lib/Number');
const Status = require('../helpers/Status');


const { CREATE_SUCCESS, OK, UPDATE_SUCCESS, BAD_REQUEST } = require('../helpers/Response');

// Lib
const Request = require('../lib/request');


const ProductPriceService = require('./ProductPriceService');

const Order = require('../helpers/Order');

const statusService = require('./StatusService');
const History = require('./HistoryService');
const validator = require('.././lib/validator');
const db = require('../db');
const Permission = require('../helpers/Permission');
const ProductService = require("./services/ProductService");

const Currency = require("../lib/currency");

/**
 * Create order products
 *
 * @param data
 */
const createOrderProduct = async (data) => {
  if (!data) {
    throw { message: 'Order product details required' };
  }

  const createData = {
    store_product_id: data.storeProductId,
    order_id: data.orderId,
    name: data.name,
    quantity: data.quantity,
    sku: data.sku,
    vendor: data.vendor,
    fulfillment_service: data.fulfillmentService,
    requires_shipping: data.requiresShipping,
    taxable: data.taxable,
    grams: data.grams,
    price: data.price,
    total_discount: data.totalDiscount,
    fulfillment_status: data.fulfillmentStatus,
  };

  await orderProduct.create(createData);
};

const calculateProfitAmount = (costPrice, salePrice, quantity) => {
  try {
    if (costPrice && salePrice) {
      let netProfitAmont;

      let profitAmount = Numbers.Subtraction(salePrice, costPrice);

      if (profitAmount) {
        netProfitAmont = quantity ? Numbers.Multiply(profitAmount, quantity) : profitAmount;
      }

      return netProfitAmont;
    }
    return null;
  } catch (err) {
    console.log(err);
  }
};

const create = async (body, req, res) => {
  try {
    //destrcture from the product
    const { orderId, productId, productIds, companyId, quantity, selectedProducts,sale_price, cost_price, mrp, manual_price } = body;
    //get storeId
    const orderDetail = await order.findOne({ where: { company_id: companyId, id: orderId },attributes:["id","store_id","date","order_number"] });

    //validate order details exist or not
    if (!orderDetail) {
      return res.json(400, {
        message: 'Order Not Found',
      });
    }

    const { store_id } = orderDetail;
    let statusDetail = await statusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);
    const excludeCancelledStatusIdsArray = statusDetail && statusDetail.length >0 && statusDetail.map(status => status.id);

    //check teh product Ids
    if (productId) {
     

      //ge the product details
      const productDetail = await productIndex.findOne({ where: { company_id: companyId, product_id: productId }, attributes:["cgst_percentage","sgst_percentage","reward","product_id","product_name"] });

      //validate order details exist or not
      if (!productDetail) {
        return res.json(400, {
          message: 'Product Not Found',
        });
      }

      const { cgst_percentage, sgst_percentage, reward } = productDetail;


      if (!sale_price) {
        return res.json(400, {
          message: 'Add sale price for this product',
        });
      }


      //valdiate order product exist or not
      let isOrderProductExist = await orderProduct.findOne({
        where: { company_id: companyId, product_id: productId, order_id: orderId, unit_price: sale_price },
      });

      let statusId = await statusService.getFirstStatus(ObjectName.ORDER_PRODUCT, companyId);

      let orderProductPrice = manual_price ? manual_price:sale_price
      //validate order product exist or not
      if (!isOrderProductExist) {
        //create data
        const createData = {
          product_id: productId,
          store_id: Numbers.Get(store_id),
          order_id: orderId,
          quantity: quantity ? quantity : 1,
          unit_price: Numbers.GetFloat(sale_price),
          order_date: orderDetail?.date,
          price: quantity ? Numbers.Multiply(orderProductPrice, quantity) : orderProductPrice,
          company_id: companyId,
          status: statusId,
          cost_price: Numbers.GetFloat(cost_price),
          profit_amount: calculateProfitAmount(cost_price, sale_price, quantity ? quantity : 1),
          mrp: Numbers.GetFloat(mrp),
          cgst_percentage: Numbers.GetFloat(cgst_percentage),
          cgst_amount: Numbers.getPercentageValue(sale_price, cgst_percentage),
          sgst_percentage: Numbers.GetFloat(sgst_percentage),
          sgst_amount: Numbers.getPercentageValue(sale_price, sgst_percentage),
          order_number: orderDetail?.order_number,
          reward: reward ? reward : null
        };

        createData.taxable_amount = Numbers.GetFloat(sale_price) - (Numbers.GetFloat(createData.sgst_amount) + Numbers.GetFloat(createData.sgst_amount))
        // create order product
        let orderProductDetail = await orderProduct.create(createData);
        if(orderProductDetail && orderProductDetail?.id){
          let productData = await product.findOne({where:{id:productId,company_id:companyId}})

          let updateQty = Numbers.Get(productData?.min_quantity)- Numbers.Get(orderProductDetail?.quantity)

         await product.update({min_quantity:updateQty},{where:{id:productId,company_id:companyId}})

         await productIndex.update({min_quantity:updateQty},{where:{product_id:productId,company_id:companyId}})

        }
        res.json(CREATE_SUCCESS, {
          message: 'Order Product Added',
          orderProductId: orderProductDetail ? orderProductDetail.id : "",
          statusId: statusId
        });

        res.on("finish", async ()=> {
          if (orderProductDetail) {

            updateOrderQuantity(orderDetail.id, companyId);

            History.create(
              `Product #${productDetail?.product_id} with ${quantity ? quantity : 1} quantity added`,
              req,
              ObjectName.ORDER,
              orderId
            );
          }
        })
      }
    } else if (productIds) {
      //get the product Ids
      let productIdsList = productIds.split(',');

      //validate product Ids
      if (productIdsList && productIdsList.length > 0) {
        //loop the productIds
        productIdsList.forEach(async (productId) => {
          //ge the product details
          const productDetail = await productIndex.findOne({ where: { company_id: companyId, product_id: productId } });

          //validate product details
          if (productDetail) {
            //get the product details
            const { sale_price, cost, cgst_percentage, sgst_percentage, mrp } = productDetail;

            //create object
            const createData = {
              product_id: productId,
              store_id: Numbers.Get(store_id),
              order_id: Numbers.Get(orderId),
              quantity: 1,
              unit_price: Numbers.GetFloat(sale_price),
              order_date: orderDetail?.date,
              price: Numbers.GetFloat(sale_price),
              company_id: companyId,
              status: await statusService.getFirstStatus(ObjectName.ORDER_PRODUCT, companyId),
              cost_price: Numbers.GetFloat(cost),
              profit_amount: calculateProfitAmount(cost, sale_price),
              mrp: Numbers.GetFloat(mrp),
              cgst_percentage: Numbers.GetFloat(cgst_percentage),
              cgst_amount: Numbers.getPercentageValue(sale_price, cgst_percentage),
              sgst_percentage: Numbers.GetFloat(sgst_percentage),
              sgst_amount: Numbers.getPercentageValue(sale_price, sgst_percentage),
              order_number: orderDetail?.order_number,

            };
            createData.taxable_amount = Numbers.GetFloat(sale_price) - (Numbers.GetFloat(createData.sgst_amount) + Numbers.GetFloat(createData.sgst_amount))

            //create the order product
            const detail = await orderProduct.create(createData);
            if(detail && detail?.id){
              let productData = await product.findOne({where:{id:productId,company_id:companyId}})

              let updateQty = Numbers.Get(productData?.min_quantity)- Numbers.Get(detail?.quantity)

             await product.update({min_quantity:updateQty},{where:{id:productId,company_id:companyId}})

             await productIndex.update({min_quantity:updateQty},{where:{product_id:productId,company_id:companyId}})
            }

            let totalAmount = await orderProductModal.sum('price', {
              where: { order_id: Numbers.Get(orderId), company_id: companyId, status:{ [Op.notIn]: excludeCancelledStatusIdsArray} },
            });

            const updateData = {
              total_amount: totalAmount,
            };
            await order.update(updateData, {
              where: {
                id: orderId,
                company_id: companyId,
              },
            });

            if (detail) {
              History.create("Order Product Added", req, ObjectName.ORDER, orderId);
            }
          }
        });
      }

      res.json(CREATE_SUCCESS, {
        message: 'Order Product Added',
      });
    }

  } catch (err) {
    console.log(err);
  }
};

const update = async (id, data, companyId, res, req) => {
  try {
    //get storeId
    const orderDetail = await order.findOne({ where: { company_id: companyId, id: data.orderId } });

    //validate order details exist or not
    if (!orderDetail) {
      return res.json(400, {
        message: 'Order Not Found',
      });
    }

    const orderProductDetails = await orderProduct.findOne({
      where: { company_id: companyId, id: data.orderProductId },
    });

    if (!orderProductDetails) {
      return res.json(400, {
        message: 'Order Product Not Found',
      });
    }

    const orderProductUpdateData = new Object();

    const { product_id, store_id, quantity, unit_price, cost_price } = orderProductDetails;

    const getProductDetail = await ProductService.getProductDetailsById(data.product_id, companyId);


    let historyMessage = []
    if (data.quantity || data.quantity == "") {
      orderProductUpdateData.quantity = data.quantity ? data.quantity : null;
    
      orderProductUpdateData.reward = Numbers.Multiply(getProductDetail?.reward, data.quantity)
      historyMessage.push(
        `Product #${product_id} quantity changed to ${data?.quantity} quantity\n`);
    }

    if (unit_price && data.quantity) {
      orderProductUpdateData.price = Numbers.Multiply(unit_price, data.quantity);
      orderProductUpdateData.profit_amount = calculateProfitAmount(cost_price, unit_price, data.quantity);
      historyMessage.push(
        `Product #${product_id} price changed to ${Currency.GetFormattedCurrency(orderProductUpdateData?.price)}\n`);
    }

    if (data.mediaId) {
      orderProductUpdateData.media_id = data.mediaId;
    }
    if(data && Numbers.isNotNull(data?.manual_price)){
      orderProductUpdateData.manual_price = data.manual_price;
      historyMessage.push(`Manual #${product_id} price changed to ${data?.manual_price}\n`);
    }
    if (Numbers.isNotNull(data.status)) {
      orderProductUpdateData.status = data.status;
      const orderStatus = await statusService.getData(data.status, companyId);
      historyMessage.push(`Product #${product_id} Status changed to ${orderStatus?.name}\n`);

    }
    let productDetail = await orderProduct.update(orderProductUpdateData, {
      where: { id: id, company_id: companyId },
      returning: true,
      plain: true,
    });

    if (productDetail && productDetail.length > 0) {
        let productData = await product.findOne({where:{id:product_id,company_id:companyId}})

        let updateQty = Numbers.Get(productData?.min_quantity)- (Numbers.Get(data?.quantity)- orderProductDetails?.quantity )

       await product.update({min_quantity:updateQty},{where:{id:product_id,company_id:companyId}})

       await productIndex.update({min_quantity:updateQty},{where:{product_id:product_id,company_id:companyId}})

      await updateOrderQuantity(data.orderId, companyId);
    }

    // Create Order product
    res.json(UPDATE_SUCCESS, {
      message: 'Order Product Updated',
    });
    res.on("finish", async () => {
      if (historyMessage.length > 1) {
      let message = historyMessage.join();
      History.create(message, req, ObjectName.ORDER, data.orderId);
      }
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};

/**
 * Search order
 *
 * @param {*} params
 */
const search = async (req, res, next) => {
  try {
    const companyId = Request.GetCompanyId(req);
    let permission = Request.getRolePermission(req)
    const hasPermission = await Permission.GetValueByName(Permission.ORDER_PRODUCT_EDIT, permission);

    console.debug("hasPermission--------------->>>", hasPermission)

    const params = req.query;

    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      location,
      startDate,
      endDate,
      productId,
      orderId,
      category,
      brand,
      status,
      product,
      startTime,
      endTime,
      type,
      excludeCancelledStatus,
      showTotal,
      showTotalAmount
    } = params;
    let timeZone = Request.getTimeZone(req);

    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    let startTimeValue = DateTime.getGmtHoursAndMinutes(startTime);
    let endTimeValue = DateTime.getGmtHoursAndMinutes(endTime);

    let date = DateTime.getCustomDateTime(req.query?.date, timeZone);

    let productDetailWhere = new Object();
    let whereClause = '';

    let where = new Object();

    let orderArray = new Array();

    const orderProductData = new Array();

    let filterProductId = new Array();

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
      store_product_id: 'store_product_id',
      name: 'name',
      quantity: 'quantity',
      vendor: 'vendor',
      product_name: 'product_name',
      fulfillment_service: 'fulfillment_service',
      requires_shipping: 'requires_shipping',
      taxable: 'taxable',
      grams: 'grams',
      price: 'price',
      unit_price: 'unit_price',
      amount: 'amount',
      cost_price: 'cost_price',
      profit_amount: 'profir_amount',
      total_discount: 'total_discount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      product_display_name: 'product_display_name',
      location: 'location',
      order_id: 'order_id',
      order_date: 'order_date',
      id: "id",
    };

    const sortParam = sort ? sort : 'createdAt';
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort product by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: 'Invalid sort order' };
    }

    let orderWhere = {}
    if (type == Order.TYPE_DELIVERY) {

      orderWhere.type = Order.TYPE_DELIVERY
      orderWhere.company_id = companyId

    }

    let statusDetail = await statusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, null, companyId, Status.GROUP_CANCELLED);
    let cancelledStatusIds = statusDetail && statusDetail.length > 0 && statusDetail.map(status => status?.id);
    if (excludeCancelledStatus) {
      if (cancelledStatusIds && cancelledStatusIds.length > 0) {
        where.status = {
          [Op.in]: cancelledStatusIds
        };
      }
    }
    //append the company Id
    where.company_id = companyId;

    // Filter by order_id
    if (orderId) {
      where.order_id = orderId;
    }

    if (location) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.store_id= ${location} `;
      where.store_id = location;
    }

    if (status) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product.status= ${status} `;
      where.status = status;
    }
    if (product) {
      where.product_id = product
    }

    if (category) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.category_id = ${category} `;
      productDetailWhere.category_id = category;
    }

    if (brand) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.brand_id =${brand} `;
      productDetailWhere.brand_id = brand;
    }

    if (productId) {
      where.product_id = productId;
    }


    if (date && Numbers.isNotNull(req?.query?.date)) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${DateTime.toGMT(date?.startDate, timeZone)}' AND '${DateTime.toGMT(date?.endDate, timeZone)}' `;

      where.order_date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (startDate && !endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" > '${DateTime.toGMT(start_date, timeZone)}' `;

      where.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
        },
      };

      if (startTime) {
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])} `;
        where.createdAt = {
          [Op.and]: {
            [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),
          },
        }
      }
      if (endTime) {
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])} `;
        where.createdAt = {
          [Op.and]: {
            [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
          },
        }
      }
    }
    // endDate and endTime
    if (endDate && !startDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" < '${DateTime.toGMT(end_date, timeZone)}' `;
      if (startTime) {
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."order_date"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])} `;
        where.createdAt = {
          [Op.and]: {
            [Op.gte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}`),
          },
        }
      }
      if (endTime) {
        whereClause += ` AND (EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])} `;
        where.createdAt = {
          [Op.and]: {
            [Op.lte]: Sequelize.literal(`(EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 + EXTRACT(MINUTE FROM "order_product"."createdAt"::time)) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}`),
          },
        }
      }
      where.order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    //startDate endDate and startTime endTime
    if (startDate && endDate) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${DateTime.toGMT(start_date, timeZone)}' AND '${DateTime.toGMT(end_date, timeZone)}' `;
      if (startTime && endTime) {
        whereClause += `
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}
          AND (
            EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
            EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
          ) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}
        `;

        where.createdAt = {
          [Op.and]: [
            Sequelize.literal(`
              (
                EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
                EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
              ) > ${parseInt(startTimeValue.split(':')[0]) * 60 + parseInt(startTimeValue.split(':')[1])}
              AND
              (
                EXTRACT(HOUR FROM "order_product"."createdAt"::time) * 60 +
                EXTRACT(MINUTE FROM "order_product"."createdAt"::time)
              ) < ${parseInt(endTimeValue.split(':')[0]) * 60 + parseInt(endTimeValue.split(':')[1])}
            `),
          ],
        }
      }

      where.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    if (!startDate && !endDate && startTime && !endTime) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."createdAt" > '${startTime}' `;
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: startTime,
        },
      };
    }
    //endTime
    if (!startDate && !endDate && !startTime && endTime) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."createdAt" < '${endTime}' `;
      where.createdAt = {
        [Op.and]: {
          [Op.lte]: endTime,
        },
      };
    }
    //startTime and endTime
    if (!startDate && !endDate && startTime && endTime) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` order_product."order_date" BETWEEN '${startTime}' AND '${endTime}' `;
      where.createdAt = {
        [Op.and]: {
          [Op.gte]: startTime,
          [Op.lte]: endTime,
        },
      };
    }


    // Search term
    const searchTerm = search ? search.trim() : null;

    let filteredProductIds = await ProductPriceService.getProductIds(searchTerm, companyId)
    if (filteredProductIds && filteredProductIds.length > 0) {
      productDetailWhere.product_id = filteredProductIds
    }

    if (searchTerm && filteredProductIds.length == 0) {
      if (searchTerm && isNaN(Number(searchTerm))) {
        where[Op.or] = [
          {
            "$productIndex.product_display_name$": {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
      if (typeof Number(searchTerm) == "number" && !isNaN(Number(searchTerm))) {
        where[Op.or] = [
          {
            order_number: {
              [Op.eq]: searchTerm,
            },
          },
        ];
      }
      if (typeof Number(searchTerm) == "number" && isNaN(Number(searchTerm))) {
        where[Op.or] = [
          {
            order_number: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
    }


    if (search) {
      if (whereClause) {
        whereClause += ' AND ';
      }
      whereClause += ` product_index.product_display_name ILIKE '%${searchTerm}%' `;
    }

    if (orderId) {
      if (whereClause) {
        whereClause += ' AND ';
      }

      whereClause += `order_product.order_id=${orderId} `;
    }

    if (sort === '') {
      orderArray.push([sortParam, 'DESC']);
    }
    if (sort && sort !== '' && sort !== 'product_display_name' && sort !== 'location') {
      orderArray.push([sortParam, sortDirParam]);
    }
    if (sort === 'product_display_name') {
      orderArray.push([{ model: productIndex, as: 'productIndex' }, 'product_display_name', sortDir]);
    }
    if (sort === 'location') {
      orderArray.push([{ model: Location, as: 'locationDetails' }, 'name', sortDir]);
    }




    const query = {
      distinct: true,
      attributes: {},
      order: orderArray,
      include: [
        {
          required: true,
          model: productIndex,
          as: 'productIndex',
          where: productDetailWhere,
        },
        {
          required: true,
          model: order,
          as: 'orderDetail',
          where: orderWhere,
        },
        {
          required: false,
          model: Location,
          as: 'locationDetails',
        },
        {
          required: false,
          model: statusModel,
          as: 'statusDetail',
        },
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

    let totalAmount = 0
    if (showTotal || showTotalAmount) {
      let param = {
        company_id: companyId,
        product_id: productId,
        searchTerm: searchTerm,
        location: Numbers.isNotNull(location) ? location : null,
        status: (cancelledStatusIds && cancelledStatusIds.length > 0) ? cancelledStatusIds : [],
        startDate: Numbers.isNotNull(startDate) ? DateTime.toGMT(start_date, timeZone) : null,
        endDate: Numbers.isNotNull(endDate) ? DateTime.toGMT(end_date, timeZone) : null,
        orderId: Numbers.isNotNull(orderId) ? orderId : null
      }

      totalAmount = await getTotalAmountByProductId(param);
    }
    // Get order product and count
    const orderProducts = await orderProduct.findAndCount(query);

    let totalQty = 0
    if (showTotal) {
      const Totalquery = {
        distinct: true,
        attributes: {},
        order: orderArray,
        include: [
          {
            required: true,
            model: productIndex,
            as: 'productIndex',
            where: productDetailWhere,
          },
          {
            required: true,
            model: order,
            as: 'orderDetail',
            where: orderWhere,
          },
          {
            required: false,
            model: Location,
            as: 'locationDetails',
          },
          {
            required: false,
            model: statusModel,
            as: 'statusDetail',
          },
        ],
        where,
      };
      const orderProductDetail = await orderProduct.find(Totalquery);

      totalQty = orderProductDetail.reduce((sum, item) => sum + Numbers.Get(item.quantity), 0);
      totalAmount = orderProductDetail.reduce((sum, item) => sum + Numbers.Get(item.price), 0);
      totalCostPrice = orderProductDetail.reduce((sum, item) => sum + Numbers.Get(item.cost_price), 0);
      totalProfitAmount = orderProductDetail.reduce((sum, item) => sum + Numbers.Get(item.profit_amount), 0);

    }
    // Return order product is null
    if (orderProducts.count === 0) {
      return res.json(200, {
        totalCount: orderProducts.count,
        currentPage: page,
        pageSize,
        data: [],
        sort,
        sortDir,
        search,
      });
    }

    let orderProductItem;

    for (let i = 0; i < orderProducts.rows.length; i++) {

      orderProductItem = null;

      orderProductItem = orderProducts.rows[i];

      ///Total Price Amount
      orderProductData.push({
        id: orderProductItem.id,
        order_id: orderProductItem.order_id,
        product_id: orderProductItem.product_id,
        quantity: orderProductItem.quantity,
        unit_price: orderProductItem.unit_price,
        product_name: orderProductItem.productIndex?.product_name ? orderProductItem.productIndex?.product_name : '',
        brand_name: orderProductItem.productIndex?.brand_name ? orderProductItem.productIndex?.brand_name : '',
        size: orderProductItem.productIndex?.size ? orderProductItem.productIndex?.size : '',
        unit: orderProductItem.productIndex?.unit ? orderProductItem.productIndex?.unit : '',
        price: orderProductItem.price,
        store_id: orderProductItem.store_id,
        productDetails: orderProductItem.productIndex,
        image: orderProductItem.productIndex?.featured_media_url ? orderProductItem.productIndex?.featured_media_url : '',
        createdAt: DateTime.defaultDateFormat(orderProductItem.createdAt),
        updatedAt: DateTime.defaultDateFormat(orderProductItem.updatedAt),
        orderDate: orderProductItem.order_date ? DateTime.getDateTimeByUserProfileTimezone(orderProductItem.order_date,timeZone) : '',
        locationName: orderProductItem.locationDetails?.name,
        amount: orderProductItem.price,
        status: orderProductItem.statusDetail && orderProductItem.statusDetail?.name,
        allowEdit: hasPermission,
        colourCode: orderProductItem.statusDetail && orderProductItem.statusDetail?.color_code,
        statusId: orderProductItem.status,
        cost_price: orderProductItem.cost_price ? orderProductItem.cost_price : '',
        profit_amount: orderProductItem.profit_amount ? orderProductItem.profit_amount : '',
        mrp: orderProductItem.mrp,
        brand_id: orderProductItem.productIndex?.brand_id,
        sgst_amount: orderProductItem.sgst_amount,
        cgst_amount: orderProductItem.cgst_amount,
        cancelledAt: orderProductItem.cancelled_at,
        order_number: orderProductItem.order_number ? orderProductItem.order_number : "",
        allowCancel: false,
        manual_price: orderProductItem.manual_price,
        reason: orderProductItem.reason,
      });
      filterProductId.push(Number(orderProductItem.product_id));
    }

    // order product search where
    if (search) {
      where.product_id = { [Op.in]: filterProductId };
    }
    if(showTotal){

      // Add dummy record as the last index
  const lastRecord = {
         id: null,
        order_id:null ,
        product_id: null,
        quantity: totalQty,
        unit_price:null,
        product_name:null ,
        brand_name:null ,
        size:null ,
        unit:null ,
        price:null ,
        store_id:null ,
        productDetails:null ,
        image: null,
        createdAt:null ,
        updatedAt:null ,
        orderDate:null ,
        locationName:null ,
        amount:totalAmount ,
        status:null ,
        allowEdit:null ,
        colourCode:null ,
        statusId:null ,
        cost_price:totalCostPrice ,
        profit_amount:totalProfitAmount ,
        mrp:null ,
        brand_id:null ,
        sgst_amount:null ,
        cgst_amount:null ,
        cancelledAt:null ,
        order_number: null ,
        allowCancel:null ,
        manual_price:null ,
  };
  
  // Push the dummy record to the purchaseProductEntry array
  orderProductData.push(lastRecord);
      }
    return res.json(200, {
      totalCount: orderProducts.count,
      currentPage: page,
      pageSize,
      data: orderProductData,
      sort,
      sortDir,
      search,
      totalAmount
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

/**
 * Get all product by order_id
 *
 * @param orderId
 */
const getAllOrderProductByOrderId = async (orderId) => {
  if (!orderId) {
    throw { message: 'Order id is required' };
  }

  const orderProducts = await orderProduct.findAndCount({
    where: { order_id: orderId },
  });

  return orderProducts;
};

/**
 * Delete order product by order id
 *
 * @param orderId
 */
const deleteOrderProductByOrderId = async (orderId) => {
  const orderProducts = await getAllOrderProductByOrderId(orderId);

  orderProducts.rows.forEach(async (orderProduct) => {
    await orderProduct.destroy();
  });
};

/**
 * Delete order product by order id
 *
 * @param orderId
 */
const deleteOrderProductById = async (orderProductId) => {
  let orderproduct = await orderProduct.findOne({
    where: { id: orderProductId },
  });
  if (orderproduct) {
    await StoreProductService.increaseQuantity(
      orderproduct?.dataValues?.quantity,
      orderproduct?.dataValues?.product_id,
      orderproduct?.dataValues?.company_id,
      orderproduct?.dataValues?.store_id
    );
    await orderProduct.deleteById(orderProductId);
  }
};

/**
 * Cancel order product by order id
 *
 * @param orderId
 */
const cancel = async (req, res) => {
  try {
    const hasPermission = await Permission.Has(Permission.ORDER_MANAGE_OTHERS, req);

    const { id } = req.params;

    if (!id) {
      return res.json(400, { message: 'Order Product Id Required' });
    }

    let data = req.body
    const companyId = Request.GetCompanyId(req);

    let orderproduct = await orderProduct.findOne({
      where: {
        id: id, company_id: companyId
      },
    });

    if (!orderproduct) {
      return res.json(400, { message: 'Order Product Not Found' });
    }

    const { company_id } = orderproduct;

    let statusDetail = await statusService.Get(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, company_id);



    let updateObject = {};

    if (statusDetail) {
      updateObject.status = statusDetail.id;
      updateObject.cancelled_at = new Date();

    }
    let historyMessage = []

  updateObject.reason = data.reason
  
  historyMessage.push(
    `Product #${orderproduct?.product_id} cancelled due to reason : ${data.reason} \n`);

    let query = { where: { id: id } };


    if (statusDetail.allow_cancel == Status.ALLOW_CANCEL || hasPermission) {

      await orderProduct.update(updateObject, query);

      historyMessage.push(
        `Product #${orderproduct?.product_id} with quantity ${orderproduct?.quantity} cancelled \n`,);
        await updateOrderQuantity(orderproduct.order_id, company_id);

      // API response
      res.json(OK, {
        message: 'Order Product Cancelled',
      });
      res.on(("finish"), async () => {
      let message = historyMessage.join();

        History.create(message, req, ObjectName.ORDER, orderproduct.order_id);
    })
    }
    else {
      res.json(BAD_REQUEST, {
        message: 'Contact your Admin to cancel the Product',
      });
    }

  } catch (err) {
    console.log(err);
  }
};

const statusUpdate = async (orderId, updationStatusId, companyId, isCancelled) => {
  try {
    let orderProductList = await orderProduct.find({
      where: { company_id: companyId, order_id: orderId },
    });

    let orderProductCancelledStatus = await statusService.Get(
      ObjectName.ORDER_PRODUCT,
      Status.GROUP_CANCELLED,
      companyId
    );

    if (orderProductList && orderProductList.length > 0) {
      for (let i = 0; i < orderProductList.length; i++) {
        const { id } = orderProductList[i];

        let query = { where: { id: id, company_id: companyId } };

        if (orderProductCancelledStatus) {
          query.where.status = { [Op.ne]: orderProductCancelledStatus.id }
        }

        let updateData = { status: updationStatusId };

        if (isCancelled) {
          updateData.price = 0;
          updateData.profit_amount = 0;
        }

        await orderProduct.update(updateData, query);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateStatus = async (orderId, companyId, statusId) => {
  try {
    if (statusId) {

      const orderStatus = await statusService.getData(statusId, companyId);

      if (orderStatus && orderStatus.group == Status.GROUP_COMPLETED) {

        let orderProductCompletedStatus = await statusService.Get(
          ObjectName.ORDER_PRODUCT,
          Status.GROUP_COMPLETED,
          companyId
        );

        if (orderProductCompletedStatus) {
          await statusUpdate(orderId, orderProductCompletedStatus.id, companyId);
        }
      } else if (orderStatus && orderStatus.group == Status.GROUP_CANCELLED) {

        const orderProductStatus = await statusService.Get(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);

        if (orderProductStatus) {

          await statusUpdate(orderId, orderProductStatus.id, companyId, true);

          await order.update({ cancelled_at: new Date() }, { where: { id: orderId, company_id: companyId } });
          await orderProduct.update({ cancelled_at: new Date() }, { where: { order_id: orderId, company_id: companyId } });
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateOrderQuantity = async (orderId, companyId) => {
  try {
    if (orderId && companyId) {

      let statusDetail= await statusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT,null,companyId,Status.GROUP_CANCELLED)
      let excludeCancelledStatusIds = statusDetail && statusDetail.length > 0 && statusDetail.map(status => status?.id);

      // Calculate the sums
      const sums = await orderProductModal.findOne({
        attributes: [
          [
            Sequelize.literal(`SUM(CASE WHEN "manual_price" IS NOT NULL THEN "manual_price" * "quantity" ELSE "price" END)`),
            'totalAmount'
          ],
          [Sequelize.fn('sum', Sequelize.col('cgst_amount')), 'totalCgstAmount'],
          [Sequelize.fn('sum', Sequelize.col('sgst_amount')), 'totalSgstAmount']
        ],
        where: { order_id: orderId, company_id: companyId, status: {[Op.in]: excludeCancelledStatusIds} }
      });
      // Extract the calculated sums
      const { totalAmount, totalCgstAmount, totalSgstAmount } = sums.dataValues;

      // Check if totalAmount is valid and update the order
      if (totalAmount >= 0) {
        await order.update(
          {
            total_amount: totalAmount,
            total_cgst_amount: totalCgstAmount,
            total_sgst_amount: totalSgstAmount
          },
          { where: { id: orderId, company_id: companyId } }
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateOrderProductByOrderUpdate = async (orderId, companyId, sourceParam, targetParam) => {
  try {
    let orderDetail = await order.findOne({
      where: { id: orderId, company_id: companyId },
    });
    let orderProductList = await orderProduct.find({
      where: { company_id: companyId, order_id: orderId },
    });

    if (orderProductList && orderProductList.length > 0) {
      for (let i = 0; i < orderProductList.length; i++) {
        let updatetData = new Object();

        updatetData[targetParam] = orderDetail[sourceParam];

        let query = { where: { id: orderProductList[i].id, company_id: companyId } };

        await orderProduct.update(updatetData, query);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const replenishSearch = async (req, res) => {
  try {
    const companyId = Request.GetCompanyId(req);

    const params = req.query;

    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      storeId,
      startDate,
      endDate,
      productId,
      orderId,
      category,
      brand,
    } = params;

    let productDetailWhere = new Object();

    let where = new Object();

    let order = new Array();

    const orderProductData = new Array();

    let filterProductId = new Array();


    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)

    if (!storeId) {
      return res.json(400, { message: 'Location Id is Required' });
    }

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
      store_product_id: 'store_product_id',
      name: 'name',
      quantity: 'quantity',
      vendor: 'vendor',
      product_name: 'product_name',
      fulfillment_service: 'fulfillment_service',
      requires_shipping: 'requires_shipping',
      taxable: 'taxable',
      grams: 'grams',
      price: 'price',
      unit_price: 'unit_price',
      amount: 'amount',
      cost_price: 'cost_price',
      profit_amount: 'profir_amount',
      total_discount: 'total_discount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      product_display_name: 'product_display_name',
      location: 'location',
      order_id: 'order_id',
      order_date: 'order_date',
    };

    const sortParam = sort ? sort : 'createdAt';
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort product by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: 'Invalid sort order' };
    }

    //append the company Id
    where.company_id = companyId;

    // Filter by order_id
    if (orderId) {
      where.order_id = orderId;
    }

    if (storeId) {
      where.store_id = storeId;
    }

    if (category) {
      productDetailWhere.category_id = category;
    }

    if (brand) {
      productDetailWhere.brand_id = brand;
    }

    if (productId) {
      where.product_id = productId;
    }

    if (startDate && !endDate) {
      where.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      where.order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }

    if (startDate && endDate) {
      where.order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
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

    if (sort === '') {
      order.push([sortParam, 'DESC']);
    }
    if (sort && sort !== '' && sort !== 'product_display_name' && sort !== 'location') {
      order.push([sortParam, sortDirParam]);
    }
    if (sort === 'product_display_name') {
      order.push([{ model: productIndex, as: 'productIndex' }, 'product_display_name', sortDir]);
    }
    if (sort === 'location') {
      order.push([{ model: Location, as: 'locationDetails' }, 'name', sortDir]);
    }

    const query = {
      distinct: true,
      attributes: {},
      order,
      include: [
        {
          required: true,
          model: productIndex,
          as: 'productIndex',
          where: productDetailWhere,
        },
        {
          required: false,
          model: Location,
          as: 'locationDetails',
        },
        {
          required: false,
          model: statusModel,
          as: 'statusDetail',
        },
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

    // Get order product and count
    const orderProducts = await orderProduct.findAndCount(query);

    // Return order product is null
    if (orderProducts.count === 0) {
      return res.json(200, {
        totalCount: orderProducts.count,
        currentPage: page,
        pageSize,
        data: [],
        sort,
        sortDir,
        search,
      });
    }

    let storeProductList = await storeProduct.findAll({
      where: { store_id: storeId, company_id: companyId },
    });

    for (let i = 0; i < orderProducts.rows.length; i++) {
      //destructure the product
      let {
        id,
        createdAt,
        locationDetails,
        mrp,
        updatedAt,
        order_id,
        product_id,
        quantity,
        unit_price,
        price,
        store_id,
        media_id,
        order_date,
        statusDetail,
        status,
        cost_price,
        profit_amount,
        productIndex,
      } = orderProducts.rows[i];

      let storeProductDetail =
        storeProductList && storeProductList.find((data) => data.product_id == product_id && data.store_id == storeId);

      if (storeProductDetail && storeProductDetail.quantity == 0) {
        ///Total Price Amount
        orderProductData.push({
          id,
          order_id,
          product_id,
          quantity,
          unit_price,
          product_name: productIndex?.product_name ? productIndex?.product_name : '',
          brand_name: productIndex?.brand_name ? productIndex?.brand_name : '',
          size: productIndex?.size ? productIndex?.size : '',
          unit: productIndex?.unit ? productIndex?.unit : '',
          price,
          store_id: store_id,
          productDetails: productIndex,
          image: productIndex?.featured_media_url ? productIndex?.featured_media_url : '',
          createdAt: DateTime.defaultDateFormat(createdAt),
          updatedAt: DateTime.defaultDateFormat(updatedAt),
          orderDate: order_date ? DateTime.Format(order_date) : '',
          locationName: locationDetails?.name,
          amount: price,
          status: statusDetail && statusDetail.name,
          statusId: status,
          cost_price: cost_price ? cost_price : '',
          profit_amount: profit_amount ? profit_amount : '',
          mrp: mrp,
          brand_id: productIndex.brand_id,
          replenishQuantity: storeProductDetail && storeProductDetail.replenish_quantity,
        });
        filterProductId.push(Number(product_id));
      }
    }

    return res.json(200, {
      totalCount: orderProducts.count,
      currentPage: page,
      pageSize,
      data: orderProductData,
      sort,
      sortDir,
      search,
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const deleteByOrderId = async (orderId, companyId) => {
  try {
    if (orderId && companyId) {
      await orderProduct.delete({ where: { order_id: orderId, company_id: companyId } });
    }
  } catch (err) {
    console.log(err);
  }
};

const bulkCancel = async (data, companyId) => {
  try {
    const { orderProductList, orderId } = data;

    if (!orderId) {
      throw { message: 'Order Id is Required' };
    }

    if (!orderProductList) {
      throw { message: 'Order Product is Required' };
    }

    let statuDetail = await statusService.Get(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);

    if (!statuDetail) {
      throw { message: 'Cancel Status Required' };
    }

    let updateObject = { status: statuDetail.id, cancelled_at: new Date() };


    if (orderProductList && orderProductList.length > 0) {
      for (let i = 0; i < orderProductList.length; i++) {
        await orderProduct.update(updateObject, { where: { id: orderProductList[i], company_id: companyId } });
        await updateOrderQuantity(orderId, companyId);
      }
    }
  } catch (err) {
    console.log(err);
    throw { message: err.message };
  }
};


const getTotalAmount = async (req, res, next) => {
  let data = req.query;
  let companyId = Request.GetCompanyId(req);
  let statusDetail = await statusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);
  const excludeCancelledStatusIds = statusDetail && statusDetail.length >0 && statusDetail.map(status => status.id);
  const orderProducts = await orderProductModal.findAll({
    attributes: [
      [Sequelize.literal(`CASE WHEN "manual_price" IS NOT NULL THEN "manual_price" * "quantity" ELSE "price" END`), 'amount']
    ],
    where: {
      company_id: companyId,
      order_id: data?.orderId,
      status: { [Op.notIn]: excludeCancelledStatusIds }
    }
  });

  const totalAmount = orderProducts.reduce((sum, product) => sum + Numbers.GetFloat(product.get('amount')), 0);

  res.json(OK, {
    totalAmount: totalAmount ? totalAmount:0,
  });
};

const getRewardCount = async ({companyId, userId, startDate, endDate, manageOtherPermission=false}) => {


  const cancelStatus = await statusService.Get(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);

  let rawQuery = `
    SELECT SUM(op.reward) AS totalReward
    FROM order_product AS op
    JOIN "order" AS o ON op.order_id = o.id
    WHERE
    (:startDate IS NULL OR o.date >= :startDate)
    AND (:endDate IS NULL OR o.date <= :endDate)
      ${manageOtherPermission==true ? "":   'AND o.owner = :userId'}
      AND op.company_id = :companyId
      AND op.status != :cancelStatusId
  `;
  let params ={
    startDate: startDate,
    endDate: endDate,
    companyId: companyId,
    cancelStatusId: cancelStatus.id,
    userId: userId
  }

  const [{ totalreward }] = await db.connection.query(rawQuery, {
    replacements: params,
    type: QueryTypes.SELECT,
  });

  return totalreward || 0;
}


const getOrderProductQuantityByProductId=async (productId,companyId)=>{

  let statusDetail = await statusService.getAllStatusByGroupId(ObjectName.ORDER_PRODUCT, Status.GROUP_CANCELLED, companyId);

  const excludeCancelledStatusIds = statusDetail && statusDetail.length >0 && statusDetail.map(status => status.id);

  const orderQuantity = await orderProductModal.sum('quantity', {
    where: {
      company_id: companyId,
      product_id: productId,
      status: {[Op.notIn]: excludeCancelledStatusIds }
    },
  });

  return orderQuantity && orderQuantity
}

const getByOrderDate = async (toDate, fromDate,companyId ) => {
  try {
      let orderProductList = [];

      let orderProductObject = new Object();

      let orderWhere = {
        order_date: {
          [Op.and]: {
            [Op.gte]: fromDate,
            [Op.lte]: DateTime.toGetISOStringWithDayEndTime(toDate),
          },
        },
        company_id: companyId,
        cancelled_at: { [Op.eq]: null },
      };

      let OrderProductData = await orderProductModal.findAll({
        where: orderWhere,
        attributes: ["order_date", "quantity", "product_id", "store_id"], // Specify the attributes to retrieve
      });

      for (let i = 0; i < OrderProductData.length; i++) {
        orderProductObject = {
          quantity: OrderProductData[i].quantity,
          order_date: DateTime.DateOnly(OrderProductData[i].order_date),
          product_id: OrderProductData[i].product_id,
          store_id: OrderProductData[i].store_id,
        };
        orderProductList.push(orderProductObject);
      }
      return orderProductList;
  } catch (err) {
    console.log(err);
  }
};

const getTotalAmountByProductId=async (params)=>{

  let whereCondition=""

  let status = params && params?.status.join(',')
  if(status && status.length>0){
    params?.status ? whereCondition += ` AND "order_product".status IN (${params?.status.join(',')})` :""
  }
      
  params?.orderId ? whereCondition +=  ` AND "order_product"."order_id" = ${params?.orderId}` :""
  params?.product_id ? whereCondition +=  ` AND "order_product"."product_id" = ${params?.product_id}` :""
  params?.location ? whereCondition += ` AND "order_product"."store_id" = ${params?.location}` :""
  params?.startDate ? whereCondition += ` AND "order_product"."order_date" >= '${params?.startDate}'` : ""
  params?.endDate ? whereCondition += ` AND "order_product"."order_date" <= '${params?.endDate}'` : ""
  params?.searchTerm && !isNaN(Numbers.Get(params?.searchTerm)) ? whereCondition += ` AND "order_product"."order_number" = CAST('${params?.searchTerm}' AS VARCHAR)` : ""
  params?.searchTerm && isNaN(Numbers.Get(params?.searchTerm)) ? whereCondition += ` AND ("order_product"."order_number" ILIKE '%${params?.searchTerm}%')` : ""

    const rawQuery = `
    SELECT COALESCE(SUM("order_product"."price"),0) AS "totalAmount"
    FROM "order_product"
    WHERE "order_product"."company_id"=${params?.company_id}
    AND "order_product"."deletedAt" IS NULL
    ${whereCondition}
    `;
  
    const totalAmountResult = await db.connection.query(rawQuery, {
      type: QueryTypes.SELECT,
    });
  
    const totalAmount1 = totalAmountResult && totalAmountResult[0].totalAmount;
    return totalAmount1
}

module.exports = {
  createOrderProduct,
  search,
  getAllOrderProductByOrderId,
  deleteOrderProductByOrderId,
  deleteOrderProductById,
  create,
  cancel,
  updateStatus,
  update,
  updateOrderProductByOrderUpdate,
  replenishSearch,
  deleteByOrderId,
  bulkCancel,
  getTotalAmount,
  getRewardCount,
  getOrderProductQuantityByProductId,
  getByOrderDate,
  calculateProfitAmount,
  getTotalAmountByProductId
};
