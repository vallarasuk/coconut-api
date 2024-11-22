const Request = require("../../lib/request");

// Models
const {
  PurchaseProduct,
  product,
  storeProduct,
  Purchase,
  vendorProduct,
  productIndex,
  ProductPrice: ProductPriceModel,
} = require("../../db").models;
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const StatusService = require("../../services/StatusService");
const Number = require("../../lib/Number");
const AccountProductService = require("../../services/AccountProductService");
const ProductService = require("../../services/services/ProductService");
const { reindex } = require("../../services/ProductService");
const ProductPrice = require("../../helpers/ProductPrice");

const create = async (req, res) => {
  try {
    //get company Id from request
    let body = req.body;
    //get company Id from request
    const companyId = Request.GetCompanyId(req);

    //validate stock entry ID exist or not
    if (!body.purchaseId) {
      res.json(400, { message: "Purchase Id is required" });
    }

    let purchaseDetail = await Purchase.findOne({
      where: {
        id: body.purchaseId,
        company_id: companyId,
      },
    });

    if (!purchaseDetail) {
      return res.json(400, { message: "Purchase Detail Not Found" });
    }
    const status = await StatusService.getFirstStatus(
      ObjectName.PURCHASE_PRODUCT,
      companyId
    );

    let getProductDetail = await ProductService.getProductDetailsById(
      body.productId,
      companyId
    );

    let productPriceData = await ProductPriceModel.findOne({
      where: {
        product_id: body.productId,
        is_default: ProductPrice.IS_DEFAULT,
        company_id: companyId,
      },
    });

    const getPurchaseData = () => {
      let totalTax =
        Number.GetFloat(getProductDetail?.cgst_percentage || 0) +
          Number.GetFloat(getProductDetail?.sgst_percentage || 0) +
          Number.GetFloat(getProductDetail?.tax_percentage || 0) +
          Number.GetFloat(getProductDetail?.igst_percentage || 0) || 0;

      let quantityValue = body.quantity;

      let amount =
        getProductDetail?.cost && getProductDetail?.cost * quantityValue;

      let mrpValue = body.mrp
        ? body.mrp
        : getProductDetail?.mrp && Number.GetFloat(getProductDetail.mrp);

      let cgst_percentage =
        getProductDetail?.cgst_percentage && getProductDetail.cgst_percentage;

      let sgst_percentage =
        getProductDetail?.sgst_percentage && getProductDetail.sgst_percentage;

      let cess_percentage =
        getProductDetail?.tax_percentage && getProductDetail.tax_percentage;

      let igst_percentage =
        getProductDetail?.igst_percentage && getProductDetail.igst_percentage;

      let cgstAmount =
        cgst_percentage && Number.GetFloat(amount * cgst_percentage) / 100;

      let igstAmount =
        igst_percentage && Number.GetFloat(amount * igst_percentage) / 100;

      let sgstAmount =
        sgst_percentage && Number.GetFloat(amount * sgst_percentage) / 100;

      let cessAmount =
        cess_percentage && Number.GetFloat(amount * cess_percentage) / 100;
      let totalTaxAmount =
        Number.GetFloat(cgstAmount) +
          Number.GetFloat(sgstAmount) +
          Number.GetFloat(cessAmount) +
          Number.GetFloat(igstAmount) || 0;

      let totalAmount =
        Number.GetFloat(amount) + Number.GetFloat(totalTaxAmount);

      let unit_price = totalAmount / quantityValue;

      const preTaxValue = unit_price / (1 + totalTax / 100) || "";

      let taxable_amount = preTaxValue * quantityValue || 0;

      let marginValue = mrpValue - unit_price;

      let unitMarginAmount = (marginValue / mrpValue) * 100;

      let manufactured_date =
        body && body.manufactured_date ? body.manufactured_date : null;
      let statusValue = body.status ? body.status : status ? status : null;
      let vendorId =
        body && body.vendor_id ? body.vendor_id : purchaseDetail?.vendor_id;

      let data = {
        quantity: Number.GetFloat(quantityValue),
        mrp: Number.GetFloat(mrpValue),
        unit_price: Number.GetFloat(unit_price),
        cgst_percentage: cgst_percentage,
        sgst_percentage: sgst_percentage,
        igst_percentage: igst_percentage,
        cess_percentage: cess_percentage,
        tax_amount: Number.GetFloat(totalTaxAmount),
        taxable_amount: Number.GetFloat(taxable_amount),
        cgst_amount: Number.GetFloat(cgstAmount),
        sgst_amount: Number.GetFloat(sgstAmount),
        cess_amount: Number.GetFloat(cessAmount),
        igst_amount: Number.GetFloat(igstAmount),
        amount: Number.GetFloat(totalAmount),
        unit_margin_amount: Number.GetFloat(marginValue),
        margin_amount: Number.GetFloat(marginValue),
        margin_percentage: Number.GetFloat(unitMarginAmount),
        manufactured_date: manufactured_date,
        status: statusValue,
        vendorId: vendorId,
      };
      return data;
    };

    let purchaseData = getPurchaseData();

    let purchaseProductCreateData = {
      company_id: companyId,
      tax_percentage: Number.isNotNull(body?.tax_percentage)
        ? body?.tax_percentage
        : Number.GetFloat(purchaseData.cess_percentage),
      tax_amount: Number.isNotNull(body?.tax_amount)
        ? Number.GetFloat(body?.tax_amount)
        : Number.GetFloat(purchaseData.tax_amount),
      purchase_id: Number.Get(body.purchaseId),
      product_id: Number.Get(body.productId),
      net_amount: Number.isNotNull(body?.net_amount)
        ? Number.GetFloat(body?.net_amount)
        : Number.GetFloat(purchaseData.amount),
      quantity: Number.isNotNull(body?.quantity)
        ? body?.quantity
        : Number.Get(purchaseData.quantity),
      unit_price: Number.isNotNull(body?.unit_price)
        ? Number.GetFloat(body?.unit_price)
        : Number.GetFloat(purchaseData.unit_price),
      cgst_percentage: Number.isNotNull(body?.cgst_percentage)
        ? body?.cgst_percentage
        : purchaseData && purchaseData.cgst_percentage,
      sgst_percentage: Number.isNotNull(body?.sgst_percentage)
        ? body?.sgst_percentage
        : purchaseData && purchaseData.sgst_percentage,
      cess_percentage: Number.isNotNull(body?.cess_percentage)
        ? body?.cess_percentage
        : purchaseData && purchaseData.cess_percentage,
      igst_percentage: Number.isNotNull(body?.igst_percentage)
        ? body?.igst_percentage
        : purchaseData && purchaseData.igst_percentage,
      cgst_amount: Number.isNotNull(body?.cgst_amount)
        ? Number.GetFloat(body?.cgst_amount)
        : Number.GetFloat(purchaseData.cgst_amount),
      sgst_amount: Number.isNotNull(body?.sgst_amount)
        ? Number.GetFloat(body?.sgst_amount)
        : Number.GetFloat(purchaseData.sgst_amount),
      cess_amount: Number.isNotNull(body?.cess_amount)
        ? Number.GetFloat(body?.cess_amount)
        : Number.GetFloat(purchaseData.cess_amount),
      manufactured_date: purchaseData.manufactured_date,
      store_id: purchaseDetail && Number.Get(purchaseDetail.store_id),
      status: Number.isNotNull(body?.status)
        ? body?.status
        : Number.Get(purchaseData.status),
      vendor_id: Number.Get(purchaseData.vendorId),
      margin_percentage: Number.isNotNull(body?.margin_percentage)
        ? Number.GetFloat(body?.margin_percentage)
        : Number.GetFloat(purchaseData.margin_percentage),
      unit_margin_amount: Number.isNotNull(body?.unit_margin_amount)
        ? Number.GetFloat(body?.unit_margin_amount)
        : Number.GetFloat(purchaseData.unit_margin_amount),
      mrp: Number.isNotNull(body?.mrp)
        ? body?.mrp
        : Number.Get(purchaseData.mrp),
      igst_amount: Number.GetFloat(purchaseData.igst_amount),
      taxable_amount: Number.isNotNull(body?.taxable_amount)
        ? Number.GetFloat(body?.taxable_amount)
        : Number.GetFloat(purchaseData.taxable_amount),
      margin_amount: Number.GetFloat(purchaseData.margin_amount),
      barcode:
        body && body.barcode
          ? body.barcode
          : productPriceData && productPriceData.barcode,
    };

    // create stock entry
    let purchaseProductDetails = await PurchaseProduct.create(
      purchaseProductCreateData
    );
    if(purchaseProductDetails && purchaseProductDetails?.id){
    let productDatas = await product.findOne({
      where: { id: purchaseProductDetails?.product_id, company_id: companyId },
    });

    let updateQty =
      Number.Get(productDatas?.min_quantity) +
      Number.Get(purchaseProductCreateData?.quantity);
    await product.update(
      { min_quantity: updateQty },
      {
        where: {
          id: purchaseProductCreateData?.product_id,
          company_id: companyId,
        },
      }
    );
    await reindex(purchaseProductCreateData?.product_id, companyId);
  }
    //return response
    res.json(200, {
      message: "Purchase Product Added",
      purchaseProductDetails: purchaseProductDetails,
    });
    res.on("finish", async () => {
      let productName = getProductDetail && getProductDetail?.product_name;

      History.create(
        `Purchased product "${productName}" with quantity ${purchaseData.quantity} added`,
        req,
        ObjectName.PURCHASE,
        body.purchaseId
      );

      let params = {
        productId: body.productId,
        company_id: companyId,
        accountId: purchaseData.vendorId
          ? purchaseData.vendorId
          : purchaseDetail && purchaseDetail?.vendor_id,
        margin_percentage: Number.GetFloat(purchaseData.margin_percentage),
        margin_amount: Number.GetFloat(purchaseData.unit_margin_amount),
      };
      await AccountProductService.createProduct(params);
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

module.exports = create;
