const user = require("./user");
const userPreference = require("./userPreference");
const candidate = require("./candidate");
const accountAgreement = require("./accountAgreement");
const quickLinks = require("./quickLinks");
const attendance = require("./attendance");
const holidays = require("./holidays");
const salaryMonthly = require("./salaryMonthly");
const drive = require("./drive");
const category = require("./category");
const role = require("./role");
const utils = require("./utils");
const accountEntry = require("./accountEntry");
const accountCategory = require("./accountCategory");
const candidateMessage = require("./candidateMessage");
const jobs = require("./jobs");
const admin = require("./admin");
const screenshot = require("./screenshot");
const scheduler = require("./scheduler");
const userProfileStatus = require("./userProfileStatus");
const page = require("./page");
const publicJobs = require("./public/jobs");
const publicVisitor = require("./public/visitor");
const publicContactUs = require("./public/contactus");
const payRoll = require("./payRoll");
const payRollUpdate = require("./payRoll/update/");
const permission = require("./permission");
const userPermission = require("./userPermission");
const userTemperature = require("./userTemperature");
const userDocument = require("./userDocument");
const userDocumentType = require("./userDocumentType");
const activityType = require("./activityType");
const schedularJob = require("./schedulerJob");
const userConfig = require("./userConfig");
const vendor = require("./vendor");
const bill = require("./bill");
const jobEmailTemplate = require("./jobsEmailTemplate");
const apiTest = require("./apiTest");
const company = require("./company");
const portal = require("./portal");
const setting = require("./setting");
const userRole = require("./userRole");
const rolePermission = require("./rolePermission");
const userRolePermission = require("./userRolePermission");
const pages = require("./pages");
const countryRoute = require("./country");
const SaleSettlement = require("./saleSettlement");
const paymentAccount = require("./paymentAccount");
const publicDetailRoute = require("./public/publicDetailRoute");

const shift = require("./shift");
const sprint = require("./sprint");
const Transfer = require("./transferRoute");
const tagType = require("./tagType")
const fineBonus = require("./fineBonus")
const comment = require("./comment")

//aprtmentbasket routes
const apartmentRoute = require("./apartmentRoute");
const orderProductRoute = require("./orderProductRoute");
const orderRoute = require("./orderRoute");
const pricingRoute = require("./pricingRoute");
const productBrandRoute = require("./productBrandRoute");
const productCategoryRoute = require("./productCategoryRoute");
const productCollectionRoute = require("./productCollectionRoute");
const productImageRoute = require("./productImageRoute");
const productRoute = require("./productRoute");
const storeProductRoute = require("./storeProductRoute");
const locationRoute = require("./locationRoute");
const syncRoute = require("./syncRoute");
const tagRoute = require("./tagRoute");
const vendorProductRoute = require("./vendorProductRoute");
const account = require("./account");
const history = require("./history");
const mediaRoute = require("./mediaRoute");
const dashboardRoute = require("./dashboardRoute");
const slack = require("./slack");
const stockEntry = require("./stockEntry");
const stockProductEntry = require("./stockProductEntry");
const saleProduct = require("../routes/saleProductRoute");
const transferProduct = require("./transferProduct")
const salesSettlementSummaryReport = require("./salesSettlementSummaryReport");
const ticket = require("./ticket");
const AccountType = require("./accountType")
const wishlist = require("../routes/wishlist");
const storeUser = require("./storeUser");
const purchaseOrder = require("./purchaseOrder")
const stockReport = require("./stockReport")
const storeProductReport = require("./storeProductReport")
const storeProductNegativeStockReport = require("./storeProductNegativeStockReport");
const payment = require("./payment");
const TransferType = require("./transferType")
const purchaseProductReport = require("./purchaseProductReport");
const purchaseOrderProduct = require("./purchaseOrderProduct")
const purchase = require("./purchase");
const status = require("./status");
const object = require("./object");
const address = require("./address");
const contact = require("./contact");
const project = require("./project");

const activity = require("./activity");
const message = require("./message");
const salary = require("./salary");
const userDeviceInfo = require("./userDeviceInfo");
const userLocation = require("./userLocation");
const TransferTypeReason = require("./TransferTypeReason")
const Visitor = require("./visitor")
const orderSummaryReport = require("../routes/orderSummaryReport");
const orderProductReport = require("../routes/orderProductReport");

