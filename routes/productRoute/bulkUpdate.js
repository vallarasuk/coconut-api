/**
 * Module dependencies
 */
const async = require("async");

// Constants
const { BAD_REQUEST, OK } = require("../../helpers/Response");

// Models
const { product } = require("../../db").models;

// Services
const productTagService = require("../../services/ProductTagService");
const locationProductService = require("../../services/locationProductService");
const ProductService = require("../../services/ProductService");

const dbService = require("../../lib/dbService");
const { STORE_PRODUCT_EXPORT_STATUS_PENDING } = require("../../helpers/StoreProduct");
const Request = require("../../lib/request");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const { reindex } = require("../../services/ProductService");
const Product = require("../../helpers/Product");
const ObjectName = require("../../helpers/ObjectName");
const Number = require("../../lib/Number");
/**
 * Product bulk update route
 */
async function bulkUpdate(req, res, next) {

    const hasPermission = await Permission.Has(Permission.PRODUCT_BULK_UPDATE, req);

    const companyId = Request.GetCompanyId(req);


    try {
        const data = req.body;
        const productIds = data.ids;

        // Validate product id
        if (productIds.length == 0) {
            return res.json(BAD_REQUEST, { message: "Product id is required", });
        }

        for (let i = 0; i < productIds.length; i++) {
            const productId = productIds[i];
            const updateData = {};

            const productTagId = data.addTags ? data.addTags.id : "";

            const removedProductTagType = data.removedProductTagType;

            const findProductName = data.findProductName;

            const replaceProductName = data.replaceProductName;

            const findProductDescription = data.findProductDescription;

            const replaceProductDescription = data.replaceProductDescription;

            const findProductSlug = data.findProductSlug;

            const replaceProductSlug = data.replaceProductSlug;

            if (data.storeId) {
                updateData.store_id = data.storeId;
            }

            if (data.productName) {
                updateData.name = data.productName;
            }

            if (data.category) {
                updateData.category_id = data.category;
            }

            if (data.brandId) {
                updateData.brand_id = data.brandId;
            }

            if (data.tax_percentage) {
                updateData.tax_percentage = data.tax_percentage;
            }

            if (data && data.allow_transfer_out_of_stock && data.allow_transfer_out_of_stock.value === 1) {
                updateData.allow_transfer_out_of_stock = data.allow_transfer_out_of_stock.value
            }
            if (data && data.allow_transfer_out_of_stock && data.allow_transfer_out_of_stock.value === 0) {
                updateData.allow_transfer_out_of_stock = null
            }
            if (data && data.allow_sell_out_of_stock && data.allow_sell_out_of_stock.value === 1) {
                updateData.allow_sell_out_of_stock = data.allow_sell_out_of_stock.value
            }
            if (data && data.allow_sell_out_of_stock && data.allow_sell_out_of_stock.value === 0) {
                updateData.sell_out_of_stock = null
            }

            if (data.taxable === 0 || data.taxable === 1) {
                updateData.taxable = data.taxable;
            }

            if (data.weightUnit) {
                updateData.weight_unit = data.weightUnit;
            }

            if (data.weight) {
                updateData.weight = data.weight;
            }

            if (data.min_quantity) {
                updateData.min_quantity = data.min_quantity;
            }

            if (data.max_quantity) {
                updateData.max_quantity = data.max_quantity;
            }

            if (data.pack_size) {
                updateData.pack_size = data.pack_size;
            }

            if (data.sellOutOfStock) {
                updateData.sell_out_of_stock = data.sellOutOfStock;
            }

            if (data.description) {
                updateData.description = data.description;
            }

            if (data.sgst_percentage) {
                updateData.sgst_percentage = data.sgst_percentage;
            }

            if (data.cgst_percentage) {
                updateData.cgst_percentage = data.cgst_percentage;
            }

            if (data.status == Product.STATUS_ACTIVE_TEXT) {
                updateData.status = Product.STATUS_ACTIVE

            } else if (data.status == Product.STATUS_DRAFT_TEXT) {
                updateData.status = Product.STATUS_DRAFT
            } else if (data.status == Product.STATUS_INACTIVE_TEXT
            ) {
                updateData.status = Product.STATUS_INACTIVE
            }

            if (data.shopifyQuantity) {
                updateData.shopify_quantity = data.shopifyQuantity;
            }

            data.tag_id = data.addTags ? data.addTags.id : "";

            if (data.tag_id) {
                updateData.tag_id = data.tag_id;
            }

            if (Number.isNotNull(data.size)) {
                updateData.size = data.size;
            }

            if (Number.isNotNull(data.unit)) {
                updateData.unit = data.unit;
            }


            // Update product
            await product.update(updateData, { where: { id: productId, company_id: companyId } });
            await reindex(productId, companyId);

            let storeProductData = {}

            if (data.max_quantity) {
                storeProductData.max_quantity = data.max_quantity
            }

            if (data.min_quantity) {
                storeProductData.min_quantity = data.min_quantity
            }

            await ProductService.updateMinMaxQtyByProductId(productId, companyId, storeProductData);

            if (productTagId) {
                // Bulk Create Product Tag
                await productTagService.bulkCreate(
                    productId,
                    productTagId,
                    companyId,
                    () => { }
                );
            }

            // Bulk Remove Product Tag
            if (removedProductTagType) {
                await productTagService.bulkRemove(
                    productId,
                    removedProductTagType,
                    () => { }
                );
            }

            // Update Product Name
            await dbService.updateUsingFindAndReplace(
                productId,
                "product",
                "name",
                findProductName,
                replaceProductName,
                () => { }
            );

            // Update Product Description
            await dbService.updateUsingFindAndReplace(
                productId,
                "product",
                "description",
                findProductDescription,
                replaceProductDescription,
                () => { }
            );

            // Update Product Slug
            await dbService.updateUsingFindAndReplace(
                productId,
                "product",
                "slug",
                findProductSlug,
                replaceProductSlug,
                () => { }
            );

            await locationProductService.updateAllStoreProductByProductId(
                productId,
                { exportStatus: STORE_PRODUCT_EXPORT_STATUS_PENDING }
            );

        }

        //create system log for bulk updation
        res.on("finish", async () => {
            History.create("Products bulk updated", req, ObjectName.PRODUCT);
        });

        // API response
        return res.json(OK, { message: "Products updated", });

    } catch (err) {
        console.log(err);
    }
};

module.exports = bulkUpdate;
