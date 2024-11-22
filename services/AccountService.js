/**
 * Module dependencies
 */
const { Op, Sequelize } = require("sequelize");
const DataBaseService = require("../lib/dataBaseService");

const {
    account,
    Purchase,
    status: StatusModel,
    vendorProduct,
    PaymentAccount,
    AccountType: AccountTypeModel,
    AddressModel
} = require("../db").models;
const accountService = new DataBaseService(account);
const History = require("./HistoryService");
const ObjectName = require("../helpers/ObjectName");
const Response = require("../helpers/Response");
const { STATUS_COMPLETED_TEXT } = require("../helpers/PurchaseOrder");
const DateTime = require("../lib/dateTime");
const purchaseService = new DataBaseService(Purchase);
const statusService = new DataBaseService(StatusModel);
const Boolean = require('../lib/Boolean');
const validator = require("../lib/validator");
const Account = require("../helpers/Account");
const Url = require("../lib/Url");
const Status = require("../helpers/Status");
const Number = require("../lib/Number");
const Request = require("../lib/request");
const { sequelize } = require("../db");
const AddressService = require("./AddressService");
const String = require("../lib/string");
const AccountTypeService = require("./AccountTypeService");

/**
 * Check whether vendor exist or not
 *
 * @param {*} vendorBaseUrl
 */
const isExistByVendorUrl = async (url, companyId) => {
    const baseUrl = url.match(/^https?:\/\/[^#?\/]+/)[0];
    const splitUrl = baseUrl.split(".");

    const vendorName = splitUrl[splitUrl.length - 2];

    const vendorDetails = await accountService.findOne({
        where: { url: { [Op.iLike]: `%${vendorName}%` }, company_id: companyId },
    });

    if (!vendorDetails) return false;

    return vendorDetails;
};

/**
 * Get vendor id
 *
 * @params vendorBaseUrl
 */
const getVendorId = async (vendorBaseUrl, companyId) => {
    if (!vendorBaseUrl) {
        return null;
    }

    const Vendor = await accountService.findOne({
        where: { url: vendorBaseUrl, company_id: companyId },
    });

    // Validate vendor name exist
    if (Vendor) {
        return Vendor.id;
    } else {
        const newVendorData = {
            name: vendorBaseUrl,
            status: vendorBaseUrl,
            url: vendorBaseUrl,
            company_id: companyId
        };

        // Create new vendor
        const newVendor = await account.create(newVendorData);
        return newVendor.id;
    }
};


const get = async (vendor_id, companyId) => {
    try {


        const vendorDetails = await accountService.findOne({
            attributes: ["name", "id","payment_terms","return_terms", "payment_account","billing_name","cash_discount"],
            where: { id: vendor_id, company_id: companyId },
        });
        return vendorDetails
    } catch (err) {
        console.log(err);
    }
}



const create = async (req, res, next) => {
    const data = req.body;
    const companyId = Request.GetCompanyId(req);
    if (!companyId) {
        return res.json(Response.BAD_REQUEST, { message: "Company Not Found" })
    }

    // Validate name
    if (!data.vendor_name) {
        return res.json(Response.BAD_REQUEST, { message: "Name is required" });
    }

    // Validate Url
    // if (!data.vendorUrl) {
    //     return res.json(Response.BAD_REQUEST, { message: "Url is required"});
    // }
    let type;
    if (data?.type){
        type = data?.type
    }else if(data?.accountCategory){
        let params={
            category: data.accountCategory,
            companyId: companyId
          }
        let typeIds = await AccountTypeService.getAccountTypeByCategory(params)
        type=typeIds[0]
    }else{
        let category = data.tab === Account.TAB_CUSTOMER ? Account.CATEGORY_CUSTOMER : data.tab === Account.TAB_EMPLOYER ? Account.CATEGORY_EMPLOYEE : Account.CATEGORY_VENDOR
        let params={
            category: category,
            companyId: companyId
          }
        let typeIds = await AccountTypeService.getAccountTypeByCategory(params)
        type=typeIds[0]
    }
    const historyMessage = []
    // vendor data
    const vendorData = {
        name: data.vendor_name,
        status: Status.ACTIVE ? Status.ACTIVE : data.status,
        company_id: companyId,
        type: type ? type : data.tab === Account.TAB_CUSTOMER ? Account.CATEGORY_CUSTOMER : data.tab === Account.TAB_EMPLOYER ? Account.CATEGORY_EMPLOYEE : Account.CATEGORY_VENDOR,
        cash_discount: data?.cash_discount ? data?.cash_discount : null,
        return_terms: data?.return_terms,
        payment_account: data?.payment_account ? data?.payment_account : null,
        payment_terms: data?.payment_terms,
        url: data?.vendor_url,
        notes: Url.RawURLEncode(data?.notes) ? Url.RawURLEncode(data?.notes) : null,
        gst_number: data?.gst_number ? data?.gst_number : null,
        mobile: data.mobile,
        billing_name: Number.Get(data?.billing_name),

    };

    if (data.vendor_name) {
        historyMessage.push("Vendor Added \n")
        historyMessage.push(`Name: ${data?.vendor_name}\n`)
    }

    if (data.status) {
        historyMessage.push(`Status: ${data?.status}\n`)
    }

    if (data.cash_discount) {
        historyMessage.push(`cash_discount: ${data?.cash_discount}\n`)

    }
    if (data.return_terms) {
        historyMessage.push(`return_terms: ${data?.return_terms}\n`)

    }
    if (data.payment_terms) {
        historyMessage.push(`payment_terms: ${data?.payment_terms}\n`)

    }
    if (data.vendor_url) {
        historyMessage.push(`vendor_url: ${data?.vendor_url}\n`)

    }
    if (data.billing_name) {
        historyMessage.push(`billing_name: ${data?.billing_name}\n`)

    }
    if (data.type) {
        historyMessage.push(`Type : 
        ${data.type === Account.CATEGORY_CUSTOMER
                ? Account.CUSTOMER
                : data.type === Account.CATEGORY_VENDOR
                    ? Account.VENDOR
                    : data.type === Account.CATEGORY_EMPLOYEE
                        ? Account.EMPLOYER
                        : Account.TYPE_OTHER
                            ? Account.OTHER
                            : ""}\n`);
    }

    try {
        const vendorname = data.vendor_name;
        const status = data.status;
        if(data.mobile){
            const mobileExist = await accountService.findOne({
                where: {status: status, company_id: companyId,mobile : data.mobile},
            });
            if(mobileExist){
                res.json(Response.OK, { message: "Mobile Number Already Exist", vendor_id: mobileExist.id });

            }
        }

        // Validate duplicate vendor name
        const vendorExist = await accountService.findOne({
            where: { name: vendorname, status: status, company_id: companyId },
        });
        if (vendorExist) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor name already exist" });
        }
        // Create vendor
        const Vendor = await accountService.create(vendorData);
        res.json(Response.OK, { message: "Vendor Added", vendor_id: Vendor.id });
        res.on("finish", async () => {
            if (historyMessage && historyMessage.length > 0) {
                const message = historyMessage.join();
                History.create(message, req, ObjectName.ACCOUNT, Vendor.id);
            } else {
                History.create("Vendor Created", req, ObjectName.ACCOUNT, Vendor.id);
            }
        })

        // API response

    } catch (err) {
        console.log(err);
        res.json(Response.BAD_REQUEST, { message: err.message });
    }

}

const getDetail = async (req, res, next) => {
    try {


        const { id } = req.params;

        let companyId = Request.GetCompanyId(req)
        // Validate Vendor id
        if (!id) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor id is required" });
        }

        // Validate Vendor is exist or not
        const vendorDetails = await accountService.findOne({
            where: { id: Number.Get(id), company_id: companyId },
            include: [{ model: AccountTypeModel, as: "accountTypeDetail", required: false }]
        });
        if (!vendorDetails) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor not found" });
        }


        let billingAddress = await AddressService.list({ companyId: companyId, objectName: ObjectName.COMPANY })
        let billingOption = [];
        if (billingAddress && billingAddress.length > 0) {
            for (let i = 0; i < billingAddress.length; i++) {
                const title = String.Get(billingAddress[i].title);
                const name = billingAddress[i].name ? String.Get(billingAddress[i].name) : '';
                const label = name ? `${title}, (${name})` : title;
                billingOption.push({ label, value: billingAddress[i].id });
            }
        }

        let billingName = billingOption.find(value=> value.value == vendorDetails.billing_name)
        // API response
        res.json(Response.OK, {
            data: {
                vendorId: vendorDetails.id,
                vendorName: vendorDetails.name,
                vendorUrl: vendorDetails.url,
                gstNumber: vendorDetails.gst_number,
                status: vendorDetails.status,
                email: vendorDetails.email,
                mobile: vendorDetails.mobile,
                work_phone: vendorDetails.work_phone,
                address1: vendorDetails.address1,
                address2: vendorDetails.address2,
                city: vendorDetails.city,
                country: vendorDetails.country,
                accountCategory:vendorDetails && vendorDetails.accountTypeDetail && vendorDetails.accountTypeDetail.category,
                state: vendorDetails.state,
                pin_code: vendorDetails.pin_code,
                type: vendorDetails.type,
                cash_discount: vendorDetails.cash_discount,
                payment_terms: vendorDetails.payment_terms,
                return_terms: vendorDetails.return_terms,
                payment_account: vendorDetails?.payment_account,
                notes: vendorDetails?.notes && validator.isValidDraftFormat(Url.RawURLDecode(vendorDetails?.notes)) ? Url.RawURLDecode(vendorDetails?.notes) : validator.convertTextToDraftFormat(vendorDetails?.notes),
                billingOption:billingOption,
                billing_name: billingName && billingName.label,
                billing_id: billingName && billingName.value,


            },
        });
    } catch (err) {
        console.log(err);
    }
}

