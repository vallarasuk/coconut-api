/**
 * Module dependencies
 */
const async = require("async");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");
const vendorProductService = require("../../services/VendorProductService");
const productService = require("../../services/ProductService");
const History = require("../../services/HistoryService");
const { UploadFromUrlToS3 } = require("../../lib/s3");
const String = require("../../lib/string");
const { updateProducts } = require("../../services/ProductService");
const { getProductCategoryId } = require("../../services/ProductCategoryService");
const { getProductBrandId } = require("../../services/ProductBrandService");
const ObjectName = require("../../helpers/ObjectName");
const { Media } = require("../../helpers/Media");
const { FEATURE_ENABLED, FEATURE_DISABLED } = require("../../helpers/Product");
// import updateVendorImportedProduct from "./updateVendorImportedProduct";
// import async from "async";

const { product, Media: MediaModel } = require("../../db").models;
/**
 * Sync product from vendor product route
 */
async function syncVendorProduct(req, res, next) {
    const hasPermission = await Permission.Has(Permission.SYNC_FROM_VENDOR_URL, req);


    const { id } = req.params;
    const companyId = req.user.company_id;

    // Validate id
    if (!id) {
        return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    try {
        // Get  product
        const vendorProduct = await product.findOne({
            where: { id, company_id: companyId },
        });
        if (vendorProduct.vendor_url == null) {
            return res.json(BAD_REQUEST, { message: "Vendor URL not found" });
        }
        if (!vendorProduct) {
            return res.json(BAD_REQUEST, { message: "Vendor Product for found" });
        }

        const {
            vendor_url,
            name,
            description,
            sale_price,
            brand_id,
            category_id,
            mrp
        } = vendorProduct;
        let brandId
        let categoryId
        const productInfo = await vendorProductService.getProductFromUrl(vendor_url, companyId);
        if (productInfo.brandName) {
            brandId = await getProductBrandId(productInfo.brandName, companyId);
        }
        if (productInfo.typeName) {
            categoryId = await getProductCategoryId(productInfo.typeName, companyId);
        }
        const vendorProductData = {
            name: name == productInfo.name ? name : productInfo.name,
            description: description == productInfo.description ? description : productInfo.description,
            mrp: mrp == productInfo.mrp ? mrp : productInfo.mrp,
            sale_price: sale_price == productInfo.price ? sale_price : productInfo.price,
            brand_id: brand_id == brandId ? brand_id : brandId,
            category_id: category_id == categoryId ? category_id : categoryId,
        };
        //  await vendorProductService.updateProduct(id, vendorProductData, companyId)
        const save = await product.update(vendorProductData, { where: { id } });
        const mediaList = await MediaModel.findAll({ where: { object_id: id, object_name: ObjectName.PRODUCT } })
        if (mediaList.length <= 0) {
            if (productInfo.images && productInfo.images.length > 0) {
                const images = productInfo.images;
                async.eachSeries(
                    images,
                    async (image) => {
                        let index = images.indexOf(image);

                        let fileName = productInfo.name && String.replaceSpecialCharacter(productInfo.name);
                        let medaiData = {
                            name: productInfo.name,
                            file_name: fileName,
                            visibility: Media.VISIBILITY_PUBLIC,
                            company_id: companyId,
                            object_id: id,
                            object_name: ObjectName.PRODUCT,
                            feature: index == 0 ? FEATURE_ENABLED : FEATURE_DISABLED
                        };
                        let MediaCreatedData = await Media.create(medaiData);

                        const mediaId = MediaCreatedData.id;
                        const imagePath = `${mediaId}-${fileName}`;

                        // Media Upload In S3
                        UploadFromUrlToS3((image && image.src) || image, imagePath);
                    });
            }

        }
        res.json(OK, { message: "Product synced", data: save });
        res.on("finish", async () => {
            //create system log for product updation
            History.create(`'${vendorProductData.name}' Product Synced`, req,
                ObjectName.PRODUCT,
                id);

            productService.reindex(id, companyId);
        });
        //  });
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = syncVendorProduct;
