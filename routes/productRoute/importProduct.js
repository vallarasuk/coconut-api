/**
 * Module dependencies
 */
// Status
const { BAD_REQUEST, CREATE_SUCCESS } = require("../../helpers/Response");

const String = require("../../lib/string");
const util = require("../../lib/Url");
// Models
const { product, productIndex, storeProduct, Location } = require("../../db").models;
const { createProductFromUrl } = require("../../services/ProductService")
// Lib
const Request = require("../../lib/request");
const vendorProductService = require("../../services/VendorProductService");

//systemLog
const History = require("../../services/HistoryService");
const Permission = require("../../helpers/Permission");
const Product = require("../../helpers/Product");
const ObjectName = require("../../helpers/ObjectName");
/**
 * Product create route
 */
async function importProduct(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_ADD, req);


    const { url } = req.query;
    const companyId = Request.GetCompanyId(req);
    try {
        const productInfo = await vendorProductService.getProductFromUrl(url, companyId);
        const vendorProductData = {
            name: productInfo.name,
            vendorBaseUrl: productInfo.vendorBaseUrl,
            description: productInfo.description,
            price: productInfo.mrp,
            salePrice: productInfo.price,
            brandName: productInfo.brandName,
            categoryName: productInfo.typeName,
            images: productInfo.images,
            url,
            status: Product.STATUS_DRAFT,
        };
        const vendorUrl = util.removeQueryStringFromUrl(url);
        const exist = await product.findOne({ where: { vendor_url: vendorUrl, company_id: companyId } });

        if (exist) {
            return res.json(BAD_REQUEST, { message: "Product Already Exist", });
        }
        const vendorProduct = await createProductFromUrl(vendorProductData, companyId);

        const storeList = await Location.findAll({

            where: { company_id: companyId },
        });
        let storeListData = storeList;

        //validate stock entry list exist or noit
        if (storeListData && storeListData.length > 0) {
            //loop the stock entry list
            for (let i = 0; i < storeListData.length; i++) {
                //destructure the stock entry list
                const {
                    id
                } = storeListData[i];

                const productCreateData = {
                    product_id: vendorProduct.id,
                    company_id: companyId,
                    store_id: id,
                    status: vendorProduct.status,


                }
                await storeProduct.create(productCreateData)

            }
        }
        res.json(CREATE_SUCCESS, {
            message: "Product  Imported", data: vendorProduct
        });

        // systemLog
        res.on("finish", async () => {
            History.create(
                `Product  Imported`,
                req,
                ObjectName.PRODUCT,
                vendorProduct.id);
        })
        // Return Success Message

    } catch (err) {
        console.log(err);
        //create system log for error
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = importProduct;