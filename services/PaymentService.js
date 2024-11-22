const ObjectName = require('../helpers/ObjectName');
const { OK, BAD_REQUEST, UPDATE_SUCCESS } = require('../helpers/Response');
const Boolean = require('../lib/Boolean');
const Currency = require('../lib/currency');
const DateTime = require('../lib/dateTime');
const Request = require('../lib/request');
const History = require('../services/HistoryService');
const {
  Payment: PaymentModel,
  Tag,
  status: statusModal,
  PaymentAccount: PaymentAccountModal,
  account: AccountModal,
  Media: MediaModel,
  Bill,
  Purchase,
} = require('../db').models;
const validator = require('.././lib/validator');
const { Op, Sequelize, QueryTypes } = require('sequelize');
const StatusService = require('../services/StatusService');
const Number = require('../lib/Number');
const NotificationService = require('../services/notifications/status');
const mediaService = require("./MediaService");
const { UploadFromUrlToS3 } = require('../lib/s3');
const accountService = require("./AccountService");
const { getPaymentAccountName } = require("./PaymentAccountService");
const { getUserDetailById } = require("./UserService");
const { concatName } = require("../lib/string");
const statusService = require("../services/StatusService");
const db = require('../db');
const Permission = require('../helpers/Permission');
const Response = require('../helpers/Response');
const ObjectHelper = require("../helpers/ObjectHelper");
const { fineService } = require("./FineBonusService");
const Setting = require("../helpers/Setting");
const { getSettingValueByObject, getSettingValue } = require("./SettingService");

class paymentService {
  // Create a new paymentService
  static async create(req, res) {
    try {
      const hasPermission = await Permission.Has(Permission.PAYMENT_ADD, req);

      let data = req.body;
      const companyId = Request.GetCompanyId(req);
      let totalBillNetAmount;
      let totalPaymentAmount;
      if (data?.bill_id) {
        const billNetAmount = await Bill.findOne({
          where: { id: data?.bill_id, company_id: companyId },
        });
        let paymentAmount = await PaymentModel.sum("amount", {
          where: { bill_id: data?.bill_id, company_id: companyId },
        });
        totalBillNetAmount = Number.GetFloat(billNetAmount?.net_amount);
        totalPaymentAmount =
          Number.GetFloat(paymentAmount ? paymentAmount : 0) +
          Number.GetFloat(data?.amount);
      }

      if (totalBillNetAmount < totalPaymentAmount) {
        return res.json(BAD_REQUEST, {
          message: 'Payment amount is greater than bill net amount',
        });
      }
      let status;
      if (data.status) {
        status = await StatusService.getData(data?.status, companyId);
      } else {
        status = await statusService.getFirstStatusDetail(
          ObjectName.PAYMENT,
          companyId
        );
      }
      let historyMessage = [];

      const createData = {
        date: data.date,
        amount: Currency.Get(data.amount ? data.amount : data.invoice_amount),
        status: status.id,
        company_id: companyId,
        owner_id: data?.owner_id ? data?.owner_id : await statusService.GetDefaultOwner(
          status?.default_owner,
          req.user.id
        ),
        account_id: data.account ? data.account : data.account_id,
        payment_account_id: data?.payment_account
          ? data?.payment_account
          : null,
        bill_id: Number.Get(data?.bill_id),
        notes: data?.notes ? data?.notes : "",
        due_date: data?.due_date ? data?.due_date : null,
        invoice_number: data?.invoice_number ? data?.invoice_number : null,
      };

      historyMessage.push(`Date: ${DateTime.shortMonthDate(data.date)}\n`);
      historyMessage.push(`Amount: ${Currency.IndianFormat(data?.amount)}\n`);
      historyMessage.push(`Status: ${status?.name}\n`);
      data?.bill_id && historyMessage.push(`Bill Id ${data?.bill_id}\n`);
      data?.description &&
        historyMessage.push(`Description: ${data?.description}\n`);
      historyMessage.push(`Notes: ${data.notes}\n`);
      historyMessage.push(
        `Account: ${await accountService.getAccountName(
          data.account ? data.account : data.account_id,
          companyId
        )}\n`
      );
      historyMessage.push(
        `Payment Account: ${await getPaymentAccountName(
          data?.payment_account ? data?.payment_account : null,
          companyId
        )}\n`
      );

      const detail = await PaymentModel.create(createData);

      if (detail && data?.bill_id) {
        const billMediaList = await MediaModel.findAll({
          where: {
            object_id: data?.bill_id,
            object_name: ObjectName.BILL,
            company_id: companyId,
          },
        });

        if (billMediaList && billMediaList.length > 0) {
          for (let i = 0; i < billMediaList.length; i++) {
            let media = billMediaList[i];
            const mediaUpload = {
              file_name: media.file_name,
              company_id: media.company_id,
              name: media.name,
              feature: media.feature,
              status: media.status,
              object_id: detail.id,
              object_name: ObjectName.PAYMENT,
              visibility: media.visibility,
            };
            let mediaData = await MediaModel.create(mediaUpload);

            let mediaImage = await mediaService.getMediaURL(
              media.id,
              companyId
            );

            const mediaId = mediaData.id;

            const imagePath = `${mediaId}-${media.file_name}`;

            await UploadFromUrlToS3(mediaImage, imagePath);
          }
        }
      }

      res.on('finish', async () => {
        if (historyMessage && historyMessage.length > 0) {
          let message = historyMessage.join();
          History.create(message, req, ObjectName.PAYMENT,  detail.id);
        } else {
          History.create("Payment added", req, ObjectName.PAYMENT, detail.id);
        }
      });

      res.json(OK, { message: 'Payment added', id: detail?.id });
    } catch (err) {
      console.log(err);
    }
  }

