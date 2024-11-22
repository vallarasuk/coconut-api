// HistoryService
const History = require("../HistoryService");

// Models

const {
  Bill,
  account: accountModel,
  status: statusModel,
  Purchase,
  User,
  Slack,
  Media,
  PurchaseProduct,
  Payment: PaymentModel
} = require("../../db").models;

const { ACTIVE } = require("../../helpers/Account");

const Request = require("../../lib/request");
const ObjectName = require("../../helpers/ObjectName");
const accountService = require("../AccountService");
const Response = require("../../helpers/Response");

const { Op } = require("sequelize");
const { BAD_REQUEST, OK, UPDATE_SUCCESS } = require("../../helpers/Response");
const Currency = require("../../lib/currency");
const DateTime = require("../../lib/dateTime");
const statusService = require("../StatusService");
const DataBaseService = require("../../lib/dataBaseService");
const Boolean = require("../../lib/Boolean");
const StatusService = new DataBaseService(statusModel);
const Permission = require("../../helpers/Permission");
const validator = require("../../lib/validator");
const MediaServices = require("../../services/MediaService");
const SlackService = require("../SlackService");
const UserService = require("../UserService");
const bill = require("../../helpers/Bill");
const Url = require("../../lib/Url");
const companyService = require("../CompanyService");
const { concatName } = require("../../lib/string");
const { UploadFromUrlToS3 } = require("../../lib/s3");
const purchaseService = require("../../services/PurchaseService");
const Number = require("../../lib/Number");
const PurchaseProductService = require("./PurchaseProductService");
const String = require("../../lib/string");
const AddressService = require("../AddressService");
const { getSettingValueByObject } = require("../SettingService");
const { ALLOW_DUPLICATE_INVOICE_NUMBER } = require("../../helpers/Setting");
const ObjectHelper = require("../../helpers/ObjectHelper");
const ArrayList = require("../../lib/ArrayList");
const Setting = require("../../helpers/Setting");
const { paymentService } = require("../PaymentService");

class BillService {
  static async create(req, res, next) {
    const company_id = Request.GetCompanyId(req);

    try {
      const hasPermission = await Permission.Has(Permission.BILL_ADD, req);
     
      let data = req.body;
      let query = {
        order: [["createdAt", "DESC"]],
        where: { company_id },
        attributes: ["bill_number"],
      };
      let billData = await Bill.findOne(query);
      let billNumber;
      let billNumberData = billData && billData.get("bill_number");
      if (!billNumberData) {
        billNumber = 1;
      } else {
        billNumber = parseInt(billNumberData) + 1;
      }

      let allowDuplicateInVoiceNumber = await getSettingValueByObject(ALLOW_DUPLICATE_INVOICE_NUMBER, company_id, data?.account_id, ObjectName.ACCOUNT);

      let where = {}
      if (allowDuplicateInVoiceNumber === "true") {
        where.bill_date = data.date
      }
      where.invoice_number = data?.invoice_number && data?.invoice_number.trim()
      where.account_id = data?.account_id
      where.company_id = company_id

      let existsInvoiceNumber = await Bill.findOne({
        where: where,
      });
      if (existsInvoiceNumber) {
        return res.json(BAD_REQUEST, { message: "Invoice Number Already Exist" });
      }
      let statusData = await statusService.getFirstStatusDetail(ObjectName.BILL, company_id);
      const account_name = data.account_name;
      const createData = {
        bill_number: billNumber,
        bill_date: data?.date,
        billing_name: data?.billing_name,
        status: statusData && statusData.id,
        notes: data?.notes ? data?.notes : '',
        company_id: company_id,
        invoice_number: data?.invoice_number,
        net_amount: Currency.Get(data?.net_amount),
        cess_amount: Currency.Get(data?.cess_amount),
        sgst_amount: Currency.Get(data?.sgst_amount),
        cgst_amount: Currency.Get(data?.cgst_amount),
        igst_amount: Currency.Get(data?.igst_amount),
        account_id: data?.account_id,
        cash_discount_percentage: data?.cash_discount_percentage ? data?.cash_discount_percentage : null,
        cash_discount_amount: data?.cash_discount_amount ? data?.cash_discount_amount : null,
        invoice_amount: data?.invoice_amount,
        other_deduction_amount: data?.otherDeductionAmount ? data?.otherDeductionAmount : null,
        gst_status: await statusService.getFirstStatus(ObjectName.BILL_GST_STATUS, company_id),
        owner_id: await statusService.GetDefaultOwner(statusData?.default_owner, req.user.id),
        due_date: statusData && statusData?.due_date ? statusData?.due_date : data?.due_date ? data?.due_date : null,
        rejected_product_amount: data?.rejectedProductAmount ? data?.rejectedProductAmount : null,
        expiry_returned_product_amount: data?.expiryReturnedProductAmount ? data?.expiryReturnedProductAmount : null,
      };
      if (account_name) {
        let isAccountExist = await accountModel.findOne({
          where: { name: account_name, company_id },
        });
        createData.name = data.account_name;
        createData.account_id = isAccountExist && isAccountExist.id;
        try {
          if (!isAccountExist) {
            await accountModel.create({
              company_id,
              status: ACTIVE,
            });
          }
        } catch (err) {
          console.log(err);
        }
      }

      let detail = await Bill.create(createData);

      if (detail?.id) {

        let purchaseMediaList = []

        if (data && data.purchaseId > 0) {
          purchaseMediaList = await Media.findAll({
            where: { object_id: data.purchaseId, object_name: ObjectName.PURCHASE },
          });
        }


        if (purchaseMediaList && purchaseMediaList.length > 0) {
          //loop the product media
          for (let i = 0; i < purchaseMediaList.length; i++) {
            //destrcture the media Id
            let media = purchaseMediaList[i];
            const mediaUpload = {
              file_name: media.file_name,
              company_id: media.company_id,
              name: media.name,
              feature: media.feature,
              status: media.status,
              object_id: detail?.id,
              object_name: ObjectName.BILL,
              visibility: media.visibility,
            };
            let mediaData = await Media.create(mediaUpload);

            let mediaImage = await MediaServices.getMediaURL(media.id, company_id);

            const mediaId = mediaData.id;

            const imagePath = `${mediaId}-${media.file_name}`;

            await UploadFromUrlToS3(mediaImage, imagePath);
          }
        }
      }
      if (data.purchaseId > 0) {
        await Purchase.update({ bill_id: detail?.id }, { where: { id: data.purchaseId, company_id: company_id } });
      }
      res.on("finish", async () => {
        this.createAuditLog(createData, req, detail?.id)
      });

      res.json(OK, { message: "Bill added", id: detail?.id });
    } catch (err) {
      next(err);
      console.log(err);
    }
  }