const search = async (req, res, next) => {
    let { page, pageSize, search, sort, sortDir, pagination, status, accountType, id, accountCategory, type } = req.query;
    // Validate if page is not a number

    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
        return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        id: "id",
        vendorName: "name",
        vendorUrl: "url",
        LastPurchasedAt: "createdAt",
        updatedAt: "updatedAt",
        status: "status",
        type: "type",
    };

    const sortParam = sort || "vendorName";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(Response.BAD_REQUEST, {
            message: `Unable to sort Supplier by ${sortParam}`,
        });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;
    const where = {};
    where.company_id = companyId;

    if (type) {
        where.type = type;
    }

    if (status) {
        where.status = data.status;
    }

    if (id) {
        where.id = data.id
    }

    if(accountCategory){
        let params={
            category: accountCategory,
            companyId: companyId
          }
        let typeIds = await AccountTypeService.getAccountTypeByCategory(params)
        where.type=typeIds
    }
    // Search by name
    const vendorName = data.vendorName;
    if (vendorName) {
        where.name = {
            $like: `%${vendorName}%`,
        };
    }
    if (accountType) {
        where.type = accountType;
    }
    // Search term
    const searchTerm = search ? search.trim() : null;


    if (searchTerm) {
        where[Op.or] = [
            {
                name: {
                    [Op.iLike]: `%${searchTerm.replace(/\s+/g, "%")}%`,
                },
            },
            {
                url: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },

            {
                mobile: {
                    [Op.or]: [
                        { [Op.iLike]: `%${searchTerm.replace(/\s+/g, "%")}%` },
                    ]
                }
            }

        ];
    }

    const query = {
        order: [[sortableFields[sortParam], sortDirParam]],
        where,
        include:[{
            model:AccountTypeModel,
            as:"accountTypeDetail",
            required:false
        }]
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
        // Get vendor list and count
        const vendors = await accountService.findAndCount(query);


        // Return vendor is null
        if (vendors.count === 0) {
            return res.json({});
        }
        const data = [];
        for (let i = 0; i < vendors.rows.length; i++) {

            const {
                id,
                name,
                status,
                url,
                createdAt,
                updatedAt,
                type,
                notes,
                gst_number,
                return_terms,
                payment_terms,
                cash_discount,
                payment_account,
                billing_name,
                Address,
                mobile,
                accountTypeDetail

            } = vendors.rows[i]

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


            const purchaseOrder = await purchaseService.findOne({ where: { vendor_id: id, company_id: companyId }, order: [["updatedAt", "DESC"]] })

            const statusValue = await statusService.findOne({ where: { company_id: companyId, name: STATUS_COMPLETED_TEXT, object_name: ObjectName.PURCHASE } });
            data.push({
                id: id,
                vendorName: name,
                status: status === Account.STATUS_ACTIVE ? Account.STATUS_ACTIVE_TEXT : status === Account.STATUS_INACTIVE ? Account.STATUS_IN_ACTIVE_TEXT : "",
                Address: Address ? Address : "",
                vendorUrl: url ? url : "",
                gst_number: gst_number ? gst_number : "",
                mobile_number: mobile ? mobile : "",
                notesText: notes && validator.isValidDraftFormat(Url.RawURLDecode(notes)) ? validator.convertDraftFormatToText(JSON.parse(Url.RawURLDecode(notes))) : notes,
                notes: notes && validator.isValidDraftFormat(Url.RawURLDecode(notes)) ? Url.RawURLDecode(notes) : validator.convertTextToDraftFormat(notes),
                statusId: status === Account.STATUS_ACTIVE ? Account.STATUS_ACTIVE : status === Account.STATUS_INACTIVE ? Account.STATUS_INACTIVE : "",
                cash_discount: cash_discount ? cash_discount : "",
                payment_account: payment_account ? payment_account : "",
                return_terms: return_terms ? return_terms : "",
                payment_terms: payment_terms ? payment_terms : "",
                accountCategory: accountTypeDetail && accountTypeDetail?.category,
                type: accountTypeDetail && accountTypeDetail?.name,
                typeId: accountTypeDetail && accountTypeDetail?.id,
                createdAt: DateTime.defaultDateFormat(createdAt),
                updatedAt: DateTime.defaultDateFormat(updatedAt),
                LastPurchasedAt: purchaseOrder?.status == statusValue?.id ? purchaseOrder?.createdAt : "",
                billing_name:billing_name?billing_name:"",
                billingOption:billingOption
            });



        }
        res.json(Response.OK, {
            totalCount: vendors.count,
            currentPage: page,
            pageSize,
            data,
            search,
        });
    } catch (err) {
        res.json(Response.BAD_REQUEST, { message: err.message });
    }
}

