const ObjectName = require("../helpers/ObjectName");
const Permission = require("../helpers/Permission");
const { BAD_REQUEST, OK } = require("../helpers/Response");
const Request = require("../lib/request");
const History = require("./HistoryService");
const errors = require("restify-errors");
const validator = require("../lib/validator");
const Date = require("../lib/dateTime")
const Currency = require("../lib/currency");
const Number = require("../lib/Number");
const DataBaseService = require("../lib/dataBaseService");

const { SaleSettlement, Location, User, Shift, status: statusModel, FineBonus, Tag, order, ProjectTicketType } = require("../db").models;
const { Op, Sequelize, fn, col, QueryTypes } = require('sequelize');
const DateTime = require("../lib/dateTime");
const Boolean = require("../lib/Boolean");
const { getSettingValue, getSettingList } = require("./SettingService");
const StatusService = require("./StatusService");
const Setting = require("../helpers/Setting");
const { fineService } = require("./FineBonusService");
const Status = require("../helpers/Status");
const orderService = require("../services/OrderService");
const TagService = require("./TagService");
const CurrencyDenominationService = require("./CurrencyDenominationService");
const Response = require("../helpers/Response");
const SaleSettlementNotification = require("./notifications/SaleSettlement");
const LocationService = require("./LocationService");
const ShiftService = require("./ShiftService");
const db = require("../db");
const ObjectHelper = require("../helpers/ObjectHelper");
const UserService = require("./UserService");
const TicketService = require("../services/TicketService");
const { getValueByObject } = require("./ValidationService");

const statusService = new DataBaseService(statusModel);
const locationService = new DataBaseService(Location);

