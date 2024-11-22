/**
 * Module dependencies
 */

const async = require("async");

// Status
const { BAD_REQUEST, OK } = require("../../helpers/Response");

// Services
const { createProduct, updateProducts } = require("../../services/ProductService");
const supplierProductService = require("../../services/VendorProductService");
const syncService = require("../../services/SyncService");

const String = require("../../lib/string");

const {
  SYNC_OBJECT_NAME_VENDOR_PRODUCT,
  SYNC_STATUS_COMPLETED,
  SYNC_STATUS_FAILED,
  SYNC_NAME_EXPORT_TO_MASTER,
} = require("../../helpers/Sync");

const Product = require("../../helpers/Product");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const ObjectName = require("../../helpers/ObjectName");

/**
 * Product create route
 */
async function exportToProduct(req, res, next) {
  const hasPermission = await Permission.Has(
    Permission.SUPPLIER_PRODUCT_EXPORT_TO_PRODUCT,
    req
  );

 

  const data = req.body;
  
  try {
   
    const vendorProductIds = data.ids;
    const companyId = req.user.company_id;
    // Validate product ids
    if (!vendorProductIds && vendorProductIds.length == 0) {
      return res.json(BAD_REQUEST, { message: "Products is required" });
    }

    vendorProductIds.forEach(async (vendorProductId) => {
      // Get Vendor Products Details
      const vendorProductDetails =
        await supplierProductService.getVendorProductById(
          vendorProductId,
          companyId
        );
      const {
        name,
        price,
        sale_price,
        description,
        product_id,
        barcode,
        category_id,
        brand_id,
        images,
      } = vendorProductDetails;

      const slug = String.formattedName(name);

      if (product_id) {
        // Update Product Price And Sale Price
        updateProducts(
          product_id,
          { price, sale_price },
          companyId,
          async (err) => {
            if (err) {
              // Set sync status to FAILED
              await syncService.updateSyncByObjectId(
                vendorProductId,
                SYNC_OBJECT_NAME_VENDOR_PRODUCT,
                SYNC_NAME_EXPORT_TO_MASTER,
                {
                  status: SYNC_STATUS_FAILED,
                  result: err.message,
                },
                companyId
              );
            }

            await supplierProductService.updateProduct(
              vendorProductId,
              {
                status: Product.PRODUCT_STATUS_EXPORTED,
              },
              companyId
            );

            // Set sync status to COMPLETED
            await syncService.updateSyncByObjectId(
              vendorProductId,
              SYNC_OBJECT_NAME_VENDOR_PRODUCT,
              SYNC_NAME_EXPORT_TO_MASTER,
              {
                status: SYNC_STATUS_COMPLETED,
                result: null,
              },
              companyId
            );
          }
        );
      }

      // Product Data
      const productData = {
        name,
        slug,
        price,
        sale_price,
        images,
        description,
        sell_out_of_stock: 1,
        barcode,
        category_id,
        brand_id,
      };
      // Create product
      createProduct(productData, companyId, async (err, productId) => {
        if (err) {
          // Set sync status to FAILED
          await syncService.updateSyncByObjectId(
            vendorProductId,
            SYNC_OBJECT_NAME_VENDOR_PRODUCT,
            SYNC_NAME_EXPORT_TO_MASTER,
            {
              status: SYNC_STATUS_FAILED,
              result: err.message,
            },
            companyId
          );
        }

        const updateData = {
          productId,
          status: Product.PRODUCT_STATUS_EXPORTED,
        };
        await supplierProductService.updateProduct(
          vendorProductId,
          updateData,
          companyId
        );

        // Set sync status to COMPLETED
        await syncService.updateSyncByObjectId(
          vendorProductId,
          SYNC_OBJECT_NAME_VENDOR_PRODUCT,
          SYNC_NAME_EXPORT_TO_MASTER,
          {
            status: SYNC_STATUS_COMPLETED,
            result: null,
          },
          companyId
        );
      });
    });
    vendorProductIds.forEach(async (vendorProductId) => {
    History.create("Vendor product  exported", req, ObjectName.SUPPLIER_PRODUCT,vendorProductId);
    })
    res.json(OK, { message: "Product imported" });
  } catch (err) {
   console.log(err);
  }
}
module.exports = exportToProduct;