// VendorSearch

const vendorSearch = async (req, res, next) => {
    let { page, pageSize, search, sort, sortDir, pagination, status, type } = req.query;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
        return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        id: "id",
        vendorName: "name",
        vendorUrl: "url",
        LastPurchasedAt: "createdAt",
        updatedAt: "updatedAt",
        status: "status",
    };

    const sortParam = sort || "vendorName";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(Response.BAD_REQUEST, {
            message: `Unable to sort Supplier by ${sortParam}`,
        });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;
    const where = {};

    where.company_id = companyId;

    let params={
        category: Account.CATEGORY_VENDOR,
        companyId: companyId
      }

    let typeIds = await AccountTypeService.getAccountTypeByCategory(params)

    where.type=typeIds


    if (status) {
        where.status = data.status;
    }
    // Search by name
    const vendorName = data.vendorName;
    if (vendorName) {
        where.name = {
            $like: `%${vendorName}%`,
        };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
        where[Op.or] = [
            {
                name: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },
            {
                url: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },
        ];
    }

    const query = {
        order: [[sortableFields[sortParam], sortDirParam]],
        where,
        include:[{model:AccountTypeModel, as:"accountTypeDetail", required:false}]
    };

    if (sort !== "LastPurchasedAt") {
        if (validator.isEmpty(pagination)) {
            pagination = true;
        }
        if (Boolean.isTrue(pagination)) {
            if (pageSize > 0) {
                query.limit = pageSize;
                query.offset = (page - 1) * pageSize;
            }
        }
    }


    try {

        const purchaseList = await Purchase.findAll({
            attributes: [
                'vendor_id',
                [sequelize.fn('max', sequelize.col('updatedAt')), 'latestUpdatedAt'],
                [sequelize.fn('max', sequelize.col('purchase_date')), 'latestPurchaseDate'],
            ],
            group: ['vendor_id'],
            order: [[sequelize.literal('"latestUpdatedAt" DESC')]],
            where: {
                company_id: companyId,
            },
        });
        // Get vendor list and count
        const vendors = await accountService.findAndCount(query);


        // Return vendor is null
        if (vendors.count === 0) {
            return res.json({});
        }
        const data = [];
        for (let i = 0; i < vendors.rows.length; i++) {

            const {
                id,
                name,
                status,
                url,
                createdAt,
                updatedAt,
                type,
                notes,
                gst_number,
                return_terms,
                payment_terms,
                cash_discount,
                payment_account,
                billing_name,
                Address,
                accountTypeDetail

            } = vendors.rows[i]

            let purchaseDetail = purchaseList && purchaseList.length > 0 && purchaseList.find((data) => data?.vendor_id == id)
            data.push({
                id: id,
                vendorName: name,
                status: status === Account.STATUS_ACTIVE ? Account.STATUS_ACTIVE_TEXT : status === Account.STATUS_INACTIVE ? Account.STATUS_IN_ACTIVE_TEXT : "",
                Address: Address,
                vendorUrl: url,
                gst_number: gst_number,
                notes: notes && validator.isValidDraftFormat(Url.RawURLDecode(notes)) ? Url.RawURLDecode(notes) : validator.convertTextToDraftFormat(notes),
                cash_discount: cash_discount,
                payment_account: payment_account,
                return_terms: return_terms,
                payment_terms: payment_terms,
                type: accountTypeDetail && accountTypeDetail.name,
                typeId: accountTypeDetail && accountTypeDetail.id,
                category: accountTypeDetail && accountTypeDetail.category,
                createdAt: DateTime.defaultDateFormat(createdAt),
                updatedAt: DateTime.defaultDateFormat(updatedAt),
                LastPurchasedAt: purchaseDetail?.dataValues?.latestPurchaseDate ? purchaseDetail?.dataValues?.latestPurchaseDate : "",
                billing_name: billing_name
            });



        }
        let sortedValue = [];
        if (sort === 'LastPurchasedAt') {
            if (sortDir === 'ASC') {
                data.sort((a, b) => a?.LastPurchasedAt.localeCompare(b?.LastPurchasedAt));
            } else {
                data.sort((a, b) => b?.LastPurchasedAt.localeCompare(a?.LastPurchasedAt));
            }

            const offset = (page - 1) * pageSize;
            sortedValue = data.slice(offset, offset + pageSize);
        }


        res.json(Response.OK, {
            totalCount: vendors.count,
            currentPage: page,
            pageSize,
            data: sort === "LastPurchasedAt" ? sortedValue : data,
            search,
        });
    } catch (err) {
        console.log(err);
        res.json(Response.BAD_REQUEST, { message: err.message });
    }
}