const Response = require("../helpers/Response");
const storeProductNoOrderReport = require("../routes/storeProductNoOrderReport");
const storeProductNoStockReport = require("../routes/storeProductNoStockReport");
const projectTicketType = require("./projectTicketType");
const purchaseSummaryReport = require("./purchaseSummaryReport");
const replenishment = require("../routes/replenishment");
const purchaseRecommendationReport = require("./purchaseRecommendationReport");
const userSalary = require("./userSalary");

const productPrice = require("./productPrice");
const training = require("./training");
const inspectionRoute = require("./inspectionRoute");
const accountEntryReport = require("./accountEntryReport");
const slackTicket = require("./slackTicket");
const orderReportUserWise = require("./orderReportUserWise");
const orderSalesSettlementDiscrepancyReport = require("./orderSalesSettlementDiscrepancyReport");
const CustomField = require("./CustomField");

const CustomFieldValue = require("./CustomFieldValue");
const recurringTaskRoute = require("./recurringTaskRoute");
const timeSheet = require("./timeSheet");
const timesheetDetail = require("./timesheetDetail");
const salesGstReport = require("./salesGstReport");
const purchaseGstReport = require("./purchaseGstReport");
const ticketTest = require("./ticketTest");
const tax = require("./tax");
const projectSetting = require("./projectSetting");
const attendanceReport = require("./attendanceReport");
const fineReport = require("./fineReport");
const bookMyWaterCan = require("./bookMyWaterCan");
const ecomm = require("./ecomm");
const candidatePublic = require("./public/postResume");
const lead = require("./lead");
const projectUser = require("./projectUser");
const projectComponent = require("./projectComponent");
const order = require("./order");
const whatsapp = require("./whatsapp");
const stockEntryReport = require("./stockEntryReport")
const gatePass = require("./gatePass");
const messageChannel = require("./messageChannel");
const messageChannelUser = require("./messageChannelUser");
const loyaltyCategory = require("./loyaltyCategory");
const accountLoyalty = require("./accountLoyalty");
const orderProductCancelledReport = require("./orderProductCancelledReport");
const locationAllocation = require("./locationAllocation");
const mobileDashboard = require("./mobileDashboard");
const purchaseProduct = require("./purchaseProduct");
const attendanceType = require("./attendanceType");
const rewardReport = require("./rewardReport");
const accountProduct = require("./accountProduct");
const recurringActivity = require("./recurringActivity");
const orderReport = require("./orderReport");
const purchaseReport = require("./purchaseReport");
const teamMember = require("./teamMember");
const locationSalesGoal = require("./localtionSalesGoal");
const ticketTestCase = require("./ticketTestCase");
const bankSettlement = require("./bankSettlement");
const otp = require("./otp");
const testCase = require("./testCase");
const locationAllocationUser = require("./locationAllocationUser");
const preferredLocation = require("./preferredLocation");
const publicRoute = require("./publicRoute");
const pageBlock = require("./pageBlock");
const pageBlockFields = require("./pageBlockFields");
const customer = require("./customer");
const CurrencyDenomination = require("./CurrencyDenomination");
const publicPageBlock = require("./public/pageBlock")
const publicCandidate = require("./public/candidate")
const customerOrder = require("./customer/order")
const replenishmentAllocationReport = require("./replenishmentAllocationReport");
const salesSettlementMissingReport = require("./salesSettlementMissingReport");
const app = require("./app");
const appSetting = require("./appSetting");
const appVersion = require("./appVersion");
const invoice = require("./invoice");
const invoiceProduct = require("./invoiceProduct");
const orderType = require("./orderType");
const rating = require("./rating");
const OrderUpiPaymentReport = require("./OrderUpiPaymentReport");
const locationRack = require("./locationRack");
const googleConnect = require("./googleConnect");
const ratingType = require("./ratingType");
const ledger = require("./ledger");