const create = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_ADD, req);

  let currentLocationId = Request.getCurrentLocationId(req);

  const manageOthers = await Permission.Has(Permission.SALE_SETTLEMENT_MANAGE_OTHERS, req);

  let permission = manageOthers ? false : (hasPermission && currentLocationId) ? false : true;

  let historyMessage = new Array();

  const currentShift = Request.getCurrentShiftId(req);

  try {
    const company_id = Request.GetCompanyId(req);

    const userId = Request.getUserId(req);
    const roleId = Request.getUserRole(req)
    let data = req.body;

    const saleExist = await SaleSettlement.findOne({
      where: {
        store_id: data.storeId,
        date: data.date,
        company_id,
        shift: (data && data?.shift) ? Number.Get(data?.shift) : Number.Get(currentShift)
      },
    });
    if (saleExist) {
      History.create(`Sales Settlement#${saleExist?.id}  Already Exists`, req, ObjectName.SALE_SETTLEMENT, saleExist.id);
      return res.json(BAD_REQUEST, {
        message: "Sales Entry Already Exists"
      });
    }

    let start_date = DateTime.toGetISOStringWithDayStartTime(data && data?.date)
    let end_date = DateTime.toGetISOStringWithDayEndTime(data && data?.date)
    const timeZone = Request.getTimeZone(req)

    let params;
    params = {
      startDate: start_date,
      endDate: end_date,
      companyId: company_id,
      timeZone: timeZone,
      storeId: data && data.storeId
    };
    if (data && data?.shift) {
      params.shift = Number.Get(data.shift);
    } else {
      params.shift = Number.Get(currentShift);
    }
    if (data && data.salesExecutive) {
      params.userId = Number.Get(data.salesExecutive);
    } else {
      params.userId = Number.Get(userId);
    }
    let draftStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_DRAFT, company_id);

    let completeStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_COMPLETED, company_id);

    const orderDetails = await orderService.getOrderAmountByShift(params);
    let draftOrder = orderDetails && orderDetails.length > 0 ? orderDetails.find(value => value.status == draftStatus?.id) : 0

    let completeOrder = orderDetails && orderDetails.length > 0 ? orderDetails.find(value => value.status == completeStatus?.id) : 0
    // Create Data

    let query = {
      order: [["createdAt", "DESC"]],
      where: {
        company_id,
      },
      attributes: ["sale_settlement_number"],
    };

    const status = await StatusService.getFirstStatusDetail(ObjectName.SALE_SETTLEMENT, company_id);

    let SaleData = await SaleSettlement.findOne(query);

    let SaleNumber;
    let SaleNumberData = SaleData && SaleData.get("sale_settlement_number");

    if (!SaleNumberData) {
      SaleNumber = 1;
    } else {
      SaleNumber = SaleNumberData + 1;
    }

    let createData = {};

    createData.store_id = Number.Get(data.storeId);
    createData.date = data.date;
    createData.amount_cash = Currency.Get(data.amount_cash);
    createData.amount_upi = Currency.Get(data.amount_upi);
    createData.company_id = company_id;
    createData.status = Number.Get(status?.id);
    createData.sale_settlement_number = SaleNumber;
    createData.notes = data.notes;
    (createData.order_cash_amount = completeOrder && Currency.Get(completeOrder?.total_cash_amount)),
      (createData.order_upi_amount = completeOrder && Currency.Get(completeOrder?.total_upi_amount)),
      (createData.order_total_amount = completeOrder && (Number.Get(completeOrder?.total_cash_amount)) + Number.Get(completeOrder?.total_upi_amount)),
      (createData.draft_order_amount = draftOrder && Currency.Get(draftOrder?.total_amount)),
      (createData.total_amount = Currency.Get(data.total_amount));
    createData.cash_in_store = Currency.Get(data.cash_in_store);
    createData.cash_to_office = Currency.Get(data.cash_to_office);
    createData.owner_id = Number.Get(userId);
    createData.due_date = status && status?.due_date ? status?.due_date : data?.due_date ? data?.due_date : null;
    createData.reviewer = data?.reviewer ? Number.Get(data?.reviewer) : Number.Get(status?.default_reviewer) || null;
    createData.discrepancy_amount_cash = completeOrder && (Number.GetFloat(data.amount_cash) - Number.GetFloat(completeOrder?.total_cash_amount)),
      createData.discrepancy_amount_upi = completeOrder && (Number.GetFloat(data.amount_upi) - Number.GetFloat(completeOrder?.total_upi_amount))
    createData.total_discrepancy_amount = (Number.GetFloat(createData.discrepancy_amount_cash) + Number.GetFloat(createData.discrepancy_amount_upi))

    let locationDetail = await Location.findOne({
      where: { id: Number.Get(data.storeId) },
    });

    let userDetail = await User.findOne({
      where: { id: Number.Get(userId) },
    });

    let shiftDetail = await Shift.findOne({
      where: { id: data && data?.shift ? Number.Get(data?.shift) : Number.Get(currentShift) },
    });

    let userName = (userDetail.name ? userDetail.name : '') + ' ' + (userDetail.last_name ? userDetail.last_name : '');

    //validate salesexecutive exist or not
    if (data && data.shift) {
      createData.shift = Number.Get(data.shift);
    } else {
      createData.shift = Number.Get(currentShift);
    }
    if (data.salesExecutive) {
      createData.sales_executive = Number.Get(data.salesExecutive);
    } else {
      createData.sales_executive = Number.Get(userId);
    }

    const saleSettlement = await SaleSettlement.create(createData);

    await createLocaltionCashAmountMissingFine(saleSettlement, company_id, req);
    let completedStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_COMPLETED, company_id);

    await createOrderCashAmountMissingFine(saleSettlement, company_id, completedStatus?.id, req);
    await createOrderUpiAmountMissingFine(saleSettlement, timeZone, company_id, completedStatus?.id, req);
    if (saleSettlement && Number.Get(saleSettlement?.draft_order_amount) > 0) {
      await createDraftAmountMissingFine(saleSettlement, company_id, req);
    }

    if(saleSettlement && saleSettlement?.id){

      let settingArray = [];
      let settingList = await getSettingList(company_id);
    
      for (let i = 0; i < settingList.length; i++) {
        settingArray.push(settingList[i]);
      }
    
  
    let isEnableOrderCashAmountFineEnquiryTicket = await getValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_ORDER_CASH_AMOUNT_MISSING,
      settingArray,
      roleId,
      ObjectName.ROLE
    );

    let isEnableOrderUpiAmountFineEnquiryTicket = await getValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_ORDER_UPI_AMOUNT_MISSING,
      settingArray,
      roleId,
      ObjectName.ROLE
    );

 
    let isEnableLocationCashAmountFineEnquiryTicket = await getValueByObject(
      Setting.ENQUIRY_TICKET_CREATE_FOR_LOCATION_CASH_AMOUNT_MISSING,
      settingArray,
      roleId,
      ObjectName.ROLE
    );


    if (isEnableLocationCashAmountFineEnquiryTicket && isEnableLocationCashAmountFineEnquiryTicket == "true") {
      await TicketService.createLocationCashAmountFineEnquiryTicket({ SsValue:saleSettlement, locationData:locationDetail, shiftData:shiftDetail, userData:userDetail, companyId:company_id, req,completedStatus: completedStatus?.id, timeZone })
    }

    if (isEnableOrderCashAmountFineEnquiryTicket && isEnableOrderCashAmountFineEnquiryTicket == "true") {
      await  TicketService.createOrderCashAmountMissingFineEnquiryTicket({ SsValue:saleSettlement, locationData:locationDetail, shiftData:shiftDetail, userData:userDetail, companyId:company_id, req,completedStatus: completedStatus?.id, timeZone })
    }

    if (isEnableOrderUpiAmountFineEnquiryTicket && isEnableOrderUpiAmountFineEnquiryTicket == "true") {
      await  TicketService.createOrderUpiAmountMissingFineEnquiryTicket({ SsValue:saleSettlement, locationData:locationDetail, shiftData:shiftDetail, userData:userDetail, companyId:company_id, req,completedStatus: completedStatus?.id, timeZone })
    }
  }
    let param = {
      startDate: DateTime.toGetISOStringWithDayStartTime(saleSettlement?.date),
      endDate: DateTime.toGetISOStringWithDayEndTime(saleSettlement?.date),
      location: Number.Get(saleSettlement?.store_id),
      shift: Number.Get(saleSettlement?.shift),
      user: Number.Get(saleSettlement?.sales_executive),
      timeZone: timeZone,
      companyId: company_id
    }
    let orderData = await orderService.getCashAndUpiTotalAmount(param);
    let orderCashMismatch = 0
    let orderUpiMismatch = 0
    let storeAmountMismatch = 0

    if (Number.Get(data?.amount_cash) < Number.Get(orderData?.totalCashAmount)) {
      orderCashMismatch = Number.Get(orderData?.totalCashAmount) - Number.Get(data?.amount_cash)
    }

    if (Number.Get(data?.amount_upi) < Number.Get(orderData?.totalUpiAmount)) {
      orderUpiMismatch = Number.Get(orderData?.totalUpiAmount) - Number.Get(data?.amount_upi)
    }
    let getStoreDetail = await Location.findOne({ where: { id: saleSettlement?.store_id, company_id: company_id } });

    if (Number.Get(saleSettlement?.cash_in_store) < Number.Get(getStoreDetail?.cash_in_location)) {
      storeAmountMismatch = Number.Get(getStoreDetail?.cash_in_location) - Number.Get(data?.cash_in_store);
    }

    await locationService.update(
      {
        cash_in_location: Currency.Get(data.cash_in_store),
      },
      {
        where: {
          id: Number.Get(data.storeId),
          company_id: company_id,
        },
      }
    );


    if (createData?.sale_settlement_number) {
      historyMessage.push(`Sales Settlement Number: ${createData.sale_settlement_number}\n`);
    }

    if (createData.store_id) {
      historyMessage.push(`Store Name: ${locationDetail?.name}\n`);
    }

    if (createData.date) {
      historyMessage.push(`Date:${DateTime.shortMonthDate(createData.date)}\n`);
    }

    if (createData.shift) {
      historyMessage.push(`Shift: ${shiftDetail.name}\n`);
    }

    if (createData.owner_id) {
      historyMessage.push(`Sales Settlement Created By: ${userName}\n`);
    }

    if (createData.amount_cash) {
      historyMessage.push(`Cash Amount: ${Currency.IndianFormat(createData.amount_cash)}\n`);
    }

    if (createData.amount_upi) {
      historyMessage.push(`UPI Amount: ${Currency.IndianFormat(createData.amount_upi)}\n`);
    }

    if (createData.cash_in_store) {
      historyMessage.push(`Cash In Store: ${Currency.IndianFormat(createData.cash_in_store)}\n`);
    }

    if (createData.cash_to_office) {
      historyMessage.push(`Cash To Office: ${Currency.IndianFormat(createData.cash_to_office)}\n`);
    }

    if (createData?.notes) {
      historyMessage.push(`Notes: ${createData.notes}\n`);
    }

    // systemLog
    res.json(Response.OK, {
      message: "SaleSettlement Created",
      id: saleSettlement?.id,
      orderCash: orderCashMismatch,
      orderUpi: orderUpiMismatch,
      storeAmount: storeAmountMismatch
    });


    res.on("finish", async () => {
      //create system log for saleSettlement updation
      if (historyMessage && historyMessage.length > 0) {
        let message = historyMessage.join();
        History.create(`${message}`, req, ObjectName.SALE_SETTLEMENT, saleSettlement.id);
      }

      let tagList = await TagService.list({ type: "Currency Denomination", companyId: company_id });
      if (tagList && tagList.length > 0) {
        for (let i = 0; i < tagList.length; i++) {
          const values = tagList[i];

          let createData = {
            denomination: values?.name,
            count: 0,
            object_id: Number.Get(saleSettlement.id),
            object_name: ObjectName.SALE_SETTLEMENT,
            company_id: company_id,
            amount: 0
          }
          await CurrencyDenominationService.create(createData)
        }
      }
      if ((Number.isNotNull(status?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED) && Number.isNotNull(saleSettlement?.owner_id))) {
        let notifParams = {
          company_id: company_id,
          reviwer_id: saleSettlement?.owner_id,
          SsId: saleSettlement.id,
          data: { ...saleSettlement, locationName: locationDetail?.name, shiftName: shiftDetail?.name }
        }
        await SaleSettlementNotification.sendReviwerChangeSlackNotification(notifParams)
      }

    });
  } catch (err) {
    console.log(err);
    next(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
};

const del = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_DELETE, req);

  const id = req.params.id;
  const object = Object.SALE_SETTLEMENT;
  const object_id = id;
  const company_id = Request.GetCompanyId(req);

  if (!validator.isInteger(id)) {
    return next(new errors.BadRequestError('Invalid Payment id'));
  }

  SaleSettlement.findOne({
    attributes: [
      "id",
      "store_id",
      "date",
      "shift",
      "amount",
      "type",
      "amount_cash",
      "amount_upi",
      "company_id",
    ],
    where: {
      id,
      company_id,
    },
  })
    .then((sales) => {
      if (!sales) {
        return next(new errors.NotFoundError("SaleSettlement not found"));
      }

      SaleSettlement.destroy({
        where: {
          id: sales.id,
          company_id,
        },
      })
        .then(() => {
          res.json({
            message: "SaleSettlement Deleted",
          });

          res.on("finish", async () => {
            //create system log for saleSettlement updation
            History.create("SaleSettlement Deleted", req, ObjectName.SALE_SETTLEMENT, id);
          });
        })
        .catch((err) => {
          req.log.error(err);
          return next(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
};
const get = async (req, res, next) => {
  const { id } = req.params;

  try {
    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, {
        message: "Invalid Id",
      });
    }

    const SalesData = await SaleSettlement.findOne({
      where: {
        id: id,
        company_id: company_id,
      },
    });

    if (!SalesData)
      return res.json(200, {
        message: "No Records Found",
      });

    let {
      store_id,
      date,
      shift,
      amount,
      amount_upi,
      amount_cash,
      type,
      status,
      sales_executive,
      sale_settlement_number,
      discrepancy_amount_upi,
      discrepancy_amount_cash,
      notes,
      calculated_amount_cash,
      calculated_amount_upi,
      received_amount_cash,
      received_amount_upi,
      cash_in_store,
      total_amount,
      total_discrepancy_amount,
      total_received_amount,
      total_calculated_amount,
      order_cash_amount,
      order_upi_amount,
      order_total_amount,
      owner_id,
      cash_to_office,
      reviewer,
      due_date,
      draft_order_amount
    } = SalesData.get();

    const statusData = await statusService.findOne({ where: { company_id: company_id, id: status } });
    let data = {
      store_id,
      date,
      shift,
      amount,
      amount_cash,
      amount_upi,
      type,
      status: statusData && statusData?.name,
      statusId: statusData && statusData?.id,
      sales_executive,
      sale_settlement_number,
      discrepancy_amount_cash,
      discrepancy_amount_upi,
      notes,
      calculated_amount_cash,
      calculated_amount_upi,
      received_amount_upi,
      received_amount_cash,
      cash_in_store,
      total_amount,
      total_calculated_amount,
      total_received_amount,
      total_discrepancy_amount,
      owner_id,
      cash_to_office,
      order_cash_amount,
      order_upi_amount,
      order_total_amount,
      due_date,
      reviewer,
      draft_order_amount
    };

    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
};

const search = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_VIEW, req);

  let currentLocationId = Request.getCurrentLocationId(req);

  const viewPermission = await Permission.Has(Permission.SALE_SETTLEMENT_MANAGE_OTHERS, req);

  let permission = viewPermission ? false : (hasPermission && currentLocationId) ? false : true;



  try {
    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      location,
      salesExecutive,
      shift,
      type,
      startDate,
      endDate,
      selectedDate,
      status,
      objectName,
      pagination,
      showTotalAmount
    } = req.query;

    const company_id = Request.GetCompanyId(req);

    const timeZone = Request.getTimeZone(req)

    let date = DateTime.getCustomDateTime(selectedDate || req.query?.date, timeZone)

    const where = {};

    // Apply filters if there is one
    if (location && parseInt(location)) {
      where.store_id = Number.Get(location);
    }

    if (shift) {
      where.shift = shift;
    }

    if (type) {
      where.type = type;
    }

    // Search by status
    if (status) {
      where.status = status;
    }

    if (salesExecutive) {
      where.sales_executive = salesExecutive;
    }

    if (!viewPermission) {
      let UserId = req && req.user && req.user.id;
      if (UserId) {
        where.sales_executive = UserId;
      }
    }
    if (date && (Number.isNotNull(selectedDate) || Number.isNotNull(req.query?.date))) {
      where.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }


    if (startDate && !endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
        },
      };
    }

    if (endDate && !startDate) {
      where.date = {
        [Op.and]: {
          [Op.lte]: endDate,
        },
      };
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }

    where.company_id = company_id;

    page = page ? parseInt(page, 10) : 1;

    if (isNaN(page)) {
      return res.json(400, {
        message: "Invalid page",
      });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;

    if (isNaN(pageSize)) {
      return res.json(400, {
        message: "Invalid page size",
      });
    }

    if (page && pageSize) {
      // Validate if page is not a number
      page = page ? parseInt(page, 10) : 1;
      if (isNaN(page)) {
        return res.json(400, {
          message: "Invalid page",
        });
      }

      // Validate if page size is not a number
      pageSize = pageSize ? parseInt(pageSize, 10) : 25;
      if (isNaN(pageSize)) {
        return res.json(400, {
          message: "Invalid page size",
        });
      }
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];

    const sortableFields = {
      id: "id",
      date: "date",
      shift: "shift",
      amount: "amount",
      amount_cash: "amount_cash",
      amount_upi: "amount_upi",
      type: "type",
      store_id: "store_id",
      createdAt: "createdAt",
      saleSettlementNumber: "sale_settlement_number",
      salesExecutive: "sales_executive",
      calculated_amount_cash: "calculated_amount_cash",
      calculated_amount_upi: "calculated_amount_upi",
      total_calculated_amount: "total_calculated_amount",
      received_amount_cash: "received_amount_cash",
      received_amount_upi: "received_amount_upi",
      status: "status",
      updatedAt: "updatedAt",
      cash_in_store: "cash_in_store",
      discrepancy_amount_upi: "discrepancy_amount_upi",
      discrepancy_amount_cash: "discrepancy_amount_cash",
      total_received_amount: "total_received_amount",
      total_amount: "total_amount",
      total_discrepancy_amount: "total_discrepancy_amount",
      cash_to_office: "cash_to_office",
      order_cash_amount: "order_cash_amount",
      order_upi_amount: "order_upi_amount",
      order_total_amount: "order_total_amount",

    };

    const sortParam = sort || "saleSettlementNumber";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(400, {
        message: `Unable to sort data by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";

    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(400, {
        message: "Invalid sort order",
      });
    }

    page = page ? parseInt(page, 10) : 1;

    pageSize = pageSize ? parseInt(pageSize, 10) : 25;

    // Search term
    const searchTerm = search ? search.trim() : null;

    if (searchTerm) {
      where[Op.or] = [
        {
          "$location.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        Sequelize.where(fn("concat", col("salesExecutive.name"), " ", col("salesExecutive.last_name")), {
          [Op.iLike]: `%${searchTerm}%`
        }),
      ];
    }

    // Include
    const include = [{
      required: true,
      model: Location,
      as: "location",
      attributes: ["id", "name"],
    },
    {
      required: true,
      model: Shift,
      as: "shiftDetail",
    },
    {
      model: User,
      as: "salesExecutive",
    },
    {
      required: false,
      model: statusModel,
      as: 'statusDetail',
    },
    ];

    const query = {
      order: [
        sortParam === "store_id"
          ? [{ model: Location, as: 'location' }, 'name', sortDirParam]
          : sortParam === "salesExecutive"
            ? [{ model: User, as: 'salesExecutive' }, 'name', sortDirParam]
            : sortParam === "status"
              ? [{ model: statusModel, as: 'statusDetail' }, 'name', sortDirParam]
              : [sortableFields[sortParam], sortDirParam],
      ],
      include,
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

    let params = {
      company_id: company_id,
      user: where.sales_executive,
      type: Number.isNotNull(type) ? type : null,
      status: Number.isNotNull(status) ? [status] : null,
      startDate: date?.startDate ? date?.startDate: startDate,
      endDate: date?.endDate ? date?.endDate: endDate,
      searchTerm
    }
    let totalAmount;
    if (showTotalAmount) {
      totalAmount = await getTotalAmount(params);
    }

    const SalesData = await SaleSettlement.findAndCountAll(query);

    let data = [];

    SalesData.rows.forEach((saleSettlement) => {
      let { location, salesExecutive, statusDetail } = saleSettlement.get();
      let salesExecutiveName = "";
      let salesExecutiveFirstName = salesExecutive && salesExecutive?.name;
      let salesExecutiveLastName = salesExecutive && salesExecutive?.last_name;
      let avatarUrl = salesExecutive && salesExecutive?.media_url;

      if (salesExecutive) {
        salesExecutiveName = salesExecutive.name + "" + salesExecutive.last_name;
      }
      data.push({
        id: saleSettlement.id,
        locationName: location.name,
        storeId: location.id,
        date: Date.Format(saleSettlement.date),
        shift: saleSettlement.shiftDetail?.name,
        shiftId: saleSettlement.shiftDetail?.id,
        amount: saleSettlement.amount,
        amount_cash: saleSettlement.amount_cash,
        amount_upi: saleSettlement.amount_upi,
        type: saleSettlement.type,
        status: statusDetail?.name,
        statusId: statusDetail?.id,
        statusColor: statusDetail?.color_code,
        allowed_statuses: statusDetail?.allowed_statuses?.split(","),
        createdAt: Date.formateDateAndTime(saleSettlement.createdAt),
        saleSettlementNumber: saleSettlement.sale_settlement_number,
        salesExecutive: salesExecutiveName,
        salesExecutiveFirstName: salesExecutiveFirstName,
        salesExecutiveLastName: salesExecutiveLastName,
        avatarUrl: avatarUrl,
        sales_executive: salesExecutive && salesExecutive.id,
        total_amount: saleSettlement.total_amount,
        calculated_amount_cash: saleSettlement.calculated_amount_cash,
        calculated_amount_upi: saleSettlement.calculated_amount_upi,
        received_amount_upi: saleSettlement.received_amount_upi,
        received_amount_cash: saleSettlement.received_amount_cash,
        total_calculated_amount: saleSettlement.total_calculated_amount,
        total_received_amount: saleSettlement.total_received_amount,
        discrepancy_amount_cash: saleSettlement.discrepancy_amount_cash,
        discrepancy_amount_upi: saleSettlement.discrepancy_amount_upi,
        total_discrepancy_amount: saleSettlement.total_discrepancy_amount,
        cash_in_store: saleSettlement.cash_in_store,
        notes: saleSettlement.notes,
        cash_to_office: saleSettlement.cash_to_office,
        order_cash_amount: saleSettlement.order_cash_amount,
        order_upi_amount: saleSettlement.order_upi_amount,
        order_total_amount: saleSettlement.order_total_amount,
        due_date: saleSettlement.due_date,
        reviewer: saleSettlement.reviewer,
        draft_order_amount:saleSettlement?.draft_order_amount
      });
    });

    if (data && data?.length > 0) {
      if (showTotalAmount) {
        let lastReCord = ObjectHelper.createEmptyRecord(data[0]);
        lastReCord.total_amount = totalAmount?.totalAmount || "";
        lastReCord.total_discrepancy_amount = totalAmount?.totalDiscrepancyAmount || "";
        lastReCord.amount_cash = totalAmount?.totalCashAmount || "";
        lastReCord.amount_upi = totalAmount?.totalUpiAmount || "";
        lastReCord.discrepancy_amount_cash = totalAmount?.totalDiscrepancyCashAmount || "";
        lastReCord.discrepancy_amount_upi = totalAmount?.totalDiscrepancyUpiAmount || "";
        lastReCord.calculated_amount_cash = totalAmount?.totalCalculatedCashAmount || "";
        lastReCord.calculated_amount_upi = totalAmount?.totalCalculatedUpiAmount || "";
        lastReCord.received_amount_cash = totalAmount?.totalreceviedCashAmount || "";
        lastReCord.received_amount_upi = totalAmount?.totalreceviedUpiAmount || "";
        lastReCord.cash_in_store = totalAmount?.totalCashInStoreAmount || "";
        lastReCord.total_calculated_amount = totalAmount?.totalCalculatedAmount || "";
        lastReCord.total_received_amount = totalAmount?.totalreceviedAmount || "";
        lastReCord.cash_to_office = totalAmount?.totalCashToOfficeAmount || "";
        lastReCord.order_cash_amount = totalAmount?.totalOrderCashAmount || "";
        lastReCord.order_upi_amount = totalAmount?.totalOrderUpiAmount || "";
        lastReCord.order_total_amount = totalAmount?.totalOrderTotalAmount || "";
        lastReCord.draft_order_amount = totalAmount?.totaldraftOrderAmount || "";
        data.push(lastReCord);
      }
    }

    res.json({
      totalCount: SalesData.count,
      currentPage: page,
      pageSize,
      search,
      data,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
};

const getTotalAmount = async (params) =>{

  let whereCondition=""
      
      params?.status ? whereCondition += ` AND "sale_settlement".status IN (${params?.status.join(', ')})` :""
      params?.user ? whereCondition += ` AND "sale_settlement"."sales_executive" = '${params?.user}'` :""
      params?.type ? whereCondition += ` AND "sale_settlement"."type" = ${params?.type}` :""
      params?.startDate ? whereCondition += ` AND "sale_settlement"."date" >= '${params?.startDate}'` : ""
      params?.endDate ? whereCondition += ` AND "sale_settlement"."date" <= '${params?.endDate}'` : ""
      params?.searchTerm && isNaN(Number.Get(params?.searchTerm)) ? 
      whereCondition += ` AND CONCAT("user"."name", ' ', "user"."last_name") ILIKE '%${params?.searchTerm}%'` : ""      
        const rawQuery = `
        SELECT COALESCE(SUM("sale_settlement"."total_amount"),0) AS "totalAmount",
        COALESCE(SUM("sale_settlement"."total_discrepancy_amount"),0) AS "totalDiscrepancyAmount",
        COALESCE(SUM("sale_settlement"."amount_cash"),0) AS "totalCashAmount",
        COALESCE(SUM("sale_settlement"."amount_upi"),0) AS "totalUpiAmount",
        COALESCE(SUM("sale_settlement"."discrepancy_amount_cash"),0) AS "totalDiscrepancyCashAmount",
        COALESCE(SUM("sale_settlement"."discrepancy_amount_upi"),0) AS "totalDiscrepancyUpiAmount",
        COALESCE(SUM("sale_settlement"."calculated_amount_cash"),0) AS "totalCalculatedCashAmount",
        COALESCE(SUM("sale_settlement"."calculated_amount_upi"),0) AS "totalCalculatedUpiAmount",
        COALESCE(SUM("sale_settlement"."received_amount_cash"),0) AS "totalreceviedCashAmount",
        COALESCE(SUM("sale_settlement"."received_amount_upi"),0) AS "totalreceviedUpiAmount",
        COALESCE(SUM("sale_settlement"."cash_in_store"),0) AS "totalCashInStoreAmount",
        COALESCE(SUM("sale_settlement"."total_calculated_amount"),0) AS "totalCalculatedAmount",
        COALESCE(SUM("sale_settlement"."total_received_amount"),0) AS "totalreceviedAmount",
        COALESCE(SUM("sale_settlement"."cash_to_office"),0) AS "totalCashToOfficeAmount",
        COALESCE(SUM("sale_settlement"."order_cash_amount"),0) AS "totalOrderCashAmount",
        COALESCE(SUM("sale_settlement"."order_upi_amount"),0) AS "totalOrderUpiAmount",
        COALESCE(SUM("sale_settlement"."order_total_amount"),0) AS "totalOrderTotalAmount",
        COALESCE(SUM("sale_settlement"."draft_order_amount"),0) AS "totaldraftOrderAmount"
        FROM "sale_settlement"
        LEFT JOIN "user" ON "sale_settlement"."sales_executive" = "user"."id"
        WHERE "sale_settlement"."company_id"=${params?.company_id}
         AND "sale_settlement"."deletedAt" IS NULL
        ${whereCondition}
        `;
      
        const totalAmountResult = await db.connection.query(rawQuery, {
          type: QueryTypes.SELECT,
        });

        return {
          totalAmount: totalAmountResult && totalAmountResult[0].totalAmount,
          totalDiscrepancyAmount: totalAmountResult && totalAmountResult[0]?.totalDiscrepancyAmount,
          totalCashAmount: totalAmountResult && totalAmountResult[0]?.totalCashAmount,
          totalUpiAmount: totalAmountResult && totalAmountResult[0]?.totalUpiAmount,
          totalDiscrepancyCashAmount: totalAmountResult && totalAmountResult[0]?.totalDiscrepancyCashAmount,
          totalDiscrepancyUpiAmount: totalAmountResult && totalAmountResult[0]?.totalDiscrepancyUpiAmount,
          totalCalculatedCashAmount: totalAmountResult && totalAmountResult[0]?.totalCalculatedCashAmount,
          totalCalculatedUpiAmount: totalAmountResult && totalAmountResult[0]?.totalCalculatedUpiAmount,
          totalreceviedCashAmount: totalAmountResult && totalAmountResult[0]?.totalreceviedCashAmount,
          totalreceviedUpiAmount: totalAmountResult && totalAmountResult[0]?.totalreceviedUpiAmount,
          totalCashInStoreAmount: totalAmountResult && totalAmountResult[0]?.totalCashInStoreAmount,
          totalCalculatedAmount: totalAmountResult && totalAmountResult[0]?.totalCalculatedAmount,
          totalreceviedAmount: totalAmountResult && totalAmountResult[0]?.totalreceviedAmount,
          totalCashToOfficeAmount: totalAmountResult && totalAmountResult[0]?.totalCashToOfficeAmount,
          totalOrderCashAmount: totalAmountResult && totalAmountResult[0]?.totalOrderCashAmount,
          totalOrderUpiAmount: totalAmountResult && totalAmountResult[0]?.totalOrderUpiAmount,
          totalOrderTotalAmount: totalAmountResult && totalAmountResult[0]?.totalOrderTotalAmount,
          totaldraftOrderAmount: totalAmountResult && totalAmountResult[0]?.totaldraftOrderAmount,
        };

}

const update = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_EDIT, req);



  let data = req.body;
  let { id } = req.params;
  try {
    let company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, {
        message: "Invalid Id",
      });
    }

    let SalesId = await SaleSettlement.findOne({
      where: {
        id: id,
        company_id,
      },
    });

    if (!SalesId) {
      return res.json(BAD_REQUEST, {
        message: "Sales Detail Not Found",
      });
    }

    const salesExist = await SaleSettlement.findOne({
      where: {
        store_id: data.storeId,
        shift: data.shift,
        date: new Date(data.date),
        id: {
          [Op.ne]: id,
        },
        company_id,
      },
    });

    if (salesExist) {
      return res.json(BAD_REQUEST, {
        message: "Sales Entry Already Exists",
      });
    }

    let updateData = {};

    if (data.storeId) updateData.store_id = data.storeId;
    if (data.date) updateData.date = data.date;
    if (data.shift) updateData.shift = data.shift;
    updateData.amount_cash = Currency.Get(data.amount_cash);
    updateData.amount_upi = Currency.Get(data.amount_upi);
    updateData.discrepancy_amount_cash = data.amount_cash - data.calculated_amount_cash || 0;
    updateData.discrepancy_amount_upi = data.amount_upi - data.calculated_amount_upi || 0;

    updateData.calculated_amount_cash = Currency.Get(data.calculated_amount_cash);

    updateData.calculated_amount_upi = Currency.Get(data.calculated_amount_upi);

    updateData.received_amount_upi = Currency.Get(data.received_amount_upi);

    updateData.received_amount_cash = Currency.Get(data.received_amount_cash);
    //validate salesexecutive exist or not
    if (data.salesExecutive) {
      updateData.sales_executive = data.salesExecutive;
    } else {
      updateData.sales_executive = null;
    }
    if (data.notes) {
      updateData.notes = data.notes;
    } else {
      updateData.notes = null;
    }
    if (data.cash_in_store) updateData.cash_in_store = data.cash_in_store || null;
    updateData.cash_to_office = Currency.Get(data.cash_to_office);
    updateData.total_amount = data.amount_cash + data.amount_upi;
    updateData.total_calculated_amount =
      Currency.Get(data.calculated_amount_cash) + Currency.Get(data.calculated_amount_upi);
    updateData.total_received_amount = Currency.Get(data.received_amount_cash) + Currency.Get(data.received_amount_upi);
    updateData.total_discrepancy_amount =
      Currency.Get(data.discrepancy_amount_cash) + Currency.Get(data.discrepancy_amount_upi);
    if (data.status) updateData.status = data.status;

    await SaleSettlement.update(updateData, {
      where: {
        id,
        company_id,
      },
    });
    // systemLog
    res.json(200, {
      message: "SaleSettlement Data Updated",
    });
    res.on("finish", async () => {
      //create system log for saleSettlement updation
      History.create("SaleSettlement Updated", req, ObjectName.SALE_SETTLEMENT, id);
    });
  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
};

const updateByStatus = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.SALE_SETTLEMENT_STATUS_UPDATE, req);
  let companyId = Request.GetCompanyId(req);


  let data = req.body;

  let { id } = req.params;

  const saleSettlementData = await SaleSettlement.findOne({ where: { company_id: companyId, id: id } });
  const {
    status,
    calculated_amount_cash,
    calculated_amount_upi,
    received_amount_cash,
    received_amount_upi,
    sales_executive,
  } = saleSettlementData;

  let company_id = Request.GetCompanyId(req);
  const statusValue = await statusModel.findOne({ where: { company_id: company_id, id: status } });

  try {
    if (!id) {
      return res.json(400, {
        message: "Invalid Id",
      });
    }

    let SalesId = await SaleSettlement.findOne({
      attributes: ["id"],
      where: {
        id: id,
      },
    });

    if (!SalesId) {
      return res.json(404, {
        message: "Payments Detail Not Found",
      });
    }

    let statusData = await StatusService.getData(data.status, companyId);
    if (statusData.validate_amount == Status.VALIDATE_AMOUNT_ENABLED) {
      if (
        received_amount_cash != null &&
        received_amount_upi != null
      ) {
        if (Number.Get(received_amount_cash < Number.Get(calculated_amount_cash))) {
          let type = await getSettingValue(Setting.RECEIVED_CASH_AMOUNT_MISSING_FINE_TYPE, company_id);
          if (type && type !== undefined) {
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: company_id },
            });
            if (tagDetail && tagDetail !== undefined) {
              let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
              let minusAmount = Number.Get(calculated_amount_cash) - Number.Get(received_amount_cash);
              let amount = Number.Get(default_amount) + Number.Get(minusAmount);
              let createData = {
                user: sales_executive,
                type: type,
                amount: amount,
                company_id: company_id,
                object_name:ObjectName.SALE_SETTLEMENT,
                object_id:saleSettlementData?.id
              };
              await fineService.create({ body: createData }, null, null);
            }
          }
        }
        if (Number.Get(received_amount_upi < Number.Get(calculated_amount_upi))) {
          let type = await getSettingValue(Setting.RECEIVED_UPI_AMOUNT_MISSING_FINE_TYPE, company_id);
          if (type && type !== undefined) {
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: company_id },
            });
            if (tagDetail && tagDetail !== undefined) {
              let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
              let minusAmount = Number.Get(calculated_amount_upi) - Number.Get(received_amount_upi);
              let amount = Number.Get(default_amount) + Number.Get(minusAmount);
              let createData = {
                user: sales_executive,
                type: type,
                amount: amount,
                company_id: company_id,
                object_name:ObjectName.SALE_SETTLEMENT,
                object_id:saleSettlementData.id
              };
              await fineService.create({ body: createData }, null, null);
            }
          }
        }
      } 
    }

    let updateData = {};
    if (data.status) updateData.status = data.status;
      updateData.reviewer = Number.Get(statusData?.default_reviewer)
      updateData.due_date = statusData && statusData?.default_due_date ?statusData?.default_due_date:null

    await SaleSettlement.update(updateData, {
      where: {
        id,
        company_id,
      },
    });

    // systemLog
    res.json(200, {
      message: "SaleSettlement Status Updated",
    });
    res.on("finish", async () => {

      if((Number.isNotNull(statusData?.notify_to_owner == Status.NOTIFY_TO_OWNER_ENABLED) && Number.isNotNull(statusData?.default_owner))){
        let locationDetail = await LocationService.getLocationDetails(saleSettlementData?.store_id,company_id);
        let shiftDetail = await ShiftService.getShiftById(saleSettlementData?.shift,companyId)
        let notifParams={
          company_id: company_id,
          reviwer_id: statusData?.default_owner,
          SsId: id,
          data: {...saleSettlementData,locationName: locationDetail?.name,shiftName: shiftDetail.name}
        }
        await SaleSettlementNotification.sendReviwerChangeSlackNotification(notifParams)
      }
      //create system log for saleSettlement updation
      History.create(
        `SaleSettlement Status Changed From ${statusValue.name} to ${statusData.name} `,
        req,
        ObjectName.SALE_SETTLEMENT,
        id
      );
    });
  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
};

const createLocaltionCashAmountMissingFine = async (data, company_id,req) => {
  let getLocationDetail = await Location.findOne({ where: { id: data?.store_id, company_id: company_id } });
  let shiftName = await ShiftService.getName(data?.shift, company_id)
  if (getLocationDetail) {
    if (Number.Get(data?.cash_in_store) < Number.Get(getLocationDetail?.cash_in_location)) {
      try {
        let type = await getSettingValue(Setting.LOCATION_CASH_AMOUNT_MISSING_FINE_TYPE, company_id);
        if (type && type !== undefined) {
          const tagDetail = await Tag.findOne({
            where: { id: type, company_id: company_id },
          });
          if (tagDetail && tagDetail !== undefined) {
          let userDetail = await UserService.get(data?.sales_executive, company_id)
            let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
            let minusAmount = Number.Get(getLocationDetail?.cash_in_location) - Number.Get(data?.cash_in_store);

            const notesArray = []

            notesArray.push(`Sales Settlement Number: ${data?.sale_settlement_number}\n`)
            notesArray.push(`Date: ${DateTime.shortMonthDate(data?.date) }\n`)
            notesArray.push(`Location: ${getLocationDetail?.name}\n`)
            notesArray.push(`Shift: ${shiftName}\n`)
            notesArray.push(`Cash in Store: ${Currency.IndianFormat(getLocationDetail?.cash_in_location) }\n`)
            notesArray.push(`Sales Settlement Cash In Store Amount: ${Currency.IndianFormat(data?.cash_in_store) }\n`)
            notesArray.push(`MisMatched Amount: ${Currency.IndianFormat(minusAmount) }\n`)
            const notes = notesArray.join('\n')

            let amount = Number.Get(default_amount) + Number.Get(minusAmount);
            let createData = {
              user: data.sales_executive,
              type: type,
              amount: amount,
              company_id: company_id,
              object_name:ObjectName.SALE_SETTLEMENT,
              object_id:data.id,
              notes:notes
            };
             await fineService.create({ body: createData }, null, null);
        
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
};

const createOrderCashAmountMissingFine = async (data, company_id,completedStatus,req) => {
  let locationName = await LocationService.getName(data?.store_id, company_id)
  let shiftName = await ShiftService.getName(data?.shift, company_id)
  let timeZone = Request.getTimeZone(req);
  let date = DateTime.getDateTimeByUserProfileTimezone(data?.date,timeZone)
  let cashAmount = await order.sum('cash_amount', {
    where: {
      store_id: data?.store_id,
      owner: data?.sales_executive,
      shift: data?.shift,
      company_id: company_id,
      status:{[Op.eq]:completedStatus},
      date: {
        [Op.and]: {
          [Op.gte]: DateTime.toGetISOStringWithDayStartTime(date),
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(date),
        },
      },
    },
  });


  if (cashAmount && cashAmount !== undefined) {
    if (Number.Get(data?.amount_cash) < Number.Get(cashAmount)) {
      let type = await getSettingValue(Setting.ORDER_CASH_AMOUNT_MISSING_FINE_TYPE, company_id);
      if (type && type !== undefined) {
        const tagDetail = await Tag.findOne({
          where: { id: type, company_id: company_id },
        });
        if (tagDetail && tagDetail !== undefined) {

          let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
          let minusAmount = Number.Get(cashAmount) - Number.Get(data?.amount_cash);
          const notesArray = []

          notesArray.push(`Sales Settlement Number: ${data?.sale_settlement_number}\n`)
          notesArray.push(`Date: ${DateTime.shortMonthDate(data?.date) }\n`)
          notesArray.push(`Location: ${locationName}\n`)
          notesArray.push(`Shift: ${shiftName}\n`)
          notesArray.push(`Order Cash Amount: ${Currency.IndianFormat(cashAmount) }\n`)
          notesArray.push(`Sales Settlement Cash Amount: ${Currency.IndianFormat(data?.amount_cash) }\n`)
          notesArray.push(`MisMatched Amount: ${Currency.IndianFormat(minusAmount) }\n`)

          const notes = notesArray.join('\n')

          let amount = Number.Get(default_amount) + Number.Get(minusAmount);
          let createData = {
            user: data?.sales_executive,
            type: type,
            amount: amount,
            company_id: company_id,
            object_name:ObjectName.SALE_SETTLEMENT,
            object_id:data?.id,
            notes: notes
          };
           await fineService.create({ body: createData, user: { id: data?.sales_executive, company_id: company_id } }, null, null);
        
        }
      }
    }
  }
};

const createOrderUpiAmountMissingFine = async (data,timeZone, company_id,completedStatus,req) => {
  let locationName = await LocationService.getName(data?.store_id, company_id)
  let shiftName = await ShiftService.getName(data?.shift, company_id)
  let start_date = DateTime.toGetISOStringWithDayStartTime(data?.date)
  let end_date = DateTime.toGetISOStringWithDayEndTime(data?.date)
  let upiAmount = await order.sum('upi_amount', {
    where: {
      store_id: data?.store_id,
      owner: data?.sales_executive,
      shift: data?.shift,
      company_id: company_id,
      status:{[Op.eq]:completedStatus},
      date: {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      },
    },
  });
  if (upiAmount && upiAmount !== undefined) {
    if (Number.Get(data?.amount_upi) < Number.Get(upiAmount)) {
      let type = await getSettingValue(Setting.ORDER_UPI_AMOUNT_MISSING_FINE_TYPE, company_id);
      if (type && type !== undefined) {
        const tagDetail = await Tag.findOne({
          where: { id: type, company_id: company_id },
        });
        if (tagDetail && tagDetail !== undefined) {
          let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
          let minusAmount = Number.Get(upiAmount) - Number.Get(data?.amount_upi);
          let amount = Number.Get(default_amount) + Number.Get(minusAmount);
          const notesArray = []

          notesArray.push(`Sales Settlement Number: ${data?.sale_settlement_number}\n`)
          notesArray.push(`Date: ${DateTime.shortMonthDate(data?.date) }\n`)
          notesArray.push(`Location: ${locationName}\n`)
          notesArray.push(`Shift: ${shiftName}\n`)
          notesArray.push(`Order Upi Amount: ${Currency.IndianFormat(upiAmount) }\n`)
          notesArray.push(`Sales Settlement Upi Amount: ${Currency.IndianFormat(data?.amount_upi) }\n`)
          notesArray.push(`MisMatched Amount: ${Currency.IndianFormat(minusAmount) }\n`)
          const notes = notesArray.join('\n')

          let createData = {
            user: data.sales_executive,
            type: type,
            amount: amount,
            company_id: company_id,
            object_name:ObjectName.SALE_SETTLEMENT,
            object_id:data?.id,
            notes:notes
          };
           await fineService.create({ body: createData, user: { id: data?.sales_executive, company_id: company_id } }, null, null);
        }
      }
    }
  }
};
const createDraftAmountMissingFine = async (data, companyId, req) => {
  let locationName = await LocationService.getName(data?.store_id, companyId)
  let shiftName = await ShiftService.getName(data?.shift, companyId)
  try{
  if (data && data !== undefined) {
      let type = await getSettingValue(Setting.DRAFT_ORDER_AMOUNT_MISSING_FINE_TYPE, companyId);
      if (type && type !== undefined) {
        const tagDetail = await Tag.findOne({
          where: { id: type, company_id: companyId },
        });
        if (tagDetail && tagDetail !== undefined) {
          let default_amount = (tagDetail && tagDetail?.default_amount) || 0;
          let amount = Number.Get(default_amount) + Number.Get(data?.draft_order_amount);
          const notesArray = []

          notesArray.push(`Sales Settlement Number: ${data?.sale_settlement_number}\n`)
          notesArray.push(`Date: ${DateTime.shortMonthDate(data?.date) }\n`)
          notesArray.push(`Location: ${locationName}\n`)
          notesArray.push(`Shift: ${shiftName}\n`)
          notesArray.push(`Mismatch Amount: ${Currency.IndianFormat(amount) }\n`)
          const notes = notesArray.join('\n')

          let createData = {
            user: data?.sales_executive,
            type: type,
            amount: amount,
            company_id: companyId,
            object_name:ObjectName.SALE_SETTLEMENT,
            object_id:data?.id,
            notes:notes
          };
           await fineService.create({ body: createData, user: { id: data?.sales_executive, company_id: companyId } }, null, null);
          }
      }
  }
}catch(err){
  console.log(err);
}
};

const updateOrderAmount = async (companyId, saleSettlementId,timeZone) => {
  try { 
    
    let params;
    let draftStatus;
    let completeStatus;
    let start_date;
    let end_date;
    let draftOrder;
    let completeOrder;

    let where = {};

    if (saleSettlementId && saleSettlementId.length > 0) {
      where.id = saleSettlementId;
    }
    where.company_id = companyId;

    let saleSettlementData = await SaleSettlement.findAll({ where: where, order: [["date", "ASC"]] });

    if (saleSettlementData && saleSettlementData.length > 0) {
      for (let i = 0; i < saleSettlementData.length; i++) {
         start_date = DateTime.toGetISOStringWithDayStartTime(saleSettlementData[i] && saleSettlementData[i]?.date)
        end_date = DateTime.toGetISOStringWithDayEndTime(saleSettlementData[i] && saleSettlementData[i]?.date)

        params = {
          startDate: start_date,
          endDate: end_date,
          companyId: companyId,
          timeZone : timeZone,
          storeId: saleSettlementData[i].store_id,
          shift: Number.Get(saleSettlementData[i].shift),
          userId: Number.Get(saleSettlementData[i].salesExecutive)
        };
         draftStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_DRAFT, companyId);
    
         completeStatus = await StatusService.Get(ObjectName.ORDER_TYPE, Status.GROUP_COMPLETED, companyId);
        const orderDetails = await orderService.getOrderAmountByShift(params);
    
         draftOrder = orderDetails && orderDetails.length>0 ?orderDetails.find(value=> value.status == draftStatus?.id):0
    
         completeOrder = orderDetails && orderDetails.length>0 ?orderDetails.find(value=> value.status == completeStatus?.id):0
    
     
          await SaleSettlement.update(
            {
              order_cash_amount: completeOrder?.total_cash_amount,
              order_upi_amount: completeOrder?.total_upi_amount,
              order_total_amount: Number.GetCurrency(completeOrder?.total_cash_amount) + Number.GetCurrency(completeOrder?.total_upi_amount),
              draft_order_amount : draftOrder && Currency.Get(draftOrder?.total_amount)
            },
            { where: { id: saleSettlementData[i].id } }
          );
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const createMissingFine = async (params) => {
  try {
    let { companyId, startDate, endDate } = params;

    let where = {};

    if (startDate) {
      where.date = startDate;
    } else {
      where.date = DateTime.getCurrentDay(new Date());
    }

    if (endDate) {
      where.date = endDate;
    } else {
      where.date = DateTime.getCurrentDay(new Date());
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }
    where.company_id = companyId;

    let saleSettlementData = await SaleSettlement.findAll({
      attributes: [
        "id",
        "store_id",
        "date",
        "shift",
        "amount",
        "type",
        "amount_cash",
        "amount_upi",
        "company_id",
        "sales_executive",
        "order_cash_amount",
        "order_upi_amount",
        "sale_settlement_number"
      ],
      include:[{
        required: true,
        model: Location,
        as: "location",
        attributes: ["id", "name"],
    },
    {
        required: true,
        model: Shift,
        as: "shiftDetail",
    },
       ],
      where,
    });

    let saleSettlementDataList = [];

    if (saleSettlementData && saleSettlementData.length > 0) {
      for (let i = 0; i < saleSettlementData.length; i++) {
        saleSettlementDataList.push(saleSettlementData[i]);
      }
    }

    if (saleSettlementDataList && saleSettlementDataList.length > 0) {
      for (let i = 0; i < saleSettlementDataList.length; i++) {
        if (
          Number.GetFloat(saleSettlementDataList[i].amount_cash) <
          Number.GetFloat(saleSettlementDataList[i].order_cash_amount)
        ) {
          let type = await getSettingValue(
            Setting.ORDER_CASH_AMOUNT_MISSING_FINE_TYPE,
            companyId
          );
          if (type && type !== undefined) {
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: companyId },
            });
            if (tagDetail && tagDetail !== undefined) {
              let default_amount =
                (tagDetail && tagDetail?.default_amount) || 0;
              let minusAmount =
                Number.GetFloat(saleSettlementDataList[i]?.order_cash_amount) -
                Number.GetFloat(saleSettlementDataList[i]?.amount_cash);

                const notesArray = []

                notesArray.push(`Sales Settlement Number: ${saleSettlementDataList[i]?.sale_settlement_number}\n`)
                notesArray.push(`Date: ${DateTime.shortMonthDate(saleSettlementDataList[i]?.date) }\n`)
                notesArray.push(`Location: ${saleSettlementDataList[i]?.location?.name}\n`)
                notesArray.push(`Shift: ${saleSettlementDataList[i]?.shiftDetail?.name}\n`)
                notesArray.push(`Order Cash Amount: ${Currency.IndianFormat(saleSettlementDataList[i]?.order_cash_amount) }\n`)
                notesArray.push(`Sales Settlement Cash Amount: ${Currency.IndianFormat(saleSettlementDataList[i]?.amount_cash) }\n`)
                notesArray.push(`MisMatched Amount: ${Currency.IndianFormat(minusAmount) }\n`)


                const message = notesArray.join('\n')

              let amount =
                Number.GetFloat(default_amount) + Number.GetFloat(minusAmount);
              let createData = {
                user: saleSettlementDataList[i]?.sales_executive,
                type: type,
                amount: amount,
                company_id: companyId,
                date: saleSettlementData[i].date,
                object_name:ObjectName.SALE_SETTLEMENT,
                object_id:saleSettlementDataList[i]?.id,
                notes: message
              };
              let findData = await FineBonus.findOne({
                where: {
                  date: saleSettlementDataList[i].date,
                  type: type,
                  user: saleSettlementDataList[i]?.sales_executive,
                  company_id: companyId,
                  object_name:ObjectName.SALE_SETTLEMENT,
                  object_id:saleSettlementDataList[i]?.id,
                },
              });
              if (!findData) {
                await fineService.create({ body: createData }, null, null);
              }
            }
          }
        }
        if (
          Number.GetFloat(saleSettlementDataList[i]?.amount_upi) <
          Number.GetFloat(saleSettlementDataList[i]?.order_upi_amount)
        ) {
          let type = await getSettingValue(
            Setting.ORDER_UPI_AMOUNT_MISSING_FINE_TYPE,
            companyId
          );
          if (type && type !== undefined) {
            const tagDetail = await Tag.findOne({
              where: { id: type, company_id: companyId },
            });
            if (tagDetail && tagDetail !== undefined) {
              let default_amount =
                (tagDetail && tagDetail?.default_amount) || 0;
              let minusAmount =
                Number.GetFloat(saleSettlementDataList[i]?.order_upi_amount) -
                Number.GetFloat(saleSettlementDataList[i]?.amount_upi);
                const notesArray = []

                notesArray.push(`Sales Settlement Number: ${saleSettlementDataList[i]?.sale_settlement_number}\n`)
                notesArray.push(`Date: ${DateTime.shortMonthDate(saleSettlementDataList[i]?.date) }\n`)
                notesArray.push(`Order Upi Amount: ${Currency.IndianFormat(saleSettlementDataList[i]?.order_upi_amount) }\n`)
                notesArray.push(`Sales Settlement Upi Amount: ${Currency.IndianFormat(saleSettlementDataList[i]?.amount_upi) }\n`)
                notesArray.push(`MisMatched Amount: ${Currency.IndianFormat(minusAmount) }\n`)


                const message = notesArray.join('\n')
              let amount =
                Number.GetFloat(default_amount) + Number.GetFloat(minusAmount);
              let createData = {
                user: saleSettlementDataList[i]?.sales_executive,
                type: type,
                amount: amount,
                company_id: companyId,
                date: saleSettlementData[i].date,
                object_name:ObjectName.SALE_SETTLEMENT,
                object_id:saleSettlementDataList[i]?.id,
                notes: message
              };
              let findData = await FineBonus.findOne({
                where: {
                  date: saleSettlementDataList[i].date,
                  type: type,
                  user: saleSettlementDataList[i]?.sales_executive,
                  company_id: companyId,
                  object_name:ObjectName.SALE_SETTLEMENT,
                  object_id:saleSettlementDataList[i]?.id
                },
              });
              if (!findData) {
                await fineService.create({ body: createData }, null, null);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};



module.exports = {
  create,
  del,
  get,
  search,
  update,
  updateByStatus,
  createLocaltionCashAmountMissingFine,
  createOrderCashAmountMissingFine,
  createOrderUpiAmountMissingFine,
  updateOrderAmount,
  createMissingFine,
  getTotalAmount,
  createDraftAmountMissingFine
};