const searchByProduct = async (req, res, next) => {
    const { id } = req.params;
    let { page, pageSize, search, sort, sortDir, pagination, status } = req.query;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
        return res.json(400, { message: "Company Not Found" });
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        vendorName: "name",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        status: "status",
    };

    const sortParam = sort || "vendorName";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(Response.BAD_REQUEST, {
            message: `Unable to sort Supplier by ${sortParam}`,
        });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;
    let vendorwhere = new Object();
    if (id) {
        vendorwhere.company_id = companyId;
        vendorwhere.product_id = id
    }
    const vendorDetails = await vendorProduct.findAndCountAll({ where: vendorwhere });
    let vendorIds = [];
    vendorDetails.rows.forEach(element => {
        vendorIds.push(element.vendor_id)
    });
    vendorIds = [...new Set(vendorIds)];
    const where = { id: { [Op.in]: vendorIds } };


    where.company_id = companyId;

    if (status) {
        where.status = data.status;
    }
    // Search by name
    const vendorName = data.vendorName ? data.vendorName : "";
    if (vendorName) {
        where.name = {
            $like: `%${vendorName}%`,
        };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
        where[Op.or] = [
            {
                name: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },
            {
                url: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },
            {
                mobile: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            },
        ];
    }

    const query = {
        order: [[sortableFields[sortParam], sortDirParam]],
        where,
        attributes: ["id", "name", "status"],
    };

    if (pagination) {
        if (pageSize > 0) {
            query.limit = pageSize;
            query.offset = (page - 1) * pageSize;
        }
    }

    try {
        // Get vendor list and count
        const vendorData = await accountService.findAndCount(query);
        // Return vendor is null
        if (vendorData.count === 0) {
            return res.json({});
        }
        const data = [];
        vendorData.rows.forEach((vendor) => {
            data.push({
                vendorName: vendor.name,
                status: vendor.status,
            });
        });
        res.json(Response.OK, {
            totalCount: vendorData.count,
            currentPage: page,
            pageSize,
            data,
            search,
        });
    } catch (err) {
        res.json(Response.BAD_REQUEST, { message: err.message });
    }
}

