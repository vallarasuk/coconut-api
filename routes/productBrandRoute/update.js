/**
 * Module dependencies
 */

const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

// Models
const { productBrand, product, productIndex, Tag } = require("../../db").models;

//systemLog
const History = require("../../services/HistoryService");
const Request = require("../../lib/request");
const ProductService = require("../../services/ProductService");
const ObjectName = require("../../helpers/ObjectName");
const { Sequelize } = require("sequelize");
const Number = require("../../lib/Number");

const createAuditLog = async (oldData, updatedData, req, id) => {
  let companyId = Request.GetCompanyId(req);
  let auditLogMessage = [];

  if (Number.Get(updatedData?.manufacture_id) !== Number.Get(oldData?.manufacture_id)) {
      let manufacture = await Tag.findOne({
        where: { id: updatedData?.manufacture_id },
      });
      auditLogMessage.push(`Manufacture Updated To ${manufacture.name}\n`);
    }
    
  if (updatedData?.status && oldData.status !== updatedData?.status) {
      if (oldData.status !== updatedData?.status) {
        auditLogMessage.push(`Status Updated to  ${updatedData?.status}\n`);
      }
    }

  if (auditLogMessage.length > 0) {
      let message = auditLogMessage.join('');
      History.create(message, req, ObjectName.PRODUCT_BRAND, id);
  } else {
      History.create("Product Brand Updated", req, ObjectName.PRODUCT_BRAND, id);
  }
};

/**
 * Product brand update route
 */
async function update(req, res, next) {
  const hasPermission = await Permission.Has(Permission.BRAND_EDIT, req);

 

  const companyId = Request.GetCompanyId(req);
  const { name, status, manufacture_name, manufacture_id } = req.body;
  const { id } = req.params;

  // Validate product brand id
  if (!id) {
    return res.json(BAD_REQUEST, { message: "Product brand id is required" });
  }

  // Validate product brand id is exist or not
  const productBrandDetails = await productBrand.findOne({
    where: { id, company_id: companyId },
  });
  if (!productBrandDetails) {
    return res.json(BAD_REQUEST, { message: "Invalid product brand id" });
  }

  // Validate product brand name is exist or not
  const productBrandDetail = await productBrand.findOne({
    where: {
      company_id: companyId,
      [Sequelize.Op.or]: [
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          name.toLowerCase()
        ),
      ],
    },
  });

  if (
    productBrandDetail &&
    productBrandDetail.name !== productBrandDetails.name
  ) {
    return res.json(BAD_REQUEST, { message: "Brand name already exist" });
  }

  // Update product details
  let updateProductBrand = {};
  if (name) {
    updateProductBrand.name = name;
  }
  if (status) {
    updateProductBrand.status = status;
  }
  updateProductBrand.manufacture_id = manufacture_id;

  try {
    const save = await productBrandDetails.update(updateProductBrand);

    await productIndex.update(
      {
        manufacture_id: updateProductBrand.manufacture_id,
      },
      {
        where: { brand_id: id, company_id: companyId },
      }
    );

    const data = save.get();

    res.on("finish", async () => {

      await createAuditLog(productBrandDetail, data, req, id);

      // Get Product Id
      const products = await product.findAll({
        where: { brand_id: id, company_id: companyId },
      });

      await products.forEach((product) => {
        const { id } = product.get();
        const productId = id;
        if (productId && companyId) {
          ProductService.reindex(productId, companyId);
        }
      });
    });

    return res.json(UPDATE_SUCCESS, {
      message: "Product Brand Updated",
      data: {
        id,
        name: data.name,
        image: data.image ? data.image : "",
        status: data.status,
        manufacture_id: data.manufacture_id,
      },
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

module.exports = update;