function routes(server) {
  user(server);
  userPreference(server);
  candidate(server);
  quickLinks(server);
  purchaseProductReport(server);
  attendance(server);
  holidays(server);
  salesSettlementSummaryReport(server);
  salaryMonthly(server);
  drive(server);
  category(server);
  role(server);
  utils(server);
  accountEntry(server);
  accountCategory(server);
  candidateMessage(server);
  jobs(server);
  admin(server);
  screenshot(server);
  scheduler(server);
  userProfileStatus(server);
  page(server);
  publicJobs(server);
  publicVisitor(server);
  publicContactUs(server);
  payRoll(server);
  payRollUpdate(server);
  permission(server);
  userPermission(server);
  TransferTypeReason(server)
  Visitor(server)
  comment(server)
  ledger(server)
  accountAgreement(server);
  userTemperature(server);
  userDocument(server);
  userDocumentType(server);
  activityType(server);
  schedularJob(server);
  purchase(server);
  userConfig(server);
  vendor(server);
  bill(server);
  jobEmailTemplate(server);
  apiTest(server);
  company(server);
  portal(server);
  setting(server);
  userRole(server);
  rolePermission(server);
  userRolePermission(server);
  pages(server);
  history(server);
  countryRoute(server);
  SaleSettlement(server);
  paymentAccount(server);
  dashboardRoute(server);
  wishlist(server);
  userDeviceInfo(server);
  userLocation(server);


  //apartment basket API
  apartmentRoute(server);
  orderProductRoute(server);
  orderRoute(server);
  pricingRoute(server);
  productBrandRoute(server);
  productCategoryRoute(server);
  productCollectionRoute(server);
  productImageRoute(server);
  productRoute(server);
  storeProductRoute(server);
  locationRoute(server);
  syncRoute(server);
  tagRoute(server);
  mediaRoute(server);
  vendorProductRoute(server);
  account(server);
  publicDetailRoute(server);
  slack(server);
  stockEntry(server);
  stockProductEntry(server);
  saleProduct(server);
  shift(server);
  sprint(server);
  Transfer(server);
  transferProduct(server);
  ticket(server);
  tagType(server);
  storeUser(server);
  stockReport(server)
  storeProductReport(server)
  storeProductNegativeStockReport(server)
  payment(server)
  purchaseOrder(server);
  TransferType(server);
  AccountType(server)
  purchaseOrderProduct(server);
  status(server);
  object(server);
  address(server);
  contact(server)
  project(server);
  activity(server);
  message(server)
  salary(server);
  fineBonus(server);
  orderSummaryReport(server);
  orderProductReport(server);
  orderReportUserWise(server);
  storeProductNoStockReport(server);
  storeProductNoOrderReport(server);
  purchaseSummaryReport(server)
  projectTicketType(server);
  orderType(server);
  rating(server)
  ratingType(server)
  replenishment(server);
  purchaseRecommendationReport(server);
  userSalary(server);

  productPrice(server);
  training(server)
  accountEntryReport(server)
  slackTicket(server)
  orderSalesSettlementDiscrepancyReport(server)
  inspectionRoute(server)
  CustomField(server)
  CustomFieldValue(server);
  recurringTaskRoute(server);
  timeSheet(server)
  timesheetDetail(server)
  salesGstReport(server)
  purchaseGstReport(server)
  ticketTest(server)
  tax(server)
  projectSetting(server);
  attendanceReport(server)
  fineReport(server);
  bookMyWaterCan(server)
  ecomm(server)
  candidatePublic(server)
  lead(server)
  loyaltyCategory(server)
  accountLoyalty(server)
  projectUser(server)
  projectComponent(server)
  order(server)
  whatsapp(server)
  stockEntryReport(server)
  gatePass(server)
  messageChannel(server)
  messageChannelUser(server)
  orderProductCancelledReport(server)
  locationAllocation(server)
  mobileDashboard(server)
  purchaseProduct(server)
  attendanceType(server)
  rewardReport(server)
  accountProduct(server)
  recurringActivity(server)
  orderReport(server)
  purchaseReport(server)
  teamMember(server)
  locationSalesGoal(server)
  ticketTestCase(server)
  bankSettlement(server)
  otp(server)
  testCase(server)
  locationAllocationUser(server)
  preferredLocation(server)
  publicRoute(server)
  pageBlock(server)
  pageBlockFields(server)
  customer(server);
  CurrencyDenomination(server);
  publicPageBlock(server)
  customerOrder(server)
  replenishmentAllocationReport(server)
  publicCandidate(server)
  salesSettlementMissingReport(server)
  app(server)
  appSetting(server)
  appVersion(server)
  invoice(server)
  invoiceProduct(server)
  OrderUpiPaymentReport(server)
  locationRack(server)
  googleConnect(server)

  /* GET api root */
  server.get("/", (req, res, next) => {
    res.json(Response.OK, "OK");
  });
}

module.exports = routes;