  // Get
  static async get(req, res, next) {
    try {
      const { billId } = req.params;

      let companyId = Request.GetCompanyId(req);
      if (!companyId) {
        return res.json(Response.BAD_REQUEST, "Company Not Found");
      }

      if (!billId) {
        return res.json(BAD_REQUEST, { message: "Bill id is required" });
      }

      let purchaseDetails = await purchaseService.getByBillId(billId, companyId);

      let purchaseProductAmount = await PurchaseProduct.sum('net_amount', { where: { purchase_id: purchaseDetails && purchaseDetails?.id, company_id: companyId } });


      const billDetail = await Bill.findOne({
        where: { id: billId, company_id: companyId },
      });

      const status = await StatusService.findOne({
        where: {
          company_id: companyId,
          id: billDetail?.status,
          object_name: ObjectName.BILL,
        },
      });
      let accountDetails;
      if (billDetail.account_id) {
        accountDetails = await accountService.get(billDetail.account_id, companyId);
      }


      if (!billDetail) {
        return res.json(Response.NOT_FOUND, { message: "Bill not found" });
      }


      let mediaDetail = await MediaServices.getMediaURLByObjectId(billId, ObjectName.BILL, companyId);
      let marginData;
      let marginMistached;
      let marginCount;
      let marginMatched;


      if (purchaseDetails && purchaseDetails.vendor_id) {
        marginData = await PurchaseProductService.getCount(
          purchaseDetails && purchaseDetails?.id,
          companyId,
          purchaseDetails.vendor_id
        );

        marginMistached =
          marginData && marginData.mismatchCount > 1
            ? `${marginData.mismatchCount} product margins are not matched`
            : marginData && marginData.mismatchCount == 1
              ? `${marginData.mismatchCount} product margin is not matched`
              : ``;
        marginCount = marginData && marginData.mismatchCount >= 0 ? marginData && marginData.mismatchCount : 0;
      }
      if(marginData && marginData.mismatchCount==0 && marginData.productCount>0 && marginData.matchCount>0 ){
        marginMatched =" All Products Margins are Matched."
      }
      let invoiceMatchedStatus = "";
      let invoiceNotMatchedStatus = "";

      let productAmountMatchedStatus = "";
      let productAmountNotMatchedStatus = "";

      if(purchaseDetails && purchaseDetails?.invoice_amount){
        if (Number.roundOff(purchaseDetails && purchaseDetails.invoice_amount) == Number.roundOff(billDetail && billDetail?.invoice_amount)) {
          invoiceMatchedStatus = "The bill invoice amount and the purchase invoice amount are matched."
        } else {
          invoiceNotMatchedStatus = "The bill invoice amount and the purchase invoice amount are not matched."
        }
      }

      if (Number.roundOff(purchaseProductAmount)) {
        if (Number.roundOff(purchaseProductAmount) == Number.roundOff(billDetail && billDetail?.invoice_amount)) {
          productAmountMatchedStatus = "The bill invoice amount and the product total amount are matched."
        } else {
          productAmountNotMatchedStatus = "The bill invoice amount and the product total amount are not matched."
        }
      }

      let billingAddress =  await AddressService.list({companyId:companyId,objectName:ObjectName.COMPANY})
      let billingOption = [];
      if (billingAddress && billingAddress.length > 0) {
        for (let i = 0; i < billingAddress.length; i++) {
          const title = String.Get(billingAddress[i].title);
          const name = billingAddress[i].name ? String.Get(billingAddress[i].name) : '';
          const label = name ? `${title}, (${name})` : title;
          billingOption.push({ label, value: billingAddress[i].id });
      }
  }

  let paymentAmount = await PaymentModel.sum('amount', { where: { bill_id: billId, company_id: companyId } });
  let pendingPaymentAmount = Number.GetFloat(billDetail?.net_amount)- Number.GetFloat(paymentAmount)
  let deductionAmount = Number.GetFloat(billDetail?.other_deduction_amount)+ Number.GetFloat(billDetail?.rejected_product_amount)+Number.GetFloat(billDetail?.expiry_returned_product_amount)
  let grossAmount = Number.GetFloat(billDetail?.invoice_amount)- Number.GetFloat(deductionAmount)

      const data = {
        id: billId,
        bill_date: billDetail.bill_date,
        billing_name: billDetail.billing_name,
        status_id: billDetail?.status,
        status_name: status?.name,
        colorCode: status?.color_code,
        company_id: req.user.company_id,
        account_id: billDetail && billDetail.account_id,
        account_name: accountDetails && accountDetails.name,
        account: accountDetails,
        paymentAccount: accountDetails?.payment_account,
        invoiceNumber: billDetail.invoice_number,
        media_url: mediaDetail && mediaDetail.media_url,
        mediaName: mediaDetail && mediaDetail.detail && mediaDetail.detail.name,
        mediaId: mediaDetail && mediaDetail.detail && mediaDetail.detail.id,
        netAmount: Currency.Get(billDetail?.net_amount),
        cgstAmount: Currency.Get(billDetail?.cgst_amount),
        sgstAmount: Currency.Get(billDetail?.sgst_amount),
        cessAmount: Currency.Get(billDetail?.cess_amount),
        igstAmount: Currency.Get(billDetail?.igst_amount),
        gst_status: billDetail?.gst_status,
        bill_number: billDetail?.bill_number,
        gstAmount: billDetail?.gst_amount,
        cashDiscountAmount: billDetail?.cash_discount_amount,
        otherDeductionAmount: billDetail?.other_deduction_amount,
        deductionAmount: deductionAmount,
        grossAmount: grossAmount,
        invoiceAmount: billDetail?.invoice_amount,
        notes: billDetail ? billDetail.notes : "",
        cashDiscountPercentage: billDetail?.cash_discount_percentage,
        owner_id: billDetail?.owner_id,
        due_date: billDetail?.due_date,
        rejectedProductAmount: billDetail?.rejected_product_amount ? billDetail?.rejected_product_amount : "",
        purchase_id: purchaseDetails && purchaseDetails?.id,
        expiryReturnedProductAmount: billDetail?.expiry_returned_product_amount
          ? billDetail?.expiry_returned_product_amount
          : "",
          invoiceMatchedStatus:  invoiceMatchedStatus,
          invoiceNotMatchedStatus:   invoiceNotMatchedStatus,
          productAmountMatchedStatus:  productAmountMatchedStatus,
          productAmountNotMatchedStatus:  productAmountNotMatchedStatus,
          marginMistachedText:  marginData && marginData.productCount>0 ?marginMistached:"",
          marginMismatchedCount: marginData && marginData.productCount>0 ? marginCount:"",
          billingOption:billingOption,
          productCount: marginData && marginData.productCount,
          pendingPaymentAmount:pendingPaymentAmount,
          marginMatchedText:marginMatched?marginMatched:""
      };
      return res.json(OK, { data: data });
    } catch (err) {
      console.log(err);
      return res.json(Response.NOT_FOUND, { message: err.message });
    }
  }

