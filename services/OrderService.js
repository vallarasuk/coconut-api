const DateTime = require("../lib/dateTime");
//{ defaultDateFormat, shortDateAndTime }
// services
const shopifyService = require("./ShopifyService");
const orderProductService = require("./OrderProductService");
const History = require("./HistoryService");
const Order = require("../helpers/Order");
const ProductService = require("./services/ProductService");

const {
  order: orderModel,
  Location,
  orderProduct,
  User,
  Shift,
  account,
  storeProduct,
  productIndex,
  status: statusModel,
  OrderType,
  Media,
} = require("../db").models;
const { Op, QueryTypes, Sequelize } = require("sequelize");
const Request = require("../lib/request");

const Permission = require("../helpers/Permission");
const ObjectName = require("../helpers/ObjectName");
const DataBaseService = require("../lib/dataBaseService");
const Number = require("../lib/Number");
const { CREATE_SUCCESS, BAD_REQUEST, OK } = require("../helpers/Response");
const Product = require("../helpers/Product");
const statusServiceModal = new DataBaseService(statusModel);
const orderService = new DataBaseService(orderModel);
const locationService = require("./LocationService");
const Response = require("../helpers/Response");
const statusService = require("./StatusService");
const Status = require("../helpers/Status");
const AttendanceService = require("./AttendanceService");
const validator = require(".././lib/validator");
const Boolean = require("../lib/Boolean");
const {
  getValueByObject,
  saveSetting,
  getSettingList,
  getSettingValue,
} = require("./SettingService");
const Setting = require("../helpers/Setting");
const location = require("../helpers/Location");
const Currency = require("../lib/currency");
const orderProductModelService = new DataBaseService(orderProduct);
const SlackService = require("./SlackService");
const UserService = require("./UserService");
const AddressService = require("./AddressService");
const locationProductService = require("./locationProductService");
const MediaServices = require("../services/MediaService");
const db = require("../db");
const { orderPaymentTypeOptions } = require("../helpers/Constant");
const ShiftService = require("./ShiftService");
const AccountService = require("./AccountService");
const ObjectHelper = require("../helpers/ObjectHelper");
const OrderTypeService = require("./OrderTypeService");
const config = require("../config/config");

const ArrayList = require("../lib/ArrayList");
const String = require("../lib/string");
const { OrderTypeGroup } = require("../helpers/OrderTypeGroup");
const Where = require("../lib/Where");

const dateTime = new DateTime();
/**
 * Get location orders
 * @param storeId
 */
const getStoreOrders = async (storeId) => {
  const orders = await shopifyService.getOrder(storeId);
  return orders;
};

/**
 * Import location orders in order table
 *
 * @param storeId
 */
const importOrders = async (storeId) => {
  try {
    if (!storeId) {
      throw { message: "Location id is required" };
    }

    const orders = await getStoreOrders(storeId);

    // Create each orders in order table
    for (let order of orders) {
      const createData = {
        orderNumber: order.order_number,
        storeOrderId: order.id,
        date: order.processed_at,
        total_amount: order.total_price,
        status: order.status,
        storeId,
      };

      const orderDetails = await createOrder(createData);

      if (!orderDetails) continue;

      order.line_items.forEach(async (item) => {
        const itemCreateData = {
          storeProductId: item.product_id,
          orderId: orderDetails.id,
          name: item.name,
          quantity: item.quantity,
          sku: item.sku,
          vendor: item.vendor,
          fulfillmentService: item.fulfillment_service,
          requiresShipping: item.requires_shipping,
          taxable: item.taxable,
          grams: item.grams,
          price: item.price,
          totalDiscount: item.total_discount,
          fulfillmentStatus: item.fulfillment_status,
          status: item.status,
        };

        await orderProductService.createOrderProduct(itemCreateData);
      });
    }
  } catch (err) {
    console.log(err);
  }
};

/**
 * Create order
 *
 * @param data
 */
const createOrder = async (data) => {
  try {
    if (!data) {
      throw { message: "Order details required" };
    }

    // Validate order if already exist
    const orderExist = await orderModel.count({
      where: { order_number: data.orderNumber },
    });

    if (orderExist) {
      return null;
    }

    const createData = {
      order_number: data.orderNumber,
      store_order_id: data.storeOrderId,
      date: new Date(),
      total_amount: data.total_amount,
      store_id: data.storeId,
      Order_Id: data.OrderId,
      owner: data?.sales_executive_user_id
        ? data.sales_executive_user_id
        : data.owner,
    };

    return await orderModel.create(createData);
  } catch (err) {
    console.log(err);
  }
};

/**
 * Search order
 *
 * @param {*} params
 */
