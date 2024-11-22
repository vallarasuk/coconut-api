/*
 * Module dependencies
 */
const moment = require("moment");

// Constants
const { BAD_REQUEST, CREATE_SUCCESS } = require("../../helpers/Response");
const VendorProduct = require("../../helpers/VendorProduct");

// Services
const supplierProductService = require("../../services/VendorProductService");
const accountService = require("../../services/AccountService");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");

/**
 * Vendor product import route
 */
async function importVendorProduct(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_IMPORT_VENDOR_PRODUCT,
    req
  );

 
  const { url } = req.query;

  const companyId = req.user.company_id;
  try {
    const vendor = await accountService.isExistByVendorUrl(url, companyId);
    if (!vendor) throw { message: "Supplier is not added" };

    const data = await supplierProductService.getVendorProductFromUrl(
      url,
      vendor.vendor_url,
      companyId
    );
    const vendorProductData = {
      name: data.name,
      vendorBaseUrl: data.vendorBaseUrl,
      description: data.description,
      price: data.mrp,
      salePrice: data.price,
      brandName: data.brandName,
      categoryName: data.typeName,
      images: data.images,
      url,
      status: VendorProduct.STATUS_NEW,
      lastUpdatedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
      importedAt: moment(new Date(), "YYYY-MM-DD HH:mm"),
    };
    // Create Product
   const vendorProduct = await supplierProductService.createProduct(vendorProductData, companyId);
   History.create("Vendor product  imported", req, ObjectName.SUPPLIER_PRODUCT, vendorProduct.id);
    
    // Return Success Message
    res.json(CREATE_SUCCESS, {
      message: "Vendor product  imported successfully",
    });
  } catch (err) {
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = importVendorProduct;