  // search
  static async search(params, res) {
    let { page, pageSize, search, sort, sortDir, pagination, purchase_id, account_id, companyId, status, startDate, endDate, account, gstStatus, excludeStatus, bill_manage_others, userId, showTotalAmount, timeZone } = params;
    let date = DateTime.getCustomDateTime(params?.date, timeZone)
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


    if (!companyId) {
      return res.json(400, "Company Not Found");
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      net_amount: "net_amount",
      status: "status",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      account_name: "name",
      bill_date: "bill_date",
      billing_name: "billing_name",
      invoice_number: "invoice_number",
      gst_status: "gst_status",
      bill_number: "bill_number",
      id: "id",
    };

    const sortParam = sort || "updatedAt";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, { message: `Unable to sort payments by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }


    const where = {};

    where.company_id = companyId;
    // Search by name

    if (purchase_id) {
      let data = await Purchase.findOne({
        where: {
          id: purchase_id,
          company_id: companyId,
        },
      });
      if (data) {
        where.id = data.bill_id;
      }
    }

    if (account_id) {
      where.account_id = account_id
    }

    if(Number.isNotNull(status)){
      if(typeof status === "string"){
        let ids = status?.split(",");
        if(ArrayList.isArray(ids)){
          where.status={
            [Op.in]:ids
          }
        }
      }else{
        where.status = status;
      }
    }

    if (excludeStatus) {
      where.status = {
        [Op.notIn]: [excludeStatus]
      };
    }

    if (!bill_manage_others && userId) {
      where.owner_id = userId
    }

    if (startDate && !endDate) {
      where.bill_date = {
        [Op.and]: {
          [Op.gte]: startDate,
        },
      };
    }

    if (endDate && !startDate) {
      where.bill_date = {
        [Op.and]: {
          [Op.lte]: endDate,
        },
      };
    }

    if (startDate && endDate) {
      where.bill_date = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      };
    }
    if(date && Number.isNotNull(params?.date)){
      where.bill_date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    if (account) {
      where.account_id = account;
    }

    if (gstStatus) {
      where.gst_status = gstStatus;
    }
    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          billing_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          invoice_number: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          '$account.name$': {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    let order = [];

    if (sort === "account_name") {
      order.push([{ model: accountModel, as: "account" }, "name", sortDirParam]);
    }
    if (sort === "status") {
      order.push([[{ model: statusModel, as: 'statusDetail' }, 'name', sortDirParam]])
    }
    if (sort !== "account_name" && sort !== "status" && sort) {
      order.push([sortParam, sortDirParam]);
    }

    const query = {
      attributes: { exclude: ["deletedAt"] },
      order: order,
      include: [
        {
          required: false,
          model: accountModel,
          as: "account",
        },
        {
          required: false,
          model: statusModel,
          as: "statusDetail",
        },
        {
          required: false,
          model: statusModel,
          as: "gstStatusDetail",
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
    const totalAmountQuery = {
      include: [
        {
          required: false,
          model: accountModel,
          as: "account",
        },
        {
          required: false,
          model: statusModel,
          as: "statusDetail",
        },
        {
          required: false,
          model: statusModel,
          as: "gstStatusDetail",
        },
      ],
      where,
    };

    try {

      let totalAmount = 0;
      const totalAmountBilldetails = await Bill.findAndCountAll(totalAmountQuery);

      totalAmountBilldetails.rows.forEach((value) => {
        totalAmount += Number.Get(value.get("net_amount"));
      });
      // Get account list and count
      const details = await Bill.findAndCountAll(query);

      // Return account list is null
      const data = [];
      if (details.count === 0) {
        return data
      }

      let billingAddress =  await AddressService.list({ companyId: companyId, objectName: ObjectName.COMPANY })
      let billingOption = [];
      if (billingAddress && billingAddress.length > 0) {
        for (let i = 0; i < billingAddress.length; i++) {
          const title = String.Get(billingAddress[i].title);
          const name = billingAddress[i].name ? String.Get(billingAddress[i].name) : '';
          const label = name ? `${title}, (${name})` : title;
          billingOption.push({ label, value: billingAddress[i].id });
        }
      }
      details.rows.forEach(async (billsValue) => {
        const {
          id,
          bill_date,
          net_amount,
          createdAt,
          updatedAt,
          billing_name,
          bill_number,
          account,
          invoice_number,
          statusDetail,
          gstStatusDetail,
          invoice_amount,
          cash_discount_amount,
          other_deduction_amount,
          cash_discount_percentage,
          rejected_product_amount,
          expiry_returned_product_amount,
          due_date,
          owner_id,
          gst_amount,
          notes,

        } = billsValue.get();
        let deductionAmount = Number.GetFloat(other_deduction_amount) + Number.GetFloat(rejected_product_amount) + Number.GetFloat(expiry_returned_product_amount)
        let grossAmount = Number.GetFloat(invoice_amount) - Number.GetFloat(deductionAmount)

        data.push({
          id,
          bill_number: bill_number,
          bill_date: DateTime.Format(bill_date),
          date: bill_date,
          status: statusDetail?.name,
          colorCode: statusDetail?.color_code,
          netAmount: Currency.Get(net_amount),
          account_name: account && account?.name,
          account_id: account && account?.id,
          billing_name: billing_name,
          invoiceNumber: invoice_number,
          gst_status: gstStatusDetail?.name,
          gst_status_color: gstStatusDetail?.color_code,
          gst_status_id: gstStatusDetail?.id,
          invoiceAmount: invoice_amount,
          createdAt: DateTime.defaultDateFormat(createdAt),
          updatedAt: DateTime.defaultDateFormat(updatedAt),
          statusDetails: statusDetail,
          cashDiscountAmount: cash_discount_amount,
          otherDeductionAmount: other_deduction_amount,
          cashDiscountPercentage: cash_discount_percentage,
          due_date: due_date,
          rejectedProductAmount: rejected_product_amount,
          expiryReturnedProductAmount: expiry_returned_product_amount,
          owner_id: owner_id,
          notes: notes,
          gstAmount: gst_amount,
          billingOption: billingOption,
          deductionAmount: deductionAmount,
          grossAmount: grossAmount,
        });
      });

      if (showTotalAmount) {
        let newRecord = ObjectHelper.createEmptyRecord(data[0])
        newRecord.netAmount = totalAmount
        data.push(newRecord)
      }

      return {
        totalCount: details.count,
        totalAmount,
        currentPage: page,
        pageSize,
        data,
        search,
        sort,
        sortDir,
        status: status ? status : "",
      }
    } catch (err) {
      console.log(err);
      res.json(OK, { message: err.message });
    }
  }

  // Update
  static async update(req, res, next) {
    try {
      const hasPermission = await Permission.Has(Permission.BILL_EDIT, req);
    
      const id = req.params.id;
    let roleId = Request.getUserRole(req);

      const companyId = Request.GetCompanyId(req);
      const {
        net_amount,
        status,
        account_id,
        date,
        billing_name,
        invoice_number,
        gst_status,
        cess_amount,
        sgst_amount,
        cgst_amount,
        igst_amount,
        gstAmount,
        cash_discount_amount,
        otherDeductionAmount,
        notes,
        invoice_amount,
        cash_discount_percentage,
        owner, due_date,
        rejectedProductAmount,
        expiryReturnedProductAmount,
        deductionAmount,
        grossAmount
      } = req.body;
      if (!id) {
        return res.json(BAD_REQUEST, { message: "Bill id is required" });
      }

      const billDetail = await Bill.findOne({
        where: { id: id, company_id: companyId },
      });
      let ownerDetails = null;
      if (owner) {
        ownerDetails = await User.findOne({
          where: { id: owner, company_id: companyId },
        });
      }
      let billDetailOwner;
      if (billDetail?.owner_id) {
        billDetailOwner = await User.findOne({
          where: { id: billDetail.owner_id, company_id: companyId },
        });
      }
      const details = await statusModel.findOne({
        where: { id: req?.body?.status ? req?.body?.status : null, company_id: companyId },
      });
      if (!billDetail) {
        return res.json(BAD_REQUEST, { message: "Invalid Bill id" });
      } else {
        let existsInvoiceNumber = await Bill.findOne({
          where: { bill_date: date, invoice_number: invoice_number, id: { [Op.not]: id } },
        });
        if (existsInvoiceNumber) {
          return res.json(BAD_REQUEST, { message: "Invoice Number Already Exist" });
        }
      }

      const updateData = {};
      if (id) {
        updateData.id = id;
      }

      if (validator.isNotEmpty(date) && date !== billDetail.bill_date) {
        updateData.bill_date = date;
      }
      if (due_date || due_date === "" && due_date !== billDetail.due_date) {
        updateData.due_date = due_date !== "" ? due_date : null;
      }
      if (validator.isNotEmpty(billing_name) && billing_name !== billDetail.billing_name) {
        updateData.billing_name = billing_name;
      }

      if (gst_status && gst_status !== billDetail.gst_status) {
        updateData.gst_status = gst_status;
      }

      if (notes !== billDetail.notes) {
        updateData.notes = notes ? notes : null;
      }

      if (validator.isNotEmpty(req?.body?.status)) {
        updateData.status = req?.body?.status;
      }

      if (validator.isNotEmpty(account_id) && Number.Get(account_id) !== billDetail.account_id) {
        updateData.account_id = account_id;
      }
      if (validator.isNotEmpty(owner) && Number.Get(owner) !== billDetail.owner_id) {
        updateData.owner_id = Number.Get(owner);
      }
      if (validator.isNotEmpty(invoice_number) && invoice_number !== billDetail.invoice_number) {
        updateData.invoice_number = invoice_number;
      }

      if (validator.isNotEmpty(net_amount) && net_amount !== billDetail.net_amount) {
        updateData.net_amount = net_amount;
      }

      if (validator.isNotEmpty(cess_amount) && cess_amount !== billDetail.cess_amount) {
        updateData.cess_amount = cess_amount;
      }

      if (validator.isNotEmpty(sgst_amount) && sgst_amount !== billDetail.sgst_amount) {
        updateData.sgst_amount = sgst_amount;
      }

      if (validator.isNotEmpty(cgst_amount) && cgst_amount !== billDetail.cgst_amount) {
        updateData.cgst_amount = cgst_amount;
      }

      if (validator.isNotEmpty(igst_amount) && igst_amount !== billDetail.igst_amount) {
        updateData.igst_amount = igst_amount;
      }

      if (validator.isNotEmpty(gstAmount) && gstAmount !== billDetail.gst_amount) {
        updateData.gst_amount = gstAmount ? gstAmount : null;
      }

      if (validator.isNotEmpty(cash_discount_amount) && cash_discount_amount !== billDetail.cash_discount_amount) {
        updateData.cash_discount_amount = cash_discount_amount ? cash_discount_amount : null;
      }

      if (validator.isNotEmpty(otherDeductionAmount) && otherDeductionAmount !== billDetail.other_deduction_amount) {
        updateData.other_deduction_amount = otherDeductionAmount ? otherDeductionAmount : null;
      }

      if (validator.isNotEmpty(invoice_amount) && invoice_amount !== billDetail.invoice_amount) {
        updateData.invoice_amount = invoice_amount ? invoice_amount : null;
      }
      if (validator.isNotEmpty(rejectedProductAmount) && rejectedProductAmount !== billDetail.rejected_product_amount) {
        updateData.rejected_product_amount = rejectedProductAmount ? rejectedProductAmount : null;
      }

      if (validator.isNotEmpty(expiryReturnedProductAmount) && expiryReturnedProductAmount !== billDetail.expiry_returned_product_amount) {
        updateData.expiry_returned_product_amount = expiryReturnedProductAmount ? expiryReturnedProductAmount : null;
      }
      if (validator.isNotEmpty(cash_discount_percentage) && cash_discount_percentage !== billDetail.cash_discount_percentage) {
        updateData.cash_discount_percentage = cash_discount_percentage ? cash_discount_percentage : null;
      }
      const data = await Bill.update(updateData, {
        where: { id: id, company_id: companyId },
      });

      res.on("finish", async () => {

        if ((DateTime.isValidDate(due_date) && DateTime.isValidDate((billDetail.due_date)) && billDetail.due_date !== DateTime.getSQlFormattedDate(due_date))) {
          let isEnabledFineAddForDueDateChange = await getSettingValueByObject(
            Setting.FINE_ADD_FOR_BILL_DUE_DATE_CHANGE,
            companyId,
            roleId,
            ObjectName.ROLE
          );
          let numOfDueDateDays = DateTime.getDayCountByDateRange(billDetail?.due_date, DateTime.getSQlFormattedDate(due_date));
          if (isEnabledFineAddForDueDateChange && isEnabledFineAddForDueDateChange == "true") {
            let params = {
              company_id: companyId,
              type: Setting.BILL_DUE_DATE_CHANGE_FINE_TYPE,
              user_id: billDetail?.owner_id,
              due_date,
              numOfDueDateDays,
              object_id: billDetail?.id,
              object_name: ObjectName.BILL
            }
            await paymentService.addFineForDueDateChange(params)
          }
        }

        this.updateAuditLog(req?.body, billDetail, req, id, ownerDetails, details)
      });
      res.json({ message: "Bill Updated", data: data, });

    } catch (error) {
      console.log(error);
    }
  }

  //update Status
  static async updateStatus(req, res, next) {
    let id = req?.params?.id;
    let data = req?.body?.status;
    const companyId = Request.GetCompanyId(req);

    const status = await StatusService.findOne({
      where: {
        company_id: companyId,
        id: data,
        object_name: ObjectName.BILL,
      },
    });
    const billDetails = await Bill.findOne({ where: { id: id, company_id: companyId } });
    if (!billDetails) {
      return res.json(BAD_REQUEST, { message: "Bill Details Not Found" });
    }

    let companyDetail = await companyService.getCompanyDetailById(companyId);

    let updateData = {
      status: data
    }

    if (status && status?.default_owner) {
      updateData.owner_id = await statusService.GetDefaultOwner(status?.default_owner, req.user.id)
    }

    let dueDate = await statusService.getDueDate(data, companyId);
    if (dueDate) {
      updateData.due_date = dueDate
    }

    billDetails.update(updateData).then((response) => {
      res.json(200, { message: "Bill Updated" });

      let params = {
        billNumber: billDetails.bill_number,
        statusData: status,
        companyId: companyId,
        id: id,
        ownerId: billDetails?.owner_id,
        userId: req && req.user && req?.user?.id,
        companyDetail: companyDetail
      }
      res.on("finish", async () => {
        History.create(`Status updated to ${status.name}`, req, ObjectName.BILL, id);
        this.sendStatusChangeSlackNotification(params)

      });
    });
  }

  // delete
  static async del(req, res) {
    try {
      const hasPermission = await Permission.Has(Permission.BILL_DELETE, req);
    
      const id = req.params.id;
      const company_id = Request.GetCompanyId(req);

      await Bill.destroy({ where: { id: id, company_id: company_id } });

      res.json(200, { message: "Bill Deleted" });

      res.on("finish", async () => {
        History.create("Bill Deleted", req, ObjectName.BILL, id);
      });
    } catch (err) {
      return res.json(400, { message: err.message });
    }
  }


  //Send Slack Notification
  static async sendStatusChangeSlackNotification(params) {
    let { billNumber, statusData, companyId, id, ownerId, userId, companyDetail } = params
    try {

      let getSlackId = await UserService.getSlack(ownerId, companyId);

      let userData = await UserService.getSlack(userId, companyId);

      if (statusData && statusData.notify_to_owner == bill.NOTIFY_OWNER_ENABLED && getSlackId) {
        const billIdUrl = ` <${companyDetail.portal_url}/bill/detail/${id}|${billNumber}>`;
        const text = unescape(`Bill ${billIdUrl} status changed to ${statusData.name} by <@${userData?.slack_id}> `);
        SlackService.sendMessageToUser(companyId, getSlackId?.slack_id, text);

      }
    } catch (err) {
      console.log(err);
    }
  }

  static async updateAuditLog(updatedData, olddata, req, id, ownerDetails, details) {

    try{

      let companyId = Request.GetCompanyId(req);

      let auditLogMessage = new Array();

      const statusDetails = await StatusService.findOne({
        where: { id: updatedData?.gst_status ? updatedData?.gst_status : null, company_id: companyId },
      });

      if (updatedData?.date && DateTime.shortMonthDate(updatedData?.date) !== DateTime.shortMonthDate(olddata.bill_date)) {
        auditLogMessage.push(`Date Changed from to ${DateTime.shortMonthDate(updatedData?.date)}\n`);
      }
      if (updatedData?.due_date && DateTime.shortMonthDate(updatedData?.due_date) !== DateTime.shortMonthDate(olddata.due_date)) {
        if (updatedData?.due_date !== olddata.due_date) {
          auditLogMessage.push(`Due Date Changed ${DateTime.shortMonthDate(updatedData?.due_date)}\n`);
        }
      }
      if (updatedData?.billing_name && updatedData?.billing_name !== olddata.billing_name) {
        auditLogMessage.push(`Billing Name Changed to ${updatedData?.billing_name}\n`);
      }

      if (updatedData?.gst_status && updatedData?.gst_status !== olddata.gst_status) {
        if (updatedData?.gst_status !== "") {
          auditLogMessage.push(`GST Status Changed  to ${statusDetails?.name}\n`);
        }
      }

      if (validator.isNotEmpty(updatedData?.notes) && updatedData?.notes !== olddata.notes) {
        auditLogMessage.push(`Notes updated to ${updatedData?.notes}\n`);
      }

      if (validator.isNotEmpty(updatedData?.account_id) && Number.Get(updatedData?.account_id) !== olddata.account_id) {
        auditLogMessage.push(`Account Changed  to ${await accountService.getAccountName(updatedData?.account_id, companyId)}\n`);
      }
      if (validator.isNotEmpty(updatedData?.owner) && ownerDetails && Number.Get(updatedData?.owner) !== Number.Get(olddata.owner_id)) {
        auditLogMessage.push(`Owner Changed to ${ownerDetails?.name}\n`);
      }
      if (updatedData?.invoice_number && updatedData?.invoice_number !== olddata?.invoice_number) {
        auditLogMessage.push(`Invoice Number Changed  to ${updatedData?.invoice_number}\n`);
      }
      if (validator.isNotEmpty(updatedData?.net_amount) && updatedData?.net_amount !== olddata.net_amount) {
        auditLogMessage.push(`Net Amount Changed to ${Currency.IndianFormat(updatedData?.net_amount)}\n`);
      }

      if (validator.isNotEmpty(updatedData?.cess_amount) && updatedData?.cess_amount !== olddata.cess_amount) {
        auditLogMessage.push(`CESS Amount Changed  to ${Currency.IndianFormat(updatedData?.cess_amount)}\n`);
      }

      if (validator.isNotEmpty(updatedData?.sgst_amount) && updatedData?.sgst_amount !== olddata.sgst_amount) {
        auditLogMessage.push(`SGST Amount Changed  to ${Currency.IndianFormat(updatedData?.sgst_amount)}\n`);
      }

      if (validator.isNotEmpty(updatedData?.cgst_amount) && updatedData?.cgst_amount !== olddata.cgst_amount) {
        auditLogMessage.push(`CGST Amount Changed to ${Currency.IndianFormat(updatedData?.cgst_amount)}\n`);
      }

      if (validator.isNotEmpty(updatedData?.igst_amount) && updatedData?.igst_amount !== olddata.igst_amount) {
        auditLogMessage.push(`IGST Amount Changed to ${Currency.IndianFormat(updatedData?.igst_amount)}\n`);
      }

      if (validator.isNotEmpty(updatedData?.gstAmount) && updatedData?.gstAmount !== olddata.gst_amount) {
        if (updatedData?.gstAmount !== "") {
          auditLogMessage.push(`GST Amount Changed  to ${Currency.IndianFormat(updatedData?.gstAmount)}\n`);
        }
      }

      if (updatedData?.cashDiscountAmount && Number.GetFloat(olddata?.cash_discount_amount) !== Number.GetFloat(updatedData?.cashDiscountAmount)) {
        if (updatedData?.cashDiscountAmount !== "") {
          auditLogMessage.push(`Cash Discount Amount Changed  to ${Currency.IndianFormat(updatedData?.cashDiscountAmount)}\n`);
        }
      }
      if (updatedData?.rejectedProductAmount && Number.GetFloat(olddata?.rejected_product_amount) !== Number.GetFloat(updatedData?.rejectedProductAmount)) {
        if (updatedData?.rejectedProductAmount !== "") {
          auditLogMessage.push(`Rejected Product Amount Changed to ${Currency.IndianFormat(updatedData?.rejectedProductAmount)}\n`);
        }
      }

      if (updatedData?.expiryReturnedProductAmount && Number.GetFloat(olddata?.expiry_returned_product_amount) !== Number.GetFloat(updatedData?.expiryReturnedProductAmount)) {
        if (updatedData?.expiryReturnedProductAmount !== "") {
          auditLogMessage.push(`Expiry Product Amount Changed to ${Currency.IndianFormat(updatedData?.expiryReturnedProductAmount)}\n`);
        }
      }


      if (validator.isNotEmpty(updatedData?.otherDeductionAmount) && Number.GetFloat(olddata.other_deduction_amount) !== Number.GetFloat(updatedData?.otherDeductionAmount)) {
        if (updatedData?.otherDeductionAmount !== "") {
          auditLogMessage.push(`Other Deducation Amount Changed  to ${Currency.IndianFormat(updatedData?.otherDeductionAmount)}\n`);
        }
      }

      if (validator.isNotEmpty(updatedData?.invoice_amount) && Number.GetFloat(olddata.invoice_amount) !== Number.GetFloat(updatedData?.invoice_amount)) {
        if (updatedData?.invoice_amount !== "") {
          auditLogMessage.push(`Invoice Amount Changed  to ${Currency.IndianFormat(updatedData?.invoice_amount)}\n`);
        }
      }

      if (validator.isNotEmpty(updatedData?.cash_discount_percentage) && Number.GetFloat(olddata.cash_discount_percentage) !== Number.GetFloat(updatedData?.cash_discount_percentage)) {
        if (updatedData?.cash_discount_percentage !== "") {
          auditLogMessage.push(`Cash Discount Percentage Changed  to ${updatedData?.cash_discount_percentage}\n`);
        }
      }
      if (details?.name) {
        auditLogMessage.push(`Status changed to ${details.name}\n`);
      }
      if (auditLogMessage && auditLogMessage.length > 0) {
        let message = auditLogMessage.join();
        History.create(message, req, ObjectName.BILL, id);
      }

    }catch(err){
      console.log(err);
    }

  }


  static async createAuditLog(createData, req, id) {
    let companyId = Request.GetCompanyId(req);

    let auditLogMessage = new Array();

    if (createData?.bill_number) {
      auditLogMessage.push(`Bill Number: ${createData.bill_number}\n`);
    }

    if (createData?.bill_date) {
      auditLogMessage.push(`Bill Date: ${DateTime.shortMonthDate(createData.bill_date)}\n`);
    }

    if (createData?.billing_name) {
      auditLogMessage.push(`Billing Name: ${createData.billing_name}\n`);
    }

    if (createData?.status) {
      let statusDetail = await statusService.getData(createData.status, companyId)
      auditLogMessage.push(`Status: ${statusDetail?.name}\n`);
    }

    if (createData?.invoice_number) {
      auditLogMessage.push(`Invoice Number: ${createData.invoice_number}\n`);
    }

    if (createData?.net_amount) {
      auditLogMessage.push(`Net Amount: ${Currency.IndianFormat(createData.net_amount)}\n`);
    }

    if (createData?.cess_amount) {
      auditLogMessage.push(`CESS Amount: ${Currency.IndianFormat(createData.cess_amount)}\n`);
    }

    if (createData?.sgst_amount) {
      auditLogMessage.push(`SGST Amount: ${Currency.IndianFormat(createData.sgst_amount)}\n`);
    }

    if (createData?.cgst_amount) {
      auditLogMessage.push(`CGST Amount: ${Currency.IndianFormat(createData.cgst_amount)}\n`);
    }

    if (createData?.igst_amount) {
      auditLogMessage.push(`IGST Amount: ${Currency.IndianFormat(createData.igst_amount)}\n`);
    }

    if (createData?.account_id) {
      auditLogMessage.push(`Account: ${await accountService.getAccountName(createData.account_id, companyId)}\n`);
    }

    if (createData?.cash_discount_percentage) {
      auditLogMessage.push(`Cash Discount Percentage: ${Currency.IndianFormat(createData.cash_discount_percentage)}\n`);
    }

    if (createData?.cash_discount_amount) {
      auditLogMessage.push(`Cash Discount Amount: ${Currency.IndianFormat(createData.cash_discount_amount)}\n`);
    }

    if (createData?.invoice_amount) {
      auditLogMessage.push(`Invoice Amount: ${Currency.IndianFormat(createData.invoice_amount)}\n`);
    }


    if (createData?.other_deduction_amount) {
      auditLogMessage.push(`Other Deduction Amount: ${Currency.IndianFormat(createData.other_deduction_amount)}\n`);
    }

    if (createData?.owner_id) {
      let getOwnerDetail = await UserService.getUserDetailById(createData?.owner_id, companyId)
      auditLogMessage.push(`Owner: ${concatName(getOwnerDetail?.name, getOwnerDetail?.last_name)}\n`);
    }

    if (createData?.due_date) {
      auditLogMessage.push(`Due date: ${DateTime.shortMonthDate(createData.due_date)}\n`);
    }

    if (createData?.rejected_product_amount) {
      auditLogMessage.push(`Rejected Product Amount: ${Currency.IndianFormat(createData.rejected_product_amount)}\n`);
    }

    if (createData?.expiry_returned_product_amount) {
      auditLogMessage.push(`Expiry Returned Product Amount: ${Currency.IndianFormat(createData.expiry_returned_product_amount)}\n`);
    }

    if (createData?.name) {
      auditLogMessage.push(`Name: ${createData.name}\n`);
    }

    if (auditLogMessage && auditLogMessage.length > 0) {
      let message = auditLogMessage.join();
      History.create(`Bill Created From: ${message}`, req, ObjectName.BILL, id);
    } else {
      History.create("Bill Created", req, ObjectName.BILL, id);
    }

  }

  static async updateGstStatus(req, res, next) {
    let id = req?.params?.id;
    let statusId = req?.body?.gst_status;
    const companyId = Request.GetCompanyId(req);

    const billDetails = await Bill.findOne({ where: { id: id, company_id: companyId } });
    if (!billDetails) {
      return res.json(BAD_REQUEST, { message: "Bill Details Not Found" });
    }

    let updateData = {
      gst_status: Number.Get(statusId)
    }

    const status = await StatusService.findOne({
      where: {
        company_id: companyId,
        id: Number.Get(statusId),
        object_name: ObjectName.BILL_GST_STATUS,
      },
    });
    billDetails.update(updateData).then((response) => {
      res.json(200, { message: "Gst Status Updated" });
      res.on("finish", async () => {

        if(status && status?.name){
          History.create(`GstStatus updated to ${status.name}`, req, ObjectName.BILL, id);
        }else{
          History.create(`GstStatus Removed`, req, ObjectName.BILL, id);
        }
      });
    });
  }

  static async getBillDetailById(billId, companyId) {
    const billDetail = await Bill.findOne({
      where: { id: billId, company_id: companyId },
    });

    return billDetail && billDetail;
  }
}

module.exports = { BillService };