  // delete

  static async del(req, res) {
    try {
      const hasPermission = await Permission.Has(
        Permission.PAYMENT_DELETE,
        req
      );

      const id = req.params.id;
      const company_id = Request.GetCompanyId(req);

      await PaymentModel.destroy({ where: { id: id, company_id: company_id } });

      res.json(200, { message: 'Payment Deleted' });

      res.on('finish', async () => {
        History.create("Payment Deleted", req, ObjectName.PAYMENT, id);
      });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  }

  //get

  static async get(req, res, next) {
    try {
      const { id } = req.params;
      let company_id = Request.GetCompanyId(req)

      if (!id) {
        return res.json(BAD_REQUEST, { message: 'Payment id is required' });
      }

      const paymentsDetail = await PaymentModel.findOne({
        where: { id , company_id},
        include: [
          {
            required: false,
            model: statusModal,
            as: 'statusDetail',
          },
        ],
      });

      if (!paymentsDetail) {
        return res.json(BAD_REQUEST, { message: 'Payment not found' });
      }

      const data = {
        id,
        date: DateTime.Format(paymentsDetail.date),
        statusName: paymentsDetail?.statusDetail?.name,
        status: paymentsDetail?.statusDetail?.id,
        amount: paymentsDetail.amount,
        account: paymentsDetail.account_id,
        paymentAccount: paymentsDetail?.payment_account_id,
        owner_id: paymentsDetail.owner_id,
        notes:paymentsDetail.notes,
        bill_id:paymentsDetail.bill_id,
        due_date:paymentsDetail?.due_date,
        invoice_number:paymentsDetail?.invoice_number
      };
      res.json(OK, { data: data });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  }

  // Update
  static async update(req, res) {
    const {
      date,
      amount,
      status,
      owner_id,
      account,
      payment_account,
      notes,
      description,
      due_date,
      invoice_number,
      bill_id,
    } = req.body;

    const { id } = req.params;
    let roleId = Request.getUserRole(req);
    try {
      const hasPermission = await Permission.Has(Permission.PAYMENT_EDIT, req);
    
      const companyId = Request.GetCompanyId(req);
      if (!id) {
        return res.json(BAD_REQUEST, { message: 'Payment id is required' });
      }

      const paymentsDetail = await PaymentModel.findOne({
        where: { id: id, company_id: companyId },
      });
      if (!paymentsDetail) {
        return res.json(BAD_REQUEST, { message: 'Invalid payments id' });
      }

      let totalBillNetAmount
      let totalPaymentAmount
      if (Number.isNotNull(paymentsDetail?.bill_id)) {
        const billNetAmount = await Bill.findOne({
          where: { id: paymentsDetail?.bill_id, company_id: companyId },
        });
        let paymentAmount = await PaymentModel.sum('amount', {
          where: {
            bill_id: paymentsDetail?.bill_id,
            id: { [Op.not]: id },
            company_id: companyId,
          },
        });
        totalBillNetAmount = Number.GetFloat(billNetAmount?.net_amount);
        totalPaymentAmount =
          Number.GetFloat(paymentAmount ? paymentAmount : 0) +
          Number.GetFloat(amount);
      }

      if (totalBillNetAmount < totalPaymentAmount) {
        return res.json(BAD_REQUEST, {
          message: "Payment amount is greater than bill net amount",
        });
      }
      const updateData = {};

      if (id) {
        updateData.id = id;
      }

      if (date) {
        updateData.date = date;
      }

      if (due_date || due_date === "") {
        updateData.due_date = due_date ? due_date : null;
      }

      if (amount) {
        updateData.amount = Currency.Get(amount);
      }

      if (status) {
        const statusDetail = await statusService.getData(
          status,
          companyId
        );
        let dueDate = await statusService.getDueDate(status, companyId);
        updateData.status = status;
        if (statusDetail && statusDetail?.default_owner) {
          updateData.owner_id = await StatusService.GetDefaultOwner(statusDetail?.default_owner, req.user.id);
        }
        if (dueDate) {
          updateData.due_date = dueDate;
        }
      }

      if (notes || notes === "") {
        updateData.notes = notes;
      }

      if (owner_id) {
        updateData.owner_id = Number.Get(owner_id);
      }

      if (account) {
        updateData.account_id = Number.Get(account);
      }
      if (invoice_number) {
        updateData.invoice_number = invoice_number;
      }
      if (payment_account || payment_account === "") {
        updateData.payment_account_id = Number.Get(payment_account);
      }

      const data = await PaymentModel.update(updateData, {
        where: { company_id: companyId, id: id },
      });


      res.on('finish', async () => {
        this.createAuditLog(paymentsDetail, updateData, req, id);
        if (paymentsDetail.status != status) {
          let redirectUrl = `payment/detail/${paymentsDetail.id}|${paymentsDetail.id}`;
          NotificationService.SendStatusUpdateNotificationToOwner(
            paymentsDetail.owner_id,
            ObjectName.PAYMENT,
            paymentsDetail.status,
            status,
            companyId,
            redirectUrl,
            req.user.id
          );
        }


        if(Number.isNotNull(due_date) && paymentsDetail?.due_date !== DateTime.getSQlFormattedDate(due_date)){
          let isEnabledFineAddForDueDateChange = await getSettingValueByObject(
            Setting.FINE_ADD_FOR_PAYMENT_DUE_DATE_CHANGE,
            companyId,
            roleId,
            ObjectName.ROLE
          );
          let numOfDueDateDays = DateTime.getDayCountByDateRange(paymentsDetail?.due_date, DateTime.getSQlFormattedDate(due_date));
          if(isEnabledFineAddForDueDateChange && isEnabledFineAddForDueDateChange == "true"){
            let params={
              company_id: companyId,
               type: Setting.PAYMENT_DUE_DATE_CHANGE_FINE_TYPE ,
                user_id: paymentsDetail?.owner_id,
                 due_date, 
                 numOfDueDateDays,
                 object_id: paymentsDetail?.id,
                 object_name: ObjectName.PAYMENT
            }
            await this.addFineForDueDateChange(params)
          }
        }


      });

      return res.json(UPDATE_SUCCESS, {
        message: 'Payment Updated',
        data: data,
      });
    } catch (err) {
      console.log(err);
    }
  }

  //search
  static async search(req, res, next) {
    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      purchaseId,
      startDate,
      endDate,
      bill_id,
      account,
      paymentAccount,
      user,
      payment_id,
      excludeStatus,
      showTotal,
      accountType
    } = req.query;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: 'Invalid page' });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: 'Invalid page size' });
    }

    const companyId = req.user && req.user.company_id;
    let timeZone = Request.getTimeZone(req);
    let date = DateTime.getCustomDateTime(req.query?.date, timeZone)

    if (!companyId) {
      return res.json(400, 'Company Not Found');
    }
    const payment_manage_others = await Permission.Has(Permission.PAYMENT_MANAGE_OTHERS, req);

    // Sortable Fields
    const validOrder = ['ASC', 'DESC'];
    const sortableFields = {
      id: 'id',
      amount: 'amount',
      status: 'status',
      date: 'date',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      invoice_number: 'invoice_number',
      payment_account_name: 'payment_account_name',
      name: 'name',
    };

    const sortParam = sort || 'updatedAt';

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, { message: `Unable to sort payments by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: 'Invalid sort order' });
    }

    const data = req.query;

    const where = {};
    const accountWhere = {};
    const paymentAccountWhere = {};
    where.company_id = companyId;
    // Search by name

    // Search by status
    const status = data.status;

    if (status) {
      where.status = status;
    }

    if (accountType) {
      accountWhere.type = accountType;
    }

    if (excludeStatus) {
      where.status = {
        [Op.notIn]: [excludeStatus]
      };
    }

    let userId = req && req.user && req.user.id;

    if (!payment_manage_others) {
      where.owner_id = userId;

    } else if (user) {
      where.owner_id = user;

    }

    if (payment_id) {
      where.id = payment_id;
    }
    if (bill_id) {
      where.bill_id = bill_id;
    }


    if (account) {
      where.account_id = account;
    }

    if (paymentAccount) {
      where.payment_account_id = paymentAccount;
    }

    let billId;

    if (Number.isNotNull(purchaseId)) {
      let purchaseData = await Purchase.findOne({
        where: { id: purchaseId },
        attributes: ["id", "bill_id"],
      });
      billId = purchaseData && purchaseData.bill_id;
      if (Number.isNotNull(billId)) {
        where.bill_id = billId;
      } else {
        where.id = null
      }

    }

    let order = [];

    if (sort && sort !== 'payment_account_name' && sort !== 'name' && sort !== "status") {
      order.push([sort, sortDir]);
    }

    if (sortParam === 'payment_account_name') {
      order.push([{ model: PaymentAccountModal, as: 'paymentAccountDetail' }, 'payment_account_name', sortDir]);
    }

    if (sortParam === 'name') {
      order.push([{ model: AccountModal, as: 'accountDetail' }, 'name', sortDir]);
    }

    if (sortParam === "status") {
      order.push([[{ model: statusModal, as: 'statusDetail' }, 'name', sortDir]])
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {

      if (!isNaN(Number.Get(searchTerm))) {
        where[Op.or] = [
          {
            id: {
              [Op.eq]: searchTerm,
            },
          },
        ];
      } else {
        where[Op.or] = [
          {
            '$paymentAccountDetail.payment_account_name$': {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            '$accountDetail.name$': {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }
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
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    if (startDate && endDate) {
      where.date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    if (date && Number.isNotNull(req?.query?.date)) {
      where.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    const query = {
      order,
      include: [
        {
          required: false,
          model: statusModal,
          as: 'statusDetail',
        },
        {
          required: false,
          model: PaymentAccountModal,
          as: 'paymentAccountDetail',
          where: paymentAccountWhere,
        },
        {
          required: true,
          model: AccountModal,
          as: 'accountDetail',
          where: accountWhere,
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

    try {
      let params = {
        startDate,
        endDate,
        companyId,
        payment_id,
        bill_id: bill_id ? bill_id : billId,
        payment_manage_others,
        userId,
        user,
        account,
        paymentAccount,
        searchTerm,
        excludeStatus,
        status,
        accountType
      }

      let totalAmount = await this.getTotalAmount(params);

      const details = await PaymentModel.findAndCountAll(query);

      if (details.count === 0) {
        return res.json({ message: 'Payment not found' });
      }

      const data = [];

      details.rows.forEach((paymentsValue) => {
        const {
          id,
          date,
          amount,
          createdAt,
          updatedAt,
          statusDetail,
          paymentAccountDetail,
          accountDetail,
          bill_id,
          due_date,
          notes,
          invoice_number,
          owner_id
        } = paymentsValue.get();

        data.push({
          id,
          payment_number: id,
          date: date,
          statusId: statusDetail?.id,
          status: statusDetail?.name,
          statusColor: statusDetail?.color_code,
          account: accountDetail?.name,
          accountId: accountDetail?.id,
          paymentAccount: paymentAccountDetail?.payment_account_name ? paymentAccountDetail?.payment_account_name : "",
          paymentAccountId: paymentAccountDetail?.id ? paymentAccountDetail?.id : "",
          amount,
          statusId: statusDetail?.id,
          notes: notes,
          bill_id: bill_id,
          due_date: due_date,
          invoice_number: invoice_number,
          createdAt: DateTime.defaultDateFormat(createdAt),
          updatedAt: DateTime.defaultDateFormat(updatedAt),
          owner_id: owner_id
        });
      });

      if (showTotal && totalAmount) {
        let lastReCord = ObjectHelper.createEmptyRecord(data[0])
        lastReCord.amount = totalAmount;
        data.push(lastReCord);
      }

      res.json(OK, {
        totalCount: details.count,
        currentPage: page,
        pageSize,
        data,
        search,
        sort,
        sortDir,
        status: status ? status : '',
        totalAmount: totalAmount,
      });
    } catch (err) {
      console.log(err);
      res.json(OK, { message: err.message });
    }
  }

  static async getTotalAmount(params){
    const rawDateCondition = `
    ${params?.startDate ? `AND "payment"."date" >= '${params?.startDate}'` : ""}
    ${params?.endDate ? `AND "payment"."date" <= '${params?.endDate}'` : ""}
  `;
    const rawQuery = `
    SELECT COALESCE(SUM("payment"."amount"), 0) AS "totalAmount"
    FROM "payment"
    LEFT JOIN "payment_account" ON "payment"."payment_account_id" = "payment_account"."id"
    LEFT JOIN "account" ON "payment"."account_id" = "account"."id"
    WHERE "payment"."company_id" = ${params?.companyId}
      AND "payment"."deletedAt" IS NULL
      AND "account"."deletedAt" IS NULL
      ${params?.payment_id ? `AND "payment"."id" = ${params?.payment_id}` : ""}
      ${params?.bill_id && Number.isNotNull(params?.bill_id) ? `AND "payment"."bill_id" = ${params?.bill_id}` : ""}
      ${!params?.payment_manage_others ? `AND "payment"."owner_id" = ${params?.userId}` : ""}
      ${params?.account ? `AND "payment"."account_id" = ${params?.account}` : ""}
      ${params?.paymentAccount ? `AND "payment"."payment_account_id" = ${params?.paymentAccount}` : ""}
      ${params?.user ? `AND "payment"."owner_id" = ${params?.user}` : ""}
      ${params?.searchTerm && isNaN(Number.Get(params?.searchTerm)) ? `AND ("payment_account"."payment_account_name" ILIKE '%${params?.searchTerm}%' OR "account"."name" ILIKE '%${params?.searchTerm}%')` : ""}
      ${params?.searchTerm && !isNaN(Number.Get(params?.searchTerm)) ? `AND "payment"."id" = ${params?.searchTerm}` : ""}
      ${rawDateCondition}
      ${params?.excludeStatus && Number.isNotNull(params?.excludeStatus) ? `AND "payment"."status" NOT IN ('${[params?.excludeStatus]}')` : ""}
      ${params?.status ? `AND "payment"."status" = ${params?.status}` : ""}
      ${params?.accountType ? `AND "account"."type" = '${params?.accountType}'` : ""}
      ;`;

    const totalAmountResult = await db.connection.query(rawQuery, {
      type: QueryTypes.SELECT,
    });

    const totalAmount1 = totalAmountResult && totalAmountResult[0].totalAmount;
    return totalAmount1
  }

  static async createAuditLog(olddata, updatedData,req,id) {

    let companyId = Request.GetCompanyId(req);

    let auditLogMessage = new Array();

    if (updatedData?.date && DateTime.DateOnly(updatedData?.date) !== olddata?.date) {
      auditLogMessage.push(`Date Changed to  ${DateTime.shortMonthDate(updatedData.date)}\n`);
    }

    if (updatedData?.due_date && DateTime.DateOnly(updatedData?.due_date) !== olddata?.due_date) {
      auditLogMessage.push(`Due Date Changed to ${DateTime.shortMonthDate(updatedData?.due_date)}\n`);
    }

    if (updatedData?.amount && updatedData?.amount !== olddata?.amount) {
      auditLogMessage.push(`Amount Changed to ${Currency.IndianFormat(updatedData?.amount)}\n`);
    }

    if (updatedData?.status && updatedData?.status !== olddata?.status) {
      let newStatus = await StatusService.getData(updatedData?.status, companyId)
      auditLogMessage.push(`Status Changed to ${newStatus?.name}\n`);
    }

    if (updatedData?.notes && updatedData?.notes !== olddata?.notes) {
      auditLogMessage.push(`Notes Changed  ${updatedData?.notes}\n`);
    }

    if (updatedData?.invoice_number && updatedData?.invoice_number !== olddata?.invoice_number) {
      auditLogMessage.push(`Invoice Number Changed to ${updatedData?.invoice_number}\n`);
    }

    if (updatedData?.owner_id && olddata.owner_id != updatedData?.owner_id) {
      let newValue = await getUserDetailById(updatedData?.owner_id, companyId)
      auditLogMessage.push(`Owner Changed to ${concatName(newValue?.name, newValue?.last_name)}\n`);
    }

    if (updatedData?.account_id && updatedData?.account_id != olddata.account_id) {
      auditLogMessage.push(`Account Changed  ${await accountService.getAccountName(updatedData?.account_id, companyId)}\n`);
    }

    if (updatedData?.payment_account_id && updatedData?.payment_account_id != olddata.payment_account_id) {
      auditLogMessage.push(`Payment Account Changed  ${await getPaymentAccountName(updatedData?.payment_account_id, companyId)}\n`);
    }

    if (auditLogMessage && auditLogMessage.length > 0) {
      let message = auditLogMessage.join();
      History.create(message, req, ObjectName.PAYMENT, id);
    } else {
      History.create("Payment Updated", req, ObjectName.PAYMENT, id);
    }
  }

  static async addFineForDueDateChange(params) {
    try {
  
    let { 
      company_id,
      type,
      user_id,
      due_date,
      numOfDueDateDays,
      object_id,
      object_name
     } = params;

    let fineType = await getSettingValue(type, company_id);
    if (Number.isNotNull(fineType)) {
      const tagDetail = await Tag.findOne({
        where: { id: fineType, company_id: company_id },
      });

      if (Number.isNotNull(tagDetail)) {
        let fineAmount = Number.GetFloat(tagDetail?.default_amount) * numOfDueDateDays;

        let createData = {
          user: user_id,
          type: fineType,
          amount: fineAmount,
          company_id: company_id,
          notes: ` Due Date Changed to ${DateTime.shortDateAndTime(due_date)} \n Due Days Days : ${numOfDueDateDays} \n Fine Amount: ${Currency.IndianFormat(tagDetail?.default_amount)}`,
          object_id,
          object_name
        };
        await fineService.create({ body: createData, user: { id: user_id, company_id: company_id } }, null, null);
      }
    }

        
  } catch (error) {
    console.log(error);
  }


  }
}

module.exports = {
  paymentService,
};