const searchOrder = async (params, req) => {
  try {
    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      status,
      customer_account,
      location,
      user,
      shift,
      startDate,
      endDate,
      paymentType,
      orderId,
      showTotalAmount,
      orderDate,
      currentLocation,
    } = params;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: "Invalid page" };
    }
    const companyId = Request.GetCompanyId(req);

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: "Invalid page size" };
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      store_order_id: "store_order_id",
      date: "date",
      total_amount: "total_amount",
      order_number: "order_number",
      createdAt: "createdAt",
      id: "id",
      updatedAt: "updatedAt",
      amount: "amount",
      status: "status",
      locationName: "store_id",
      owner: "owner",
      shift: "shift",
      customer_phone_number: "customer_phone_number",
      createdBy: "createdBy",
      payment_type: "payment_type",
      cash_amount: "cash_amount",
      upi_amount: "upi_amount",
      customer_account: "customer_account",
    };

    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate);
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate);

    const hasOrderManageOthersPermission = await Permission.GetValueByName(
      Permission.ORDER_MANAGE_OTHERS,
      req.role_permission
    );
    const sortParam = sort || "order_number";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort product by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }

    const data = params;
    let where = {};
    where.company_id = companyId;
    // Search by location id
    if (Number.isNotNull(data?.store_id) || Number.isNotNull(currentLocation)) {
      where = {
        store_id: Number.isNotNull(data?.store_id)
          ? data.store_id
          : currentLocation,
      };
    }

    // Search by name
    const name = data.name;
    if (name) {
      where.name = {
        $like: `%${name}%`,
      };
    }
    if (Number.isNotNull(orderId)) {
      where.id = orderId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.payment_type = paymentType;
    }
    if (!hasOrderManageOthersPermission) {
      let userId = req && req.user && req.user.id;
      if (userId) {
        if (customer_account) {
          where.customer_account = userId;
        } else {
          where.owner = userId;
        }
      }
    }

    let date = DateTime.getCustomDateTime(
      orderDate || req.query.date,
      timeZone
    );

    // Apply filters if there is one
    if (Number.isNotNull(location)) {
      where.store_id = Number.Get(location);
    }

    if (Number.isNotNull(shift)) {
      where.shift = shift;
    }
    if (Number.isNotNull(orderDate || req?.query?.date)) {
      if (date && Number.isNotNull(date)) {
        where.date = {
          [Op.and]: {
            [Op.gte]: date?.startDate,
            [Op.lte]: date?.endDate,
          },
        };
      }
    }

    if (user) {
      where.owner = user;
    }

    if (shift) {
      where.shift = shift;
    }

    Where.id(where, "owner", params?.owner);
    if (startDate && !endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
        },
      };
    }

    if (endDate && !startDate) {
      where.date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    const whereLocation = {};

    whereLocation.company_id = companyId;

    let statusDetail = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_DRAFT,
      companyId
    );

    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      if (searchTerm && isNaN(parseFloat(searchTerm))) {
        where[Op.or] = [
          {
            "$location.name$": {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            order_number: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }

      if (
        typeof parseFloat(searchTerm) == "number" &&
        !isNaN(parseFloat(searchTerm))
      ) {
        where[Op.or] = [
          {
            order_number: {
              [Op.eq]: searchTerm,
            },
          },
          {
            customer_phone_number: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
    }

    let order = [];

    if (sort === "locationName") {
      order.push([[{ model: Location, as: "location" }, "name", sortDir]]);
    } else if (sort === "status") {
      order.push([
        [{ model: statusModel, as: "statusDetail" }, "name", sortDir],
      ]);
    } else if (sort === "customer_account") {
      order.push([{ model: account, as: "accountDetail" }, "name", sortDir]);
    } else {
      order.push([[sortableFields[sortParam], sortDirParam]]);
    }

    // Include
    const include = [
      {
        required: false,
        model: Location,
        as: "location",
        attributes: ["id", "name"],
        where: whereLocation,
      },
      {
        required: false,
        model: Shift,
        as: "shiftDetail",
        attributes: ["name", "id"],
      },
      {
        model: User,
        as: "ownerDetail",
        attributes: ["name", "last_name", "media_url", "id"],
      },
      {
        model: User,
        as: "user",
        attributes: ["name"],
      },
      {
        model: account,
        as: "accountDetail",
        attributes: ["name", "id"],
      },
      {
        required: false,
        model: statusModel,
        as: "statusDetail",
        attributes: ["name", "color_code", "id", "allow_edit", "group"],
      },
      {
        model: OrderType,
        as: "orderTypeDetail",
      },
    ];
    const query = {
      order,
      where,
      include,
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

    let filterParams = {
      companyId: companyId,
      startDate:
        date?.startDate && date
          ? date?.startDate
          : start_date
          ? DateTime.toGMT(start_date, timeZone)
          : "",
      endDate:
        date?.endDate && date
          ? date?.endDate
          : end_date
          ? DateTime.toGMT(end_date, timeZone)
          : "",
      location: location,
      status: status,
      shift: where?.shift,
      paymentType: paymentType,
      searchTerm: searchTerm,
      timeZone: timeZone,
    };
    if (!hasOrderManageOthersPermission) {
      let userId = req && req.user && req.user.id;
      if (userId) {
        filterParams.user = userId;
      }
    } else {
      if (user) {
        filterParams.user = user;
      }
    }

    let totalAmount;
    if (showTotalAmount) {
      totalAmount = await getCashAndUpiTotalAmount(filterParams);
    }
    // Get Order image list and count
    const orders = await orderModel.findAndCountAll(query);

    // Return product image is null
    if (orders.count === 0) {
      return [];
    }

    const orderData = [];
    const ordersRows = orders.rows; // Store the rows in a separate variable for better performance

    for (let i = 0; i < ordersRows.length; i++) {
      let ownerName = "";
      if (ordersRows[i] && ordersRows[i].ownerDetail) {
        ownerName =
          ordersRows[i].ownerDetail?.name +
          " " +
          ordersRows[i].ownerDetail?.last_name;
      }
      const orderDetails = { ...ordersRows[i].get() };
      (orderDetails.createdAt = ordersRows[i].createdAt),
        dateTime.formats.shortDateAndTime;
      (orderDetails.updatedAt = ordersRows[i].updatedAt),
        dateTime.formats.shortDateAndTime;
      orderDetails.date = orderDetails.date;
      orderDetails.total_amount = orderDetails.total_amount;
      orderDetails.customer_account =
        orderDetails && orderDetails?.accountDetail;
      orderDetails.id = orderDetails.id;
      orderDetails.order_number = orderDetails.order_number;
      orderDetails.status =
        ordersRows[i].statusDetail && ordersRows[i].statusDetail?.name;
      orderDetails.colorCode = ordersRows[i].statusDetail?.color_code;
      orderDetails.statusValue = orderDetails.status;
      orderDetails.createdBy = orderDetails?.user?.name;
      orderDetails.locationName = orderDetails.location?.name;
      orderDetails.customerName =
        (orderDetails &&
          orderDetails?.accountDetail &&
          orderDetails?.accountDetail?.name) ||
        "";
      orderDetails.salesExecutive = ownerName;
      orderDetails.payment_type =
        orderDetails.payment_type == null
          ? ""
          : orderDetails.payment_type == Order.PAYMENT_TYPE_UPI_VALUE
          ? Order.PAYMENT_TYPE_UPI_TEXT
          : orderDetails.payment_type == Order.PAYMENT_TYPE_CASH_VALUE
          ? Order.PAYMENT_TYPE_CASH_TEXT
          : Order.PAYMENT_TYPE_MIXED_TEXT;
      orderDetails.paymentType =
        orderDetails.payment_type == null
          ? ""
          : orderDetails.payment_type == Order.PAYMENT_TYPE_UPI_TEXT
          ? Order.PAYMENT_TYPE_UPI_VALUE
          : orderDetails.payment_type == Order.PAYMENT_TYPE_CASH_TEXT
          ? Order.PAYMENT_TYPE_CASH_VALUE
          : Order.PAYMENT_TYPE_MIXED_VALUE;
      orderDetails.shift =
        orderDetails.shiftDetail && orderDetails.shiftDetail.name;
      (orderDetails.salesExecutiveFirstName = ordersRows[i].ownerDetail?.name),
        (orderDetails.salesExecutiveSecondName =
          ordersRows[i].ownerDetail?.last_name),
        (orderDetails.salesExecutiveMediaUrl =
          ordersRows[i].ownerDetail?.media_url),
        (orderDetails.total_cgst_amount = orderDetails.total_cgst_amount);
      orderDetails.total_sgst_amount = orderDetails.total_sgst_amount;
      orderDetails.cash_amount = orderDetails.cash_amount;
      orderDetails.upi_amount = orderDetails.upi_amount;
      (orderDetails.type =
        ordersRows[i].orderTypeDetail && ordersRows[i].orderTypeDetail),
        (orderDetails.allow_store_order =
          ordersRows[i].orderTypeDetail &&
          ordersRows[i].orderTypeDetail?.allow_store_order),
        (orderDetails.allow_delivery =
          ordersRows[i].orderTypeDetail &&
          ordersRows[i].orderTypeDetail?.allow_delivery),
        (orderDetails.allow_customer_selection =
          ordersRows[i].orderTypeDetail &&
          ordersRows[i].orderTypeDetail?.show_customer_selection),
        (orderDetails.upi_payment_verified =
          orderDetails?.upi_payment_verified),
        (orderDetails.owner = orderDetails.owner);
      orderDetails.owner_firstName =
        ordersRows[i].ownerDetail && ordersRows[i].ownerDetail?.name
          ? ordersRows[i].ownerDetail?.name
          : "";
      orderDetails.owner_lastName =
        ordersRows[i].ownerDetail && ordersRows[i].ownerDetail?.last_name
          ? ordersRows[i].ownerDetail?.last_name
          : "";
      orderDetails.owner_media_url = ordersRows[i].ownerDetail?.media_url
        ? ordersRows[i].ownerDetail?.media_url
        : "";
      orderData.push(orderDetails);
    }

    if (showTotalAmount && !orderDate) {
      let lastReCord = ObjectHelper.createEmptyRecord(orderData[0]);
      lastReCord.cash_amount = totalAmount?.totalCashAmount || "";
      lastReCord.upi_amount = totalAmount?.totalUpiAmount || "";
      lastReCord.total_amount = totalAmount?.totalAmount || "";
      lastReCord.isLastRecord = true;
      orderData.push(lastReCord);
    }

    let responseData = {
      totalCount: orders.count,
      currentPage: page,
      pageSize,
      data: orderData,
      sort,
      sortDir,
      search,
    };

    if (showTotalAmount) {
      (responseData.totalAmount = totalAmount && totalAmount?.totalAmount),
        (responseData.totalUpi = totalAmount && totalAmount?.totalUpiAmount),
        (responseData.totalCash = totalAmount && totalAmount?.totalCashAmount),
        (responseData.totalDraftAmount =
          totalAmount && totalAmount?.totalDraftAmount);
    }
    return responseData;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Check whether order exist or not
 *
 * @param orderId
 * @returns false if not exist else order details
 */
const isExistById = async (orderId) => {
  try {
    if (!orderId) {
      throw { message: "Order id is required" };
    }

    const orderDetails = await orderModel.findOne({ where: { id: orderId } });

    if (!orderDetails) {
      return false;
    }

    return orderDetails;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Get order details by order id
 *
 * @param orderId
 */
const getOrdersById = async (orderId, company_id) => {
  try {
    const orderExist = await isExistById(orderId, company_id);

    if (!orderExist) {
      throw { message: "Order not found" };
    }

    const orderDetails = await orderModel.findOne({
      where: { id: orderId, company_id },
      include: [
        {
          required: false,
          model: Location,
          as: "location",
          attributes: ["id", "name"],
        },
        {
          required: false,
          model: statusModel,
          as: "statusDetail",
        },
        {
          required: false,
          model: OrderType,
          as: "orderTypeDetail",
          attributes: ["name", "show_customer_selection"],
        },
      ],
    });

    return orderDetails;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Delete order by id
 *
 * @param orderId
 */
const deleteOrder = async (orderId) => {
  try {
    const orderExist = await isExistById(orderId);
    if (!orderExist) {
      throw { message: "Order Deleted Successfully" };
    }

    await orderModel.destroy({
      where: { id: orderId },
    });

    await orderProductService.deleteOrderProductByOrderId(orderId);
  } catch (err) {
    console.log(err);
  }
};

const getTotalAmount = async (params) => {
  let { startDate, endDate, userId, companyId, orderId, timeZone } = params;
  try {
    let where = {};

    let statusDetail = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_CANCELLED,
      companyId
    );

    if (statusDetail && statusDetail?.id) {
      where.status = { [Op.ne]: statusDetail?.id };
    }

    where.company_id = companyId;

    if (userId) {
      where.owner = userId;
    }

    if (orderId) {
      where.id = orderId;
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }

    const query = {
      include: [
        {
          model: Location,
          as: "location",
          where: {
            status: location.STATUS_ACTIVE,
            allow_sale: location.ENABLED,
          },
        },
      ],
      where: where,
    };

    let total = 0;

    let totalAmount = await orderModel.findAndCountAll(query);
    for (const order of totalAmount.rows) {
      if (order.total_amount !== null) {
        total += Number.Get(order.total_amount, 0);
      }
    }

    return {
      amount: total,
    };
  } catch (err) {
    console.log(err);
  }
};

const getOrderAmountByShift = async (params) => {
  let { startDate, endDate, userId, companyId, shift, timeZone, storeId } =
    params;
  try {
    let where = {};

    let statusDetail = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_CANCELLED,
      companyId
    );
    if (Number.isNotNull(statusDetail)) {
      where.status = { [Op.ne]: statusDetail?.id };
    }

    where.company_id = companyId;

    if (userId) {
      where.owner = userId;
    }

    if (shift) {
      where.shift = shift;
    }

    if (storeId) {
      where.store_id = storeId;
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(startDate, timeZone),
          [Op.lte]: DateTime.toGMT(endDate, timeZone),
        },
      };
    }
    const query = {
      where: where,
      attributes: [
        "status",
        [Sequelize.fn("SUM", Sequelize.col("total_amount")), "total_amount"],
        [Sequelize.fn("MAX", Sequelize.col("order.id")), "id"],
        [
          Sequelize.fn("SUM", Sequelize.col("cash_amount")),
          "total_cash_amount",
        ],
        [Sequelize.fn("SUM", Sequelize.col("upi_amount")), "total_upi_amount"],
      ],
      group: ["order.status"],
    };

    let orderDetails = await orderModel.findAll(query);
    if (orderDetails && orderDetails.length > 0) {
      return orderDetails.map((order) => ({
        status: order.status,
        total_amount: order.get("total_amount"),
        total_cash_amount: order.get("total_cash_amount"),
        total_upi_amount: order.get("total_upi_amount"),
      }));
    } else {
      return [];
    }
  } catch (err) {
    console.log(err);
  }
};

const create = async (data) => {
  try {
    if (!data) {
      throw { message: "Order details required" };
    }

    let response = await orderModel.create(data);
    return response;
  } catch (err) {
    console.log(err);
  }
};

const updateQuantity = async (orderId, companyId) => {
  try {
    //get the draft status Id
    let draftStatus = await statusService.Get(
      ObjectName.ORDER_PRODUCT,
      Status.GROUP_DRAFT,
      companyId
    );

    //out of stock list array
    let outOfStockProductList = new Array();

    //order product where
    let orderproductWhere = new Object();

    //append the order id
    orderproductWhere.order_id = orderId;

    //append the company_id
    orderproductWhere.company_id = companyId;

    //validate draft status
    if (draftStatus) {
      orderproductWhere.status = draftStatus.id;
    }

    //get the order product list
    let orderproductList = await orderProduct.findAll({
      where: orderproductWhere,
      include: [
        {
          model: productIndex,
          as: "productIndex",
          required: true,
        },
      ],
    });

    //validate order product list exist
    if (orderproductList && orderproductList.length > 0) {
      //loop the order product list
      for (let i = 0; i < orderproductList.length; i++) {
        //destrcture the order product
        const { quantity, product_id, store_id, productIndex } =
          orderproductList[i];

        //get location product
        let isStoreProductExist = await storeProduct.findOne({
          where: { store_id: store_id, product_id: product_id },
        });

        //validate location product exist or not
        if (isStoreProductExist) {
          //destrcuture the location product
          const {
            quantity: storeProductQuantity,
            id,
            order_quantity,
          } = isStoreProductExist;

          //validate quantity availability
          if (
            storeProductQuantity >= quantity ||
            productIndex.allow_sell_out_of_stock ==
              Product.PRODUCT_SELL_OUT_OF_STOCK_POLICY_CONTINUE_VALUE
          ) {
            //get the updated quantity
            let updateQuantity = storeProductQuantity - quantity;

            //get the updated order quantity
            let updatedOrderQuantity = order_quantity
              ? Number.GetFloat(order_quantity) + Number.GetFloat(quantity)
              : quantity;

            //update the location product
            await storeProduct.update(
              {
                quantity: updateQuantity,
                order_quantity: updatedOrderQuantity,
                last_order_date: new Date(),
              },
              {
                where: { store_id: store_id, product_id: product_id },
              }
            );
          } else {
            outOfStockProductList.push({
              product_id: product_id,
              availableQuantity: storeProductQuantity,
              currentQuantity: quantity,
              storeproductId: id,
            });
          }
        }
      }
    }

    return outOfStockProductList;
  } catch (err) {
    console.log(err);
  }
};

const updateStoreProductQuantity = async (orderId, companyId) => {
  try {
    //get the draft status Id
    let completedStatus = await statusService.Get(
      ObjectName.ORDER_PRODUCT,
      Status.GROUP_COMPLETED,
      companyId
    );

    //order product where
    let orderproductWhere = new Object();

    //append the order id
    orderproductWhere.order_id = orderId;

    //append the company_id
    orderproductWhere.company_id = companyId;

    //validate draft status
    if (completedStatus) {
      orderproductWhere.status = completedStatus.id;
    }

    //get the order product list
    let orderproductList = await orderProduct.findAll({
      where: orderproductWhere,
    });

    //validate order product list exist
    if (orderproductList && orderproductList.length > 0) {
      //loop the order product list
      for (let i = 0; i < orderproductList.length; i++) {
        //destrcture the order product
        const { quantity, product_id, store_id } = orderproductList[i];

        //get location product
        let isStoreProductExist = await storeProduct.findOne({
          where: { store_id: store_id, product_id: product_id },
        });

        //validate location product exist or not
        if (isStoreProductExist) {
          //destrcuture the location product
          const {
            quantity: storeProductQuantity,
            id,
            order_quantity,
          } = isStoreProductExist;

          //validate quantity availability
          if (storeProductQuantity >= quantity) {
            //get the updated quantity
            let updateQuantity = storeProductQuantity + quantity;

            //get the updated order quantity
            let updatedOrderQuantity = order_quantity
              ? Number.Subtraction(order_quantity, quantity)
              : quantity;

            //update the location product
            await storeProduct.update(
              {
                quantity: updateQuantity,
                order_quantity: updatedOrderQuantity,
              },
              {
                where: { store_id: store_id, product_id: product_id, id: id },
              }
            );
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const update = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    //get body data
    const data = req.body;
    //get order Id
    const hasPermission = await Permission.GetValueByName(
      Permission.ORDER_MANAGE_OTHERS,
      req.role_permission
    );

    if (!Number.isNotNull(orderId)) {
      return res.json(BAD_REQUEST, { message: "Order Id Required" });
    }

    //get companyId
    const companyId = Request.GetCompanyId(req);
    let getOrderDetail = await getOrdersById(orderId, companyId);

    const status = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_CANCELLED,
      companyId,
      { object_id: getOrderDetail?.type }
    );

    //define out of stocks array
    let outofStockProducts = new Array();

    //defaine update data
    let updateData = new Object();
    let historyMessage = new Array();

    //validate date exist or not
    if (data?.date) {
      updateData.date = data.date;
      historyMessage.push(
        `Order Date Changed to ${DateTime.getDateTimeByUserProfileTimezone(
          data.date,
          await Request.getTimeZone()
        )}\n`
      );
    }

    if (data?.delivery_date) {
      updateData.delivery_date = data.delivery_date;
      historyMessage.push(
        `Order Delivery Date Changed to ${DateTime.getDateTimeByUserProfileTimezone(
          data.delivery_date,
          await Request.getTimeZone()
        )}\n`
      );
    }
    //validate location od exist or not
    if (Number.isNotNull(data?.storeId)) {
      if (Number.Get(data?.storeId) !== Number.Get(getOrderDetail?.store_id)) {
        updateData.store_id = data.storeId;
        let location = await locationService.getLocationDetails(
          data.storeId,
          companyId
        );
        historyMessage.push(`Order Location Changed to ${location?.name}\n`);
      }
    }

    //validate shift exist or not
    if (Number.isNotNull(data?.shift)) {
      if (Number.Get(data?.shift) !== Number.Get(getOrderDetail?.shift)) {
        updateData.shift = data.shift;
        let shiftData = await ShiftService.getShiftById(data?.shift, companyId);
        historyMessage.push(`Order Shift Changed to ${shiftData?.name}\n`);
      }
    }
    if (data?.cash || data?.cash == "") {
      updateData.cash_amount = data?.cash ? data?.cash : null;
      historyMessage.push(
        `Order Cash Amount Changed to ${Currency.GetFormattedCurrency(
          data?.cash
        )}\n`
      );
    }
    if (data?.upi || data?.upi == "") {
      updateData.upi_amount = data?.upi ? data?.upi : null;
      historyMessage.push(
        `Order Upi Amount Changed to ${Currency.GetFormattedCurrency(
          data?.upi
        )}\n`
      );
    }
    if (Number.isNotNull(data?.delivery_executive)) {
      updateData.delivery_executive = data?.delivery_executive;
      updateData.owner = data.delivery_executive;

      if (
        Number.Get(updateData.delivery_executive) !==
        Number.Get(getOrderDetail?.delivery_executive)
      ) {
        let userData = await UserService.get(
          data.delivery_executive,
          companyId
        );
        historyMessage.push(
          `Delivery Executive Changed to ${userData?.name}\n`
        );
      }
    }

    if (Number.isNotNull(data?.customer_account)) {
      updateData.customer_account = data.customer_account;
      let accountData = await AccountService.get(
        data.customer_account,
        companyId
      );
      historyMessage.push(`Customer Account Changed to ${accountData?.name}\n`);
    }
    if (Number.isNotNull(data?.status)) {
      if (Number.Get(data?.status) !== Number.Get(getOrderDetail?.status)) {
        updateData.status = data.status;

        //get the completed status
        let statusDetail = await statusService.getData(data?.status, companyId);

        historyMessage.push(`Order Status Changed to ${statusDetail?.name}\n`);
        //validate completed status exist or not
        if (
          statusDetail &&
          statusDetail.update_quantity == Status.UPDATE_QUANTITY_ENABLED
        ) {
          //update quantity in location product table
          outofStockProducts = await updateQuantity(orderId, companyId);

          //validate out of stock product exist or not
          if (outofStockProducts && outofStockProducts.length > 0) {
            //create system log
            historyMessage.push(`Out Of Stock" \n`);

            //return the response
            return res.json(BAD_REQUEST, {
              message: "Out Of Stock",
              outofStockProducts: outofStockProducts,
            });
          }
        }
      }
    }

    //validate payment type exist or not
    if (Number.isNotNull(data?.payment_type)) {
      updateData.payment_type = data.payment_type;
      let paymentType = orderPaymentTypeOptions.find(
        (value) => value.value == data.payment_type
      );

      historyMessage.push(
        `Order Payment Type Changed to ${paymentType?.label}\n`
      );
    }

    //validat sales executive userid exist or not
    if (Number.isNotNull(data?.sales_executive_user_id)) {
      if (
        Number.Get(data.sales_executive_user_id) !==
        Number.Get(getOrderDetail?.sales_executive_user_id)
      ) {
        updateData.sales_executive_user_id = data.sales_executive_user_id;
        updateData.owner = data.sales_executive_user_id;

        let userData = await UserService.get(
          data.sales_executive_user_id,
          companyId
        );

        historyMessage.push(`Sales Executive Changed to ${userData?.name}\n`);
      }
    }
    if (Number.isNotNull(data?.owner)) {
      if (Number.Get(data.owner) !== Number.Get(getOrderDetail?.owner)) {
        updateData.owner = data.owner;

        let userData = await UserService.get(data.owner, companyId);

        historyMessage.push(`Owner Changed to ${userData?.name}\n`);
      }
    }

    if (Number.isNotNull(data?.type)) {
      if (Number.Get(data.type) !== Number.Get(getOrderDetail?.type)) {
        updateData.type = data.type;
        let response = await OrderTypeService.get(data?.type, companyId);
        historyMessage.push(`Type Changed to ${response?.name}\n`);
      }
    }

    //validaet total amount exsit or not
    if (data?.total_amount >= 0) {
      updateData.total_amount = data.total_amount;
      historyMessage.push(
        `Order Total Amount Changed to ${data.total_amount}\n`
      );
    } //updaet the order

    if (status?.allow_cancel !== Status.ALLOW_CANCEL || hasPermission) {
      let orderDetail = await orderModel.update(updateData, {
        where: {
          id: orderId,
          company_id: companyId,
        },
        returning: true,
        plain: true,
      });

      if (orderDetail) {
        if (data?.storeId) {
          await orderProductService.updateOrderProductByOrderUpdate(
            orderId,
            companyId,
            "store_id",
            "store_id"
          );
          await locationProductService.updateStoreProductQtyIncreseDecreaseById(
            orderId,
            data.storeId,
            getOrderDetail?.store_id,
            companyId
          );
        }

        if (data?.date) {
          await orderProductService.updateOrderProductByOrderUpdate(
            orderId,
            companyId,
            "date",
            "order_date"
          );
        }

        if (data?.status) {
          orderProductService.updateStatus(orderId, companyId, data.status);
        }
      }

      res.json(OK, {
        message: "Order Updated Successfully",
      });

      //create a log for error
      res.on("finish", async () => {
        if (historyMessage && historyMessage.length > 0) {
          let message = historyMessage.join();
          History.create(`${message}`, req, ObjectName.ORDER, orderId);
        }
        if (Number.isNotNull(data?.status)) {
          const status = await statusService.getData(data?.status, companyId);
          if (
            status &&
            status?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED
          ) {
            orderDetail.timeZone = Request.getTimeZone(req);
            await sendOrderSlackNotification(getOrderDetail, status?.name);
          }
        }
      });
    } else {
      res.json(BAD_REQUEST, {
        message: "Contact your Admin to cancel the Order",
      });
    }
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
};

const get = async (req, res, next) => {
  const { id } = req.params;

  const company_id = Request.GetCompanyId(req);
  let timeZone = Request.getTimeZone(req);

  let locationDetails = [];
  try {
    let orderDetails = await getOrdersById(id, company_id);
    orderDetails = orderDetails.toJSON();
    let orderDate = DateTime.getDateTimeByUserProfileTimezone(
      orderDetails.date,
      timeZone
    );
    orderDetails.date = orderDate;

    let orderDeliveryDate = DateTime.getDateTimeByUserProfileTimezone(
      orderDetails.delivery_date,
      timeZone
    );
    orderDetails.delivery_date = orderDeliveryDate;

    const orderProducts = await orderProductService.getAllOrderProductByOrderId(
      id
    );
    const productDetails = [];
    for (let index = 0; index < orderProducts.rows.length; index++) {
      const product = await ProductService.getProductDetailsById(
        orderProducts.rows[index].product_id,
        company_id
      );
      product.quantity = orderProducts.rows[index]?.quantity;
      product.price = orderProducts.rows[index]?.price;
      product.unit_price = orderProducts.rows[index]?.unit_price;
      product.orderProductId = orderProducts.rows[index]?.id;
      product.productId = orderProducts.rows[index]?.product_id;
      product.productId = orderProducts.rows[index]?.product_id;
      product.BrandName = product.productBrandName;
      productDetails.push(product);
    }
    if (orderDetails.store_id)
      locationDetails = await locationService.isExistById(
        orderDetails.store_id
      );
    // API response
    res.json(OK, {
      data: orderDetails,
      orderProducts: orderProducts,
      productDetails: productDetails,
      locationDetails: locationDetails ? locationDetails : "",
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};

const getDraftCount = async (req, res, next) => {
  try {
    const companyId = Request.GetCompanyId(req);
    const userId = Request.getUserId(req);
    const { isCustomerRequest } = req.query;
    let status = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_DRAFT,
      companyId
    );
    let whereObj = { company_id: companyId, status: status?.id };
    if (isCustomerRequest) {
      whereObj.createdBy = userId;
    } else {
      whereObj.owner = userId;
    }
    let draftCount = await orderModel.findAll({
      where: whereObj,
    });
    res.json(OK, { draftCount: draftCount.length, draftCountList: draftCount });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};
const orderCount = async (params, group, hasPermission) => {
  try {
    let {
      search,
      type,
      location,
      shift,
      startDate,
      endDate,
      paymentType,
      orderId,
      companyId,
      userId,
      user,
      status,
      timeZone,
    } = params;
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate);
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate);

    const data = params;
    let where = {};

    where.company_id = companyId;
    if (data?.store_id) {
      where = { store_id: data.store_id };
    }

    if (status) {
      where.status = status;
    }

    if (user) {
      where.owner = user;
    }
    const name = data.name;
    if (name) {
      where.name = {
        $like: `%${name}%`,
      };
    }
    if (shift) {
      where.shift = shift;
    }
    if (type) {
      where.type = type;
    }
    if (!hasPermission) {
      if (userId) {
        where.owner = userId;
      }
    }
    if (location && parseInt(location)) {
      where.store_id = Number.Get(location);
    }
    if (startDate && !endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
        },
      };
    }
    if (endDate && !startDate) {
      where.date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date, timeZone),
          [Op.lte]: DateTime.toGMT(end_date, timeZone),
        },
      };
    }
    if (paymentType) {
      where.payment_type = paymentType;
    }
    if (group) {
      let statusValue = await statusService.Get(
        ObjectName.ORDER_TYPE,
        group,
        companyId
      );
      where.status = statusValue && statusValue?.id;
    }

    if (orderId !== undefined) {
      where.id = orderId;
    }
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      if (searchTerm && isNaN(parseFloat(searchTerm))) {
        where[Op.or] = [
          {
            "$location.name$": {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
      if (
        typeof parseFloat(searchTerm) == "number" &&
        !isNaN(parseFloat(searchTerm))
      ) {
        where[Op.or] = [
          {
            order_number: {
              [Op.eq]: searchTerm,
            },
          },
          {
            customer_phone_number: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
    }
    const include = [
      {
        required: false,
        model: Location,
        as: "location",
        attributes: ["id", "name"],
      },
      {
        required: false,
        model: Shift,
        as: "shiftDetail",
      },
      {
        model: User,
        as: "ownerDetail",
      },
      {
        model: User,
        as: "user",
        attributes: ["name"],
      },
      {
        required: false,
        model: statusModel,
        as: "statusDetail",
      },
    ];
    const query = {
      where,
      include,
    };

    let orderCount = await orderModel.count(query);
    return orderCount;
  } catch (err) {
    console.log(err);
  }
};

const del = async (req, res) => {
  let rolePermission = Request.getRolePermission(req);
  //validate permission exiist or not
  const hasPermission = await Permission.GetValueByName(
    Permission.ORDER_DELETE,
    rolePermission
  );

  try {
    //get company Id from request
    let orderId = req.params.id;

    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    //validate Order Id exist or not
    if (!orderId) {
      return res.json(400, { message: "Order Not Found" });
    }

    //delete Order
    await orderService.delete({
      where: { id: orderId, company_id: companyId },
    });

    await orderProductService.deleteByOrderId(orderId, companyId);

    res.on("finish", async () => {
      History.create("Order Deleted", req, ObjectName.ORDER, orderId);
    });

    res.json(200, { message: "Order Deleted Successfully" });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const data = req.body;
    const { id } = req.params;

    // Validate Delivery ID
    if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "id is required" });
    }

    let companyId = Request.GetCompanyId(req);

    // Update Delivery status
    let updateData = {};

    if (data?.status) updateData.status = data.status;

    const save = await orderService.update(updateData, {
      where: { id: id, company_id: companyId },
    });

    res.json(Response.UPDATE_SUCCESS, {
      message: "Delivery updated successfully",
    });

    // Log the update in the system logs
    res.on("finish", async () => {
      History.create(
        `Delivery Status updated`,
        req,
        ObjectName.DELIVERY,
        save.id
      );
    });
  } catch (err) {
    console.error(err);
    res.json(Response.BAD_REQUEST, {
      message: err.message,
    });
  }
};

const updateStatus = async (req, res, next) => {
  let companyId = Request.GetCompanyId(req);

  let data = req.body;
  console.debug("data--------------->>>", data)
  let { id } = req.params;
  console.debug("id--------------->>>", id)
  let company_id = Request.GetCompanyId(req);

  const orderDetails = await orderService.findOne({
    where: { company_id: companyId, id: id },
  });

  try {
    if (!id || !orderDetails) {
      return res.json(Response.BAD_REQUEST, {
        message: "Invalid Id",
      });
    }

    let updateData = {};
    if (data?.status) updateData.status = data.status;
    await orderService.update(updateData, {
      where: {
        id,
        company_id,
      },
    });

    const statusData = await statusServiceModal.findOne({
      where: { company_id: company_id, id: data.status },
    });

    // systemLog
    res.json(Response.OK, {
      message: ` Order  ${statusData?.name} Successfully`,
    });
    res.on("finish", async () => {
      //create system log for sale updation
      History.create(
        ` Order Status Changed to ${statusData?.name} `,
        req,
        ObjectName.ORDER,
        id
      );
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
};

const getBySelectedIds = async (req, res) => {
  const { orderIds } = req.params;

  const company_id = Request.GetCompanyId(req);
  let selectedOrderIds = orderIds && orderIds.split(",");

  if (!selectedOrderIds || selectedOrderIds.length === 0) {
    return res.json(400, { message: "Select Order" });
  }

  try {
    let responseData = [];
    for (let i = 0; i < selectedOrderIds.length; i++) {
      let orderId = selectedOrderIds[i];
      let orderDetails = await getOrdersById(orderId, company_id);
      let orderProducts = await orderProductService.getAllOrderProductByOrderId(
        orderId
      );
      let productDetails = [];
      for (let index = 0; index < orderProducts.rows.length; index++) {
        let product = await ProductService.getProductDetailsById(
          orderProducts.rows[index].product_id,
          company_id
        );
        if (product) {
          product.quantity = orderProducts.rows[index]?.quantity || null;
          product.price = orderProducts.rows[index]?.price || null;
          product.unit_price = orderProducts.rows[index]?.unit_price || null;
          product.orderProductId = orderProducts.rows[index]?.id || null;
          product.productId = orderProducts.rows[index]?.product_id || null;
          product.productId = orderProducts.rows[index]?.product_id || null;
          product.BrandName = product.productBrandName;
          productDetails.push(product);
        } else {
          console.log(
            `Product with ID ${orderProducts.rows[index].product_id} not found.`
          );
        }
      }
      responseData.push({
        orderDetails: orderDetails,
        orderProducts: orderProducts,
        productDetails: productDetails,
      });
    }

    // API response after the loop
    res.json(200, { data: responseData });
  } catch (err) {
    console.log(err);
    res.json(400, { message: err.message });
  }
};

const bulkUpdate = async (req, res, next) => {
  try {
    const { id, date, location, shift, owner, paymentType, type } = req.params;

    const { orderIds } = req.body;

    let companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(400, { message: "company_id Not Found" });
    }

    if (!orderIds) {
      return res.json(400, { message: "Select Order" });
    }

    let selectedOrderIds = orderIds.split(",");

    if (selectedOrderIds && selectedOrderIds.length > 0) {
      for (let i = 0; i < selectedOrderIds.length; i++) {
        let orderId = selectedOrderIds[i];

        let getOrderDetail = await getOrdersById(orderId, companyId);
        let updateData = {};

        if (date) {
          updateData.date = date;
        }
        if (location) {
          updateData.store_id = location;
        }
        if (shift) {
          updateData.shift = shift;
        }
        if (owner) {
          updateData.owner = owner;
        }
        if (type) {
          updateData.type = type;
        }
        if (paymentType) {
          updateData.payment_type = paymentType;
        }

        if (Number.isNotNull(location)) {
          await locationProductService.updateStoreProductQtyIncreseDecreaseById(
            orderId,
            location,
            getOrderDetail?.store_id,
            companyId
          );
          await orderProduct.update(
            { store_id: location },
            {
              where: {
                order_id: orderId,
                company_id: companyId,
              },
            }
          );
        }

        await orderModel.update(updateData, {
          where: {
            id: orderId,
            company_id: companyId,
          },
        });
      }
    }
    res.json(Response.OK, {
      message: "Order Updated Successfully",
    });
  } catch (err) {
    console.log(err);
  }
};

const completeOrder = async (orderId, body, companyId, userId) => {
  try {
    if (!orderId) {
      throw { message: "Order Id Is Required" };
    }

    if (body && !body.payment_type) {
      throw { message: "Payment Type Is Required" };
    }

    let orderDetail = await orderService.findOne({
      where: {
        id: orderId,
        company_id: companyId,
      },
    });

    if (!orderDetail) {
      throw { message: "Order Not Found" };
    }

    const orderCompletedStatus = await statusService.Get(
      ObjectName.ORDER_TYPE,
      Status.GROUP_COMPLETED,
      companyId,
      { object_id: orderDetail?.type }
    );

    let req = { user: {} };

    req.user.company_id = companyId;

    req.user.id = userId;

    History.create(
      `order complete status ${orderCompletedStatus?.name} orderType : ${orderDetail?.type}`,
      req,
      ObjectName.ORDER,
      orderId
    );

    let historyMessage = new Array();

    let updateData = new Object();

    if (!orderCompletedStatus) {
      throw { message: "Completed Status Not Found" };
    }

    if (body.cash) {
      updateData.cash_amount = body.cash;
      historyMessage.push(
        `Order Cash Updated To ${Currency.GetFormattedCurrency(body.cash)}\n`
      );
    }
    if (body.upi) {
      updateData.upi_amount = body.upi;
      historyMessage.push(
        `Order Upi Updated To ${Currency.GetFormattedCurrency(body.upi)}\n`
      );
    }
    if (Number.isNotNull(body.customer_account)) {
      let isExist = await AccountService.get(body.customer_account, companyId);
      if (isExist) {
        updateData.customer_account = body.customer_account;
        historyMessage.push(`Customer Updated To ${isExist?.name}\n`);
      }
    }
    if (body.payment_type) {
      updateData.payment_type = body.payment_type;
      let payment_type_text;
      if (body.payment_type == Order.PAYMENT_TYPE_UPI_VALUE) {
        payment_type_text = Order.PAYMENT_TYPE_UPI_TEXT;
      } else if (body.payment_type == Order.PAYMENT_TYPE_CASH_VALUE) {
        payment_type_text = Order.PAYMENT_TYPE_CASH_TEXT;
      } else if (body.payment_type == Order.PAYMENT_TYPE_MIXED_VALUE) {
        payment_type_text = Order.PAYMENT_TYPE_MIXED_TEXT;
      }
      historyMessage.push(`Payment Type Updated To ${payment_type_text}\n`);
    }

    if (orderDetail?.status !== orderCompletedStatus.id) {
      updateData.status = orderCompletedStatus.id;
      historyMessage.push(
        `Order Status Changed to ${orderCompletedStatus?.name}\n`
      );
    }
    await orderService.update(updateData, {
      where: {
        id: orderId,
        company_id: companyId,
      },
    });

    //validate completed status exist or not
    if (
      orderCompletedStatus &&
      orderCompletedStatus.update_quantity == Status.UPDATE_QUANTITY_ENABLED
    ) {
      //define out of stocks array
      let outofStockProducts = new Array();

      //update quantity in location product table
      outofStockProducts = await updateQuantity(orderId, companyId);

      //validate out of stock product exist or not
      if (outofStockProducts && outofStockProducts.length > 0) {
        historyMessage.push(`Out Of Stock \n`);

        throw {
          message: "Out Of Stock",
          outofStockProducts: outofStockProducts,
        };
      }
    }

    await orderProductService.updateStatus(
      orderId,
      companyId,
      orderCompletedStatus.id
    );

    return { orderDetail, orderCompletedStatus, historyMessage };
  } catch (err) {
    console.log(err);
    throw { message: err.message };
  }
};

const getOrderGenerationNumber = async (storeId, companyId) => {
  try {
    //Location Wise.
    let nextLocationOrderNumber;

    let formatedNextOrderNumber;

    //Company Wise
    let nextCompanyOrderNumber;

    let settingData = await getSettingList(companyId);

    let settingList = [];

    for (let i = 0; i < settingData.length; i++) {
      settingList.push(settingData[i]);
    }

    let orderNumberGeneration = await getValueByObject(
      Setting.SETTING_ORDER_NUMBER_GENERATION,
      settingList
    );

    if (
      orderNumberGeneration &&
      orderNumberGeneration === Order.ORDER_NUMBER_GENERATION_TYPE_LOCATION_WISE
    ) {
      let storeDetail = await Location.findOne({
        where: { company_id: companyId, id: storeId },
      });

      let lastOrderNumber = storeDetail && storeDetail.get("last_order_number");

      nextLocationOrderNumber =
        lastOrderNumber && lastOrderNumber !== ""
          ? parseInt(lastOrderNumber)
          : 0;

      nextLocationOrderNumber += 1;

      if (storeDetail?.location_code != null) {
        formatedNextOrderNumber = `${storeDetail?.location_code}-${nextLocationOrderNumber}`;
      } else {
        formatedNextOrderNumber = `${nextLocationOrderNumber}`;
      }
    } else {
      let lastOrderNumber = await getValueByObject(
        Setting.SETTING_LAST_ORDER_NUMBER,
        settingList
      );

      let orderCode = await getValueByObject(Setting.ORDER_CODE, settingList);

      nextCompanyOrderNumber =
        lastOrderNumber && lastOrderNumber !== ""
          ? parseInt(lastOrderNumber)
          : 0;

      nextCompanyOrderNumber += 1;
      if (orderCode != "") {
        formatedNextOrderNumber = `${orderCode}-${nextCompanyOrderNumber}`;
      } else {
        formatedNextOrderNumber = `${nextCompanyOrderNumber}`;
      }
    }

    return formatedNextOrderNumber;
  } catch (err) {
    console.log(err);
  }
};

const calculateProfitAmount = (costPrice, salePrice, quantity) => {
  try {
    if (costPrice && salePrice) {
      let netProfitAmont;

      let profitAmount = Number.Subtraction(salePrice, costPrice);

      if (profitAmount) {
        netProfitAmont = quantity
          ? Number.Multiply(profitAmount, quantity)
          : profitAmount;
      }

      return netProfitAmont;
    }
    return null;
  } catch (err) {
    console.log(err);
  }
};

const bulkOrder = async (orderObject, orderProductList, userId, companyId) => {
  try {
    if (!orderObject) {
      throw { message: "Order Is Required" };
    }

    if (orderProductList && orderProductList.length == 0) {
      throw { message: "Order Products Is Required" };
    }

    const shift = await AttendanceService.GetShift(
      userId,
      new Date(),
      companyId
    );

    let formatedNextOrderNumber = await getOrderGenerationNumber(
      orderObject.storeId,
      companyId
    );

    let OrderTypeId = await OrderTypeService.getOrderTypeId(
      companyId,
      orderObject?.type == Order.TYPE_DELIVERY
        ? Order.TYPE_DELIVERY
        : Order.TYPE_STORE
    );

    const orderData = {
      store_id: Number.Get(orderObject.storeId),
      date: new Date(),
      order_number: formatedNextOrderNumber,
      company_id: companyId,
      status: await statusService.getFirstStatus(
        ObjectName.ORDER_TYPE,
        companyId,
        null,
        OrderTypeId
      ),
      shift: Number.Get(shift),
      createdBy: Number.Get(userId),
      type: OrderTypeId && OrderTypeId[0],
      customer_account: Number.Get(orderObject.customerAccount),
      total_amount: orderObject.totalAmount,
      owner: Number.Get(userId),
    };

    let orderDetail = await orderModel.create(orderData);

    if (orderDetail) {
      for (let i = 0; i < orderProductList.length; i++) {
        const createData = {
          product_id: orderProductList[i].productId,
          store_id: Number.Get(orderDetail.storeId),
          order_id: orderDetail.id,
          quantity: orderProductList[i].quantity,
          unit_price: Number.GetFloat(orderProductList[i].sale_price),
          order_date: orderDetail?.date,
          price: orderProductList[i].quantity
            ? Number.Multiply(
                orderProductList[i].sale_price,
                orderProductList[i].quantity
              )
            : orderProductList[i].sale_price,
          company_id: companyId,
          status: await statusService.getFirstStatus(
            ObjectName.ORDER_PRODUCT,
            companyId
          ),
          cost_price: Number.GetFloat(orderProductList[i].cost),
          profit_amount: calculateProfitAmount(
            orderProductList[i].cost,
            orderProductList[i].sale_price,
            orderProductList[i].quantity
          ),
          mrp: Number.GetFloat(orderProductList[i].mrp),
          order_number: orderDetail.order_number,
        };
        await orderProduct.create(createData);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const sendOrderSlackNotification = async (orderDetail, status) => {
  try {
    let params = {
      object_id: orderDetail?.customer_account,
      company_id: orderDetail?.company_id,
      object_name: ObjectName.CUSTOMER,
    };

    let addressDetail = await AddressService.get(params);
    let OrderProductList = await orderProduct.findAll({
      include: [
        {
          required: true,
          model: productIndex,
          as: "productIndex",
        },
      ],
      where: {
        order_id: orderDetail?.id,
        company_id: orderDetail?.company_id,
      },
    });

    let blocks = [];

    if (OrderProductList && OrderProductList.length > 0) {
      for (let i = 0; i < Math.min(OrderProductList.length, 48); i++) {
        const { productIndex, quantity } = OrderProductList[i];

        blocks.push({
          type: "section",
          block_id: `block${i}`,
          text: {
            type: "mrkdwn",
            text: `${i === 0 ? "*Product Details:*" : ""}\n${
              productIndex?.brand_name
            } - ${
              productIndex?.product_name
            } - Quantity: ${quantity}\n${Currency.GetFormattedCurrency(
              productIndex?.sale_price
            )}`,
          },
          accessory: {
            type: "image",
            image_url: `${
              productIndex?.featured_media_url
                ? productIndex?.featured_media_url
                : "noImage.jpg"
            }`,
            alt_text: "Product Image",
          },
        });

        // Add a divider between product blocks
        if (i < Math.min(OrderProductList.length, 48) - 1) {
          blocks.push({ type: "divider" });
        }
      }
    }

    let customerDetail = null;
    if (addressDetail) {
      customerDetail = `*Customer Details:*\n${
        addressDetail?.name ? addressDetail?.name : ""
      }${addressDetail?.name && addressDetail?.phone_number ? "," : ""}${
        addressDetail?.phone_number ? "\n" + addressDetail?.phone_number : ""
      }${
        (addressDetail?.name || addressDetail?.phone_number) &&
        addressDetail?.address1
          ? ","
          : ""
      }${addressDetail?.address1 ? "\n" + addressDetail?.address1 : ""}${
        addressDetail?.address1 && addressDetail?.address2 ? "," : ""
      }${addressDetail?.address2 ? "\n" + addressDetail?.address2 : ""}`;
    }

    const getSlackId = await UserService.getSlack(
      orderDetail?.owner,
      orderDetail?.company_id
    );

    const orderDetailRedirectingUrl = `${config.defaultPortalUrl}/order/${orderDetail?.id}`;

    let param = {
      companyId: orderDetail?.company_id,
      slackUserId: getSlackId?.slack_id,
      latitude: addressDetail?.latitude,
      longitude: addressDetail?.longitude,
      headerText:
        orderDetail?.type === Order.TYPE_DELIVERY
          ? "Delivery Order"
          : "Store Order",
      orderDetail: `*Order Number:* <${orderDetailRedirectingUrl}|*${
        orderDetail?.order_number
      }*> , ${DateTime.getDateTimeByUserProfileTimezone(
        orderDetail.date,
        orderDetail?.timeZone
      )}\n*Order Type:* ${
        orderDetail?.type === Order.TYPE_DELIVERY ? "Delivery" : "Store"
      }\n*Status:* ${status}`,
    };

    // Send the order message to Slack
    SlackService.sendOrderMessageToUser(param, [...blocks], customerDetail);
  } catch (err) {
    console.log(err);
  }
};

const getCashAndUpiTotalAmount = async (params) => {
  try {
    let whereClause = "";

    if (params?.startDate) {
      whereClause += ` AND "order"."date" >= '${params?.startDate}'`;
    }

    if (params?.endDate) {
      whereClause += ` AND "order"."date" <= '${params?.endDate}'`;
    }

    if (params?.location) {
      whereClause += ` AND "order"."store_id" = ${params?.location}`;
    }

    if (params?.status && Array.isArray(params.status)) {
      // If status is an array, use the IN clause
      whereClause += ` AND "order"."status" IN (${params.status.join(", ")})`;
    } else if (Number.isNotNull(params?.status)) {
      // If it's a single status, use the equal sign
      whereClause += ` AND "order"."status" = ${params?.status}`;
    }

    if (params?.shift) {
      whereClause += ` AND "order"."shift" = ${params?.shift}`;
    }

    if (params?.paymentType) {
      whereClause += ` AND "order"."payment_type" = ${params?.paymentType}`;
    }

    if (params?.type) {
      if (Array.isArray(params.type) && params.type.length > 0) {
        // If it's a non-empty array, use the IN clause
        whereClause += ` AND "order"."type" IN (${params.type.join(",")})`;
      } else if (
        typeof params.type === "number" ||
        typeof params.type === "string"
      ) {
        // If it's a single value (number or string), treat it as a single item
        whereClause += ` AND "order"."type" = ${params.type}`;
      }
    }
    if (params?.user) {
      whereClause += ` AND "order"."owner" = ${params?.user}`;
    }

    if (params?.searchTerm && isNaN(params?.searchTerm)) {
      whereClause += ` AND ("store"."name" ILIKE '%${params?.searchTerm}%' OR "order"."order_number" ILIKE '%${params?.searchTerm}%')`;
    } else if (params?.searchTerm && !isNaN(params?.searchTerm)) {
      whereClause += ` AND "order"."order_number" = '${params?.searchTerm}'`;
    }

    let draftOrderStatus = await statusService.getAllStatusByGroupId(
      ObjectName.ORDER_TYPE,
      Status.GROUP_DRAFT,
      params?.companyId,
      null,
      { object_id: params && params?.type ? params?.type : null }
    );

    let draftOrderStatusIds =
      Array.isArray(draftOrderStatus) && draftOrderStatus.length > 0
        ? draftOrderStatus.map((data) => data?.id)
        : [];

    const rawQuery = `
      SELECT COALESCE(SUM("order"."total_amount"), 0) AS "totalAmount",
             COALESCE(SUM("order"."cash_amount"), 0) AS "totalCashAmount",
             COALESCE(SUM("order"."upi_amount"), 0) AS "totalUpiAmount",
             COALESCE(SUM(CASE
               WHEN ("order"."cash_amount" IS NULL OR "order"."cash_amount" = 0) 
                          AND ("order"."upi_amount" IS NULL OR "order"."upi_amount" = 0)  AND ("order"."status" IN (${
                            draftOrderStatusIds.length
                              ? draftOrderStatusIds.join(",")
                              : "NULL"
                          })) 
               THEN "order"."total_amount"
               ELSE 0
           END), 0) AS "totalDraftAmount"
      FROM "order"
      LEFT JOIN "user" ON "order"."owner" = "user"."id"
      LEFT JOIN "store" ON "order"."store_id" = "store"."id"
      WHERE "order"."company_id" = ${params?.companyId}
      AND "order"."deletedAt" IS NULL
      ${whereClause}
      ;`;

    const totalAmountResult = await db.connection.query(rawQuery, {
      type: QueryTypes.SELECT,
    });

    return {
      totalAmount: totalAmountResult && totalAmountResult[0]?.totalAmount,
      totalCashAmount:
        totalAmountResult && totalAmountResult[0]?.totalCashAmount,
      totalUpiAmount: totalAmountResult && totalAmountResult[0]?.totalUpiAmount,
      totalDraftAmount:
        totalAmountResult && totalAmountResult[0]?.totalDraftAmount,
    };
  } catch (err) {
    console.log(err);
  }
};

const cancel = async (req, res, next) => {
  let orderId = req && req.params && req.params.id;

  let reason = req.body.notes;

  if (!orderId) {
    return res.json(Response.BAD_REQUEST, { message: "Order Id Required" });
  }

  let companyId = Request.GetCompanyId(req);

  if (!companyId) {
    return res.json(Response.BAD_REQUEST, { message: "company Id Required" });
  }

  let reasonDetails = await orderModel.findOne({
    where: { id: orderId, company_id: companyId, reason: { [Op.eq]: null } },
  });

  if (!reason && reasonDetails) {
    return res.json(Response.BAD_REQUEST, { message: "Enter The Reason" });
  }

  const cancelledOrderStatusId = await statusService.Get(
    ObjectName.ORDER_TYPE,
    Status.GROUP_CANCELLED,
    companyId
  );

  if (!cancelledOrderStatusId) {
    return res.json(Response.BAD_REQUEST, {
      message: "Cancel Status Required",
    });
  }

  const cancelledOrderProductStatusId = await statusService.Get(
    ObjectName.ORDER_PRODUCT,
    Status.GROUP_CANCELLED,
    companyId
  );

  let updateData = {
    cancelled_at: new Date(),
    status: cancelledOrderStatusId?.id,
    reason: req?.body?.notes,
  };

  let orderResponse = await orderService.update(updateData, {
    where: {
      id: orderId,
      company_id: companyId,
    },
  });

  if (orderResponse) {
    await orderProductModelService.update(
      {
        status:
          cancelledOrderProductStatusId && cancelledOrderProductStatusId?.id,
      },
      { where: { order_id: orderId, company_id: companyId } }
    );
  }
  res.json(Response.OK, { message: "Order Cancelled" });
  res.on("finish", async () => {
    History.create("Order Cancelled", req, ObjectName.ORDER, orderId);
  });
};

const sendNotification = async (req, res) => {
  const { orderId } = req && req.body;

  const companyId = Request.GetCompanyId(req);

  let getOrderDetail = await getOrdersById(orderId, companyId);

  const status = getOrderDetail && getOrderDetail?.statusDetail;

  if (Number.isNotNull(status)) {
    const statusDetail = await statusService.getData(status?.id, companyId);

    if (
      statusDetail &&
      statusDetail?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED
    ) {
      const timeZone = Request.getTimeZone(req);
      await sendOrderSlackNotification(getOrderDetail, status?.name);

      return res.json(Response.OK, {
        message: "Slack Notification sent successfully",
      });
    }
  }

  return res.json(Response.OK, {
    message: "No notification sent as the status does not require it.",
  });
};

const verifyUpiPaymentScreenshot = async (params) => {
  let { startDate, endDate, companyId } = params;
  let where = {};
  if (startDate && endDate) {
    where.date = {
      [Op.and]: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
  }

  let query = {
    where: {
      company_id: companyId,
      upi_amount: {
        [Op.gt]: 0,
      },
      upi_payment_verified: null,
      ...where,
    },
    attributes: ["id"],
  };

  let orderList = await orderService.find(query);
  if (ArrayList.isArray(orderList)) {
    const mediaDetails = await Media.findAll({
      where: {
        object_name: ObjectName.ORDER,
        object_id: { [Op.in]: orderList.map((order) => order?.id) },
      },
      attributes: ["id", "file_name", "object_name", "object_id", "visibility"],
    });

    const mediaGroupedByOrder =
      (ArrayList.isArray(mediaDetails) &&
        mediaDetails.reduce((acc, media) => {
          if (!acc[media.object_id]) {
            acc[media.object_id] = [];
          }
          const media_url = MediaServices.getMediaUrlsByMediaId(
            media.id,
            media.file_name,
            media.visibility
          );
          acc[media.object_id].push(media_url);
          return acc;
        }, {})) ||
      [];

    for (let i = 0; i < orderList.length; i++) {
      const { id } = orderList[i];

      let mediaUrl =
        Number.isNotNull(mediaGroupedByOrder[id]) && mediaGroupedByOrder[id][0];
      if (mediaUrl) {
        let convertedText = await MediaServices.extractTextFromImage(mediaUrl);
        const result = String.checkForNameInText(
          convertedText,
          Order.VERIFIED_UPI_PAYMENT_COMPANY_NAME
        );
        if (result) {
          await orderService.update(
            { upi_payment_verified: Order.UPI_PAYMENT_VERIFIED },
            {
              where: {
                id: id,
                company_id: companyId,
              },
            }
          );
        } else {
          await orderService.update(
            { upi_payment_verified: Order.UPI_PAYMENT_NOT_VERIFIED },
            {
              where: {
                id: id,
                company_id: companyId,
              },
            }
          );
        }
      } else {
        await orderService.update(
          { upi_payment_verified: Order.UPI_PAYMENT_NOT_VERIFIED },
          {
            where: {
              id: id,
              company_id: companyId,
            },
          }
        );
      }
    }
  }
};

module.exports = {
  isExistById,
  getStoreOrders,
  getOrdersById,
  importOrders,
  createOrder,
  searchOrder,
  deleteOrder,
  create,
  update,
  get,
  del,
  updateStatus,
  updateDeliveryStatus,
  bulkUpdate,
  getBySelectedIds,
  completeOrder,
  getDraftCount,
  orderCount,
  bulkOrder,
  getTotalAmount,
  getCashAndUpiTotalAmount,
  sendOrderSlackNotification,
  getOrderAmountByShift,
  cancel,
  verifyUpiPaymentScreenshot,
  sendNotification,
};