const update = async (req, res, next) => {
    const data = req.body;
    const { id } = req.params;
    const vendor_name = data.vendor_name;

    let companyId = Request.GetCompanyId(req);

    // Validate Vendor id
    if (!id) {
        return res.json(Response.BAD_REQUEST, { message: "Vendor id is required" });
    }

    // Validate Vendor is exist or not
    const vendorDetails = await accountService.findOne({
        where: { id: id, company_id: companyId },
    });

    if (!vendorDetails) {
        return res.json(Response.BAD_REQUEST, { message: "Invalid Vendor id" });
    }

    // Validate Vendor name is exist or not
    const vendorDetail = await accountService.findOne({
        where: { name: vendor_name, company_id: companyId },
    });

    if (vendorDetail && vendorDetail.name !== vendorDetails.name) {
        return res.json(Response.BAD_REQUEST, {
            message: "Vendor name already exist",
        });
    }

    let historyMessage = [];

    // Update Vendor details
    const updateVendor = {};

    updateVendor.url = data.vendor_url !== undefined ? data.vendor_url : "";
    if (data.vendor_url && data.vendor_url !== vendorDetails.url) {
        historyMessage.push(
            `Url Updated from ${vendorDetails.url} to ${data.vendor_url}\n`
        );
    }

    if (data.vendor_name && data.vendor_name !== vendorDetails.name) {
        updateVendor.name = data.vendor_name ? data.vendor_name : "";
        historyMessage.push(
            `Name Updated from ${vendorDetails.name} to ${data.vendor_name}\n`
        );
    }

    updateVendor.gst_number =
        data.gst_number !== undefined ? data.gst_number : null;
    if (data.gst_number && data.gst_number !== vendorDetails.gst_number) {
        historyMessage.push(
            `GST Updated from ${vendorDetails.gst_number} to ${data.gst_number}\n`
        );
    }

    if (data.status && data.status !== vendorDetails.status) {
        updateVendor.status = data.status ? data.status : null;
        historyMessage.push(
            `Status updated to: ${vendorDetails.status === Status.ACTIVE ? Status.INACTIVE_TEXT  : Status.ACTIVE_TEXT}\n`
        );
    }

    if (data.email) {
        updateVendor.email = data.email ? data.email : null;
        historyMessage.push(
            `Email Updated from ${vendorDetails.email} to ${data.email}\n`
        );
    }

    updateVendor.address1 = data.address1 ? data.address1 : null;
    if (data.address1 && data.address1 !== vendorDetails.address1) {
        historyMessage.push(
            `Address1 Updated from ${vendorDetails.address1} to ${data.address1}\n`
        );
    }

    updateVendor.address2 = data.address2 ? data.address2 : null;
    if (data.address2 && data.address2 !== vendorDetails.address2) {
        historyMessage.push(
            `Address2 Updated from ${vendorDetails.address2} to ${data.address2}\n`
        );
    }

    updateVendor.mobile = data.mobile ? data.mobile : null;
    if (data.mobile && data.mobile !== vendorDetails.mobile) {
        historyMessage.push(
            `Mobile Updated from ${vendorDetails.mobile} to ${data.mobile}\n`
        );
    }

    updateVendor.pin_code = data.pin_code ? data.pin_code : null;
    if (data.pin_code && data.pin_code !== vendorDetails.pin_code) {
        historyMessage.push(
            `PinCode Updated from ${vendorDetails.pin_code} to ${data.pin_code}\n`
        );
    }

    updateVendor.work_phone = data.work_phone ? data.work_phone : null;
    if (data.work_phone && data.work_phone !== vendorDetails.work_phone) {
        historyMessage.push(
            `Work Phone Updated from ${vendorDetails.work_phone} to ${data.work_phone}\n`
        );
    }

    updateVendor.country = data.country ? data.country : null;
    if (data.country && data.country !== vendorDetails.country) {
        historyMessage.push(
            `Country Updated from ${vendorDetails.country} to ${data.country}\n`
        );
    }

    updateVendor.city = data.city ? data.city : null;
    if (data.city && data.city !== vendorDetails.city) {
        historyMessage.push(
            `City Updated from ${vendorDetails.city} to ${data.city}\n`
        );
    }

    updateVendor.state = data.state ? data.state : null;
    if (data.state && data.state !== vendorDetails.state) {
        historyMessage.push(
            `State Updated from ${vendorDetails.state} to ${data.state}\n`
        );
    }

    updateVendor.type = data.type ? data.type : null;
    if (data.type && data.type !== vendorDetails.type) {
        const AccountTypeData = await AccountTypeModel.findOne({
            where: {
                id: data.type,
                company_id: companyId,
            },
        });
        historyMessage.push(`Type Updated To ${AccountTypeData.name}\n`);
    }

    updateVendor.cash_discount = Number.isNotNull(data.cash_discount)
        ? data.cash_discount
        : null;
    if (
        data.cash_discount &&
        data.cash_discount !== vendorDetails.cash_discount
    ) {
        historyMessage.push(
            `Cash Discount Updated from ${vendorDetails.cash_discount} to ${data.cash_discount}\n`
        );
    }

    updateVendor.payment_terms = data.payment_terms ? data.payment_terms : null;
    if (
        data.payment_terms &&
        data.payment_terms !== vendorDetails.payment_terms
    ) {
        historyMessage.push(
            `Payment Terms Updated from ${vendorDetails.payment_terms} to ${data.payment_terms}\n`
        );
    }

    updateVendor.return_terms = data.return_terms;
    if (data.return_terms && data.return_terms !== vendorDetails.return_terms) {
        historyMessage.push(
            `Return Terms Updated from ${vendorDetails.return_terms} to ${data.return_terms}\n`
        );
    }

    updateVendor.payment_account = data.payment_account
        ? data.payment_account
        : null;
    if (
        data.payment_account &&
        data.payment_account !== vendorDetails.payment_account
    ) {
        const PaymentAccountData = await PaymentAccount.findOne({
            where: {
                id: data.payment_account,
                company_id: companyId,
            },
        });
        historyMessage.push(
            `Payment Account Updated to ${PaymentAccountData.payment_account_name}\n`
        );
    }

    updateVendor.billing_name = data.billing_name ? data.billing_name : null;
    if (data.billing_name && data.billing_name !== vendorDetails.billing_name) {
        const billingName = await AddressModel.findOne({
            where:{
                id:data.billing_name,
                company_id:companyId
            }
        })
        historyMessage.push(
            `Billing Name Updated to ${billingName.title}\n`
        );
    }

    if (data.notes === undefined || data.notes === "") {
        updateVendor.notes = null;
    } else if (typeof data.notes === 'string') {
        // Handle the string case
        try {
            const parsedNewNotes = JSON.parse(data.notes);
            const newNotesText = parsedNewNotes?.blocks?.[0]?.text || '';
    
            updateVendor.notes = data.notes;
    
            const oldNotesDecoded = Url.RawURLDecode(vendorDetails.notes);
            const parsedOldNotes = JSON.parse(oldNotesDecoded);
            const oldNotesText = parsedOldNotes?.blocks?.[0]?.text || '';

                // Compare old and new notes text
            if (oldNotesText !== newNotesText) {
                if (newNotesText) {
                    historyMessage.push(`Notes Updated to "${newNotesText}"\n`);
                } else {
                    historyMessage.push(`Notes updated, but no text available.\n`);
                }
            }
        } catch (error) {
            updateVendor.notes = data.notes;
            console.error(error);
    
            if (data.notes) {
                historyMessage.push(`Notes Updated to "${data.notes}" (unstructured data)\n`);
            } else {
                historyMessage.push(`Notes Updated, but data appears empty or invalid.\n`);
            }
        }
    } else {
        // Handle the object case (if data.notes is an object)
        try {
            const newNotesData = data.notes ? JSON.parse(data.notes) : "";
            if (validator.isNotEmpty(data.notes) && data.notes !== vendorDetails.notes) {
                updateVendor.notes = Url.RawURLEncode(data.notes);
    
                const oldNotesDecoded = Url.RawURLDecode(vendorDetails.notes);
                const oldNotesData = JSON.parse(oldNotesDecoded);
    
                const oldNotesText = oldNotesData?.blocks?.[0]?.text || '';
                const newNotesText = newNotesData?.blocks?.[0]?.text || '';
    
                if (newNotesText) {
                    historyMessage.push(`Notes Updated to "${newNotesText}"\n`);
                } else {
                    historyMessage.push(`Notes updated, but no text available.\n`);
                }
            }
        } catch (error) {
            updateVendor.notes = data.notes;
            console.error('Error parsing or encoding notes:', error);
            historyMessage.push(`Notes Updated, but an error occurred while processing.\n`);
        }
    }

    try {
        const save = await vendorDetails.update(updateVendor);

        res.json(Response.UPDATE_SUCCESS, {
            message: "Vendor Updated",
            data: save.get(),
        });

        res.on("finish", async () => {
            if (historyMessage && historyMessage.length > 0) {
                const message = historyMessage.join("");
                History.create(message, req, ObjectName.ACCOUNT, save.id);
            } else {
                History.create("Vendor Updated", req, ObjectName.ACCOUNT, save.id);
            }
        });
    } catch (err) {
        console.log(err);
        res.json(Response.BAD_REQUEST, {
            message: err.message,
        });
    }
};

