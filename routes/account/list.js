const { Op } = require("sequelize");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const DataBaseService = require("../../lib/dataBaseService");
const { account,AccountType } = require("../../db").models;
const Request = require("../../lib/request");
const Vendor = require("../../helpers/Account");
const accountService = new DataBaseService(account);
const AddressService = require("../../services/AddressService");
const ObjectName = require("../../helpers/ObjectName");
const String = require("../../lib/string");
const AccountTypeService = require("../../services/AccountTypeService");
const { isKeyAvailable } = require("../../lib/validator");
const Number = require("../../lib/Number");

async function list(req, res, next) {
  const data = req.query;
  const companyId = Request.GetCompanyId(req);
  if (!companyId) {
    return res.json(400, { message: "Company Not Found" });
  }

  const where = {};

  if(data.type){
    where.type=data.type
  }
  if(data.id){
    where.id=data.id
  }
  where.company_id = companyId;

  let statusValue = !isKeyAvailable(data,"status") ? Vendor.STATUS_ACTIVE : isKeyAvailable(data,"status") && Number.isNotNull(data?.status) ? data?.status : null;
  let defaultValue = isKeyAvailable(data,"defaultValue") && Number.isNotNull(data?.defaultValue) ? data?.defaultValue :null
  where[Op.or]= [
    { status: { [Op.or]: [statusValue, null] } },
    { id: { [Op.or]: [defaultValue, null] } }
  ]


  if(Number.isNotNull(data.accountCategory)){
    let params={
      category: data.accountCategory,
      companyId: companyId
    }
  
    let typeIds = await AccountTypeService.getAccountTypeByCategory(params)
    where.type={
      [Op.in]: typeIds
    }
  }
  let typeWhere = {};
    
  if (Number.isNotNull(data?.show_purchase)) {
    typeWhere.show_purchase = true;
    typeWhere.company_id = companyId;
  
    let accountTypes = await AccountType.findAll({
      where: typeWhere
    });
  
    let typeIds = accountTypes.map(accountType => accountType.id);
      where.type = {
      [Op.in]: typeIds
    };
  }
  

  const searchTerm = data.search ? data.search.trim() : null;
  if (searchTerm) {
    where[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${searchTerm}%`,
        },
      },
    ];
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
    let billingAddress = await AddressService.list({
      companyId: companyId,
      objectName: ObjectName.COMPANY,
    });

    const data = [];
    let billingOption = [];

    if (billingAddress && billingAddress.length > 0) {
      for (let i = 0; i < billingAddress.length; i++) {
        const title = String.Get(billingAddress[i].title);
        const name = billingAddress[i].name
          ? String.Get(billingAddress[i].name)
          : "";
        const label = name ? `${title}, (${name})` : title;
        billingOption.push({ label, value: billingAddress[i].id });
      }
    }

    if (vendorDetails && vendorDetails.rows && vendorDetails.rows.length > 0) {
      for (let i = 0; i < vendorDetails.rows.length; i++) {

        let billingName = billingOption.find(
          (value) => value.value == vendorDetails.rows[i].billing_name
        );

        data.push({
          id: vendorDetails.rows[i].id,
          name: vendorDetails.rows[i].name,
          cash_discount: vendorDetails.rows[i].cash_discount,
          payment_account: vendorDetails.rows[i].payment_account,
          mobile_number: vendorDetails.rows[i].mobile,
          billing_id: vendorDetails.rows[i].billing_name,
          billing_name: billingName ? billingName.label : "",
        });
      }
    }

    res.json(OK, {
      data,
    });
  } catch (err) {
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = list;
