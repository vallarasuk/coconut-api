const { BAD_REQUEST } = require("../../helpers/Response");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");

const PurchaseProductService = require("../../services/services/PurchaseProductService");
const ProductService = require("../../services/services/ProductService");
const { reindex } = require("../../services/ProductService");

// Model
const { Purchase, PurchaseProduct, product, AccountProductModel } =
  require("../../db").models;

const productupdate = async (req, res) => {
  try {
    let data = req.body;
    const purchaseProductId = req.params.id;
    let company_id = Request.GetCompanyId(req);

    if (!purchaseProductId) {
      return res.json(BAD_REQUEST, {
        message: "Purchase Product Id Is Required",
      });
    }

    let purchaseProductDetail = await PurchaseProduct.findOne({
      where: {
        id: purchaseProductId,
        company_id: company_id,
      },
    });

    if (!purchaseProductDetail) {
      return res.json(400, { message: "Purchase Product Not Found" });
    }
    let productData = await ProductService.getProductDetailsById(
      purchaseProductDetail?.product_id,
      company_id
    );

    let unit_price =
      data && data.unit_price
        ? parseFloat(data.unit_price, 10)
        : data.net_amount / (data.quantity * productData.pack_size);

    let igst_amount =
      data.igst_amount && !isNaN(data.igst_amount)
        ? Number.Decimal(data.igst_amount)
        : 0;
    let cgst_amount =
      data.cgst_amount && !isNaN(data.cgst_amount)
        ? Number.Decimal(data.cgst_amount)
        : 0;
    let sgst_amount =
      data.sgst_amount && !isNaN(data.sgst_amount)
        ? Number.Decimal(data.sgst_amount)
        : 0;
    let cess_amount =
      data.cess_amount && !isNaN(data.cess_amount)
        ? Number.Decimal(data.cess_amount)
        : 0;

    let updateData = {};

    if (data.tax_percentage) {
      updateData.tax_percentage = Number.GetFloat(data.tax_percentage);
    }

    updateData.tax_amount =
      igst_amount + cgst_amount + sgst_amount + cess_amount;

    if (data.net_amount || data.amount) {
      updateData.net_amount = data.net_amount
        ? Number.GetFloat(data.net_amount)
        : Number.GetFloat(data.amount);
    }

    if (data.discount_amount) {
      updateData.discount_amount = Number.GetFloat(data.discount_amount);
    }

    updateData.quantity = Number.GetFloat(data.quantity);

    if (data.cess_amount) {
      updateData.cess_amount = Number.GetFloat(data.cess_amount);
    }

    if (Number.isNotNull(data.cess_percentage)) {
      updateData.cess_percentage = data.cess_percentage;
    }

    if (data.sgst_amount) {
      updateData.sgst_amount = Number.GetFloat(data.sgst_amount);
    }

    if (Number.isNotNull(data.sgst_percentage)) {
      updateData.sgst_percentage = data.sgst_percentage;
    }

    if (data.cgst_amount) {
      updateData.cgst_amount = Number.GetFloat(data.cgst_amount);
    }
    if (data.taxable_amount) {
      updateData.taxable_amount = Number.GetFloat(data.taxable_amount);
    }

    if (Number.isNotNull(data.cgst_percentage)) {
      updateData.cgst_percentage = data.cgst_percentage;
    }

    if (Number.isNotNull(data.igst_percentage)) {
      updateData.igst_percentage = data.igst_percentage;
    }
    if (data.igst_amount) {
      updateData.igst_amount = Number.GetFloat(data.igst_amount);
    }

    if (Number.isNotNull(data.mrp)) {
      updateData.mrp = Number.GetFloat(data.mrp);
    }
    if (data.unit_price) {
      updateData.unit_price = Number.GetFloat(unit_price);
    }

    if (data.manufactured_date) {
      updateData.manufactured_date = data.manufactured_date;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    if (Number.isNotNull(data.margin_percentage)) {
      updateData.margin_percentage = data.margin_percentage;
    }
    if (Number.isNotNull(data.unit_margin_amount)) {
      updateData.unit_margin_amount = data.unit_margin_amount;
    }

    if (Number.isNotNull(data.margin_amount)) {
      updateData.margin_amount = data.margin_amount;
    }

    updateData.margin_amount = data.margin_amount;
    await PurchaseProduct.update(updateData, {
      where: {
        id: purchaseProductId,
        company_id: company_id,
      },
    });
    let productDatas = await product.findOne({
      where: { id: purchaseProductDetail?.product_id, company_id: company_id },
    });

    let updateQty =
      Number.Get(productDatas?.min_quantity) +
      (Number.Get(data?.quantity) - purchaseProductDetail?.quantity);
    await product.update(
      { min_quantity: updateQty },
      {
        where: {
          id: purchaseProductDetail?.product_id,
          company_id: company_id,
        },
      }
    );
    await reindex(purchaseProductDetail?.product_id, company_id);
    res.json(200, { message: "Purchase Data Updated" });
    res.on("finish", async () => {
      await PurchaseProductService.createAuditLog(
        purchaseProductDetail,
        data,
        req
      );
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports = productupdate;