const updateStatus = async (req, res, next) => {
    const data = req.body;
    const { id } = req.params;

    let companyId = Request.GetCompanyId(req)

    // Validate Vendor id
    if (!id) {
        return res.json(Response.BAD_REQUEST, { message: "Vendor id is required" });
    }

    const accountDetail = await accountService.findOne({ where: { id: id, company_id: companyId } });

    // Update Vendor status
    const updateVendor = {
        status: data.status
    };

    try {
        const save = await accountService.update(updateVendor, { where: { id: id, company_id: companyId } });

        res.json(Response.UPDATE_SUCCESS, {
            message: "Vendor updated",
        });

        res.on("finish", async () => {
            History.create(`Vendor Status updated from ${accountDetail?.status} to ${data.status}"`, req, ObjectName.ACCOUNT, save.id);
        })

        // API response

    } catch (err) {
        console.log(err);
        res.json(Response.BAD_REQUEST, {
            message: err.message
        });
    }
}


const del = async (req, res, next) => {
    try {
        const { id } = req.params;

        let companyId = Request.GetCompanyId(req)
        // Validate Vendor id
        if (!id) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor id is required" });
        }

        // Validate Vendor is exist or not
        const vendorDetails = await accountService.findOne({
            where: { id: id, company_id: companyId },
        });
        const PurchaseDetails = await Purchase.findOne({ where: { vendor_id: id } })
        if (!vendorDetails) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor not found" });
        }
        if (PurchaseDetails) {
            return res.json(Response.BAD_REQUEST, { message: "Vendor cannot be deleted due to associated records  " });

        } else {
            await vendorDetails.destroy();


            res.json(Response.DELETE_SUCCESS, { message: "Vendor Deleted" });
            res.on("finish", async () => {
                History.create("Vendor Deleted", req, ObjectName.ACCOUNT, id);
            })

        }
        // Delete vendor


        // API response

    } catch (err) {
        console.log(err);
    }
}

