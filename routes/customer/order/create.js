const { account } = require("../../../db").models;
const ObjectName = require("../../../helpers/ObjectName");
const Number = require("../../../lib/Number");
const statusService = require("../../../services/StatusService");
const Status = require("../../../helpers/Status");
const {
  getValueByObject,
  saveSetting,
  getSettingList,
} = require("../../../services/SettingService");
const Setting = require("../../../helpers/Setting");
const Currency = require("../../../lib/currency");
const Vendor = require("../../../helpers/Account");
const PhoneNumber = require("../../../lib/PhoneNumber");
const OrderService = require("../../../services/OrderService");
const Response = require("../../../helpers/Response");
const Permission = require("../../../helpers/Permission");
const Request = require("../../../lib/request");
const Order = require("../../../helpers/Order");
const history = require("../../../services/HistoryService");
const { OrderTypeGroup } = require("../../../helpers/OrderTypeGroup");
const OrderTypeService = require("../../../services/OrderTypeService");

async function create(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.ORDER_ADD, req);

    const body = req.body;

    const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }

    const userId = Request.getUserId(req);

    let formatedNextOrderNumber, nextCompanyOrderNumber;

    let settingData = await getSettingList(companyId);

    let settingList = [];

    for (let i = 0; i < settingData.length; i++) {
      settingList.push(settingData[i]);
    }

    let lastOrderNumber = await getValueByObject(
      Setting.SETTING_LAST_ORDER_NUMBER,
      settingList
    );

    let orderCode = await getValueByObject(Setting.ORDER_CODE, settingList);

    nextCompanyOrderNumber =
      lastOrderNumber && lastOrderNumber !== "" ? parseInt(lastOrderNumber) : 0;

    nextCompanyOrderNumber += 1;

    if (orderCode != "") {
      formatedNextOrderNumber = `${orderCode}-${nextCompanyOrderNumber}`;
    } else {
      formatedNextOrderNumber = `${nextCompanyOrderNumber}`;
    }

    saveSetting(
      Setting.SETTING_LAST_ORDER_NUMBER,
      nextCompanyOrderNumber,
      companyId,
      null,
      ObjectName.ORDER
    );
    let OrderTypeId = await OrderTypeService.getOrderTypeId(companyId,OrderTypeGroup.ONLINE)

    const orderData = {
      store_id: null,
      date: new Date(),
      order_number: formatedNextOrderNumber,
      company_id: companyId,
      status: await statusService.getFirstStatus(ObjectName.ORDER_TYPE, companyId,null,OrderTypeId),
      owner: null,
      payment_type: OrderTypeId && OrderTypeId[0]?.id,
      shift: null,
      createdBy: Number.Get(userId),
      customer_phone_number:
        body &&
        body.customer_phone_number &&
        PhoneNumber.Get(body.customer_phone_number),
      type: body?.type,
      customer_account: body && body?.customer_account,
      upi_amount: Currency.Get(body?.upi_amount),
      cash_amount: Currency.Get(body?.cash_amount),
    };

    const response = await OrderService.createOrder(orderData);

    if (Number.isNotNull(body.customer_phone_number)) {
      const customerData = {
        mobile: PhoneNumber.Get(body.customer_phone_number),
        type: Vendor.CATEGORY_CUSTOMER,
        status: Status.ACTIVE,
        company_id: companyId,
        name: PhoneNumber.Get(body.customer_phone_number),
      };

      const customerExist = await account.findOne({
        where: {
          name: PhoneNumber.Get(body.customer_phone_number),
          status: Status.ACTIVE,
          company_id: companyId,
        },
      });

      if (Number.isNull(customerExist)) {
        await account.create(customerData);
      }
    }

    const orderId = response && response.dataValues && response.dataValues.id;

    res.json(Response.CREATE_SUCCESS, {
      message: "Order Added",
      orderId: orderId,
      orderDetail: response,
    });

    //create a log for error
    history.create("Order Added", req, ObjectName.ORDER, orderId);
  } catch (err) {
    console.log(err);
    res.json(Response.BAD_REQUEST, { message: err.message });
  }
}

module.exports = create;