const getVendorList = async (companyId) => {

    const where = {};

    where.company_id = companyId;
    where.status = Account.STATUS_ACTIVE;
    let params={
        category: Account.CATEGORY_VENDOR,
        companyId: companyId
      }
    let accountTypeIds = await AccountTypeService.getAccountTypeByCategory(params)

    if(accountTypeIds && accountTypeIds.length>0){
        where.type=accountTypeIds
    }

    const query = {
        order: [['name', 'ASC']],
        where,
    };

    try {
        const vendorDetails = await accountService.findAndCount(query);

        if (vendorDetails.count === 0) {
            return res.json({});
        }

        const data = [];
        vendorDetails.rows.forEach((vendorValues) => {
            const { id, name } = vendorValues.get();

            data.push({
                id,
                name,
            });
        });

        return data
    } catch (err) {
        console.log(err)
    }
}

const getAccountName = async (id, companyId) => {

    const accountDetail = await account.findOne({
        where: {
            id: id,
            company_id: companyId
        }
    });
    return accountDetail && accountDetail?.name
}

const bulkUpdate = async (req, res)=> {
    const companyId = Request.GetCompanyId(req);
    const data = req.body;
    let accountIds = data && data?.accountIds.split(",");
    if (accountIds && !accountIds.length > 0) {
        return res.json(400, { message: "Account Id Required" })
    }
    try {
        const updateData = {}

        if (data?.type) {
            updateData.type = parseInt(data?.type)
        }
        for (let i = 0; i < accountIds.length; i++) {
            const id = accountIds[i];
            await account.update(updateData, {
                where: { id: id, company_id: companyId },
            });
        }
        res.json(Response.CREATE_SUCCESS, { message: "Account Bulk updated" });
    } catch (err) {
        res.json(Response.BAD_REQUEST, { message: err.message });
    }
}


module.exports = {
    getVendorId,
    isExistByVendorUrl,
    get,
    create,
    getDetail,
    search,
    vendorSearch,
    searchByProduct,
    update,
    getVendorList,
    updateStatus,
    del,
    getAccountName,
    bulkUpdate,
};
