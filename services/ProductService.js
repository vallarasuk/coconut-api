/**
 * Module dependencies
 */
const { Op } = require("sequelize");
const async = require("async");
const productImageService = require("./ProductImageService");
const History = require("./HistoryService");
const util = require("../lib/Url");

// Utils
const {
  STORE_PRODUCT_EXPORT_STATUS_PENDING,
} = require("../helpers/StoreProduct");

const productConstants = require("../helpers/Product");

const Product = require("../helpers/Product");

// Constants
const {
  PRODUCT_IMAGE_SHOPIFY_STATUS_NEW,
  PRODUCT_IMAGE_SHOPIFY_STATUS_PENDING,
  PRODUCT_IMAGE_STATUS_INACTIVE,
  PRODUCT_IMAGE_STATUS_ACTIVE,
} = require("../helpers/ProductImage");
const syncService = require("../services/SyncService");
const shopifyService = require("../services/ShopifyService");
// Services
const { createProductImage, deleteProductImage } = require("./ShopifyService");
const { Media } = require("../helpers/Media");
const { getProductBrandId } = require("./ProductBrandService");
const { getProductCategoryId } = require("./ProductCategoryService");
const String = require("../lib/string");
const Category = require("../helpers/Category");
const { UploadFromUrlToS3 } = require("../lib/s3");
const { BAD_REQUEST, CREATE_SUCCESS, UPDATE_SUCCESS, DELETE_SUCCESS } = require("../helpers/Response");
const ProductStatus = require("../helpers/Product");
const Currency = require("../lib/currency");
const Number = require("../lib/Number");
const MediaService = require("../services/MediaService");
const productPriceHelper = require("../helpers/ProductPrice");

const {
  product,
  productTag,
  vendorProduct,
  Media: MediaModel,
  productCategory,
  productBrand,
  Tag,
  productIndex,
  Location,
  storeProduct,
  orderProduct,
  purchaseOrderProductModal,
  PurchaseProduct,
  StockEntryProduct,
  TransferProduct,
  ProductPrice: ProductPriceModel,
} = require("../db").models;

const DataBaseService = require("../lib/dataBaseService");
const ObjectName = require("../helpers/ObjectName");
const Request = require("../lib/request");
const Brand = require("../helpers/Brand");
const DateTime = require("../lib/dateTime");
const { SYNC_OBJECT_NAME_VENDOR_PRODUCT, SYNC_NAME_EXPORT_TO_MASTER } = require("../helpers/Sync");
const Response = require("../helpers/Response");
const mediaService = require("./MediaService");
const productIndexModel = new DataBaseService(productIndex);
const productModelService = new DataBaseService(product);
const validator = require("../lib/validator");
const StoreProductMinMaxQuantityUpdateService = require("./StoreProductMinMaxQuantityUpdateService");
const ProductPrice = require("../helpers/ProductPrice");
const BrandService = require("./BrandService");
const CategoryService = require("./CategoryService");
const statusService = require('../services/StatusService');
const Status = require("../helpers/Status");
const locationProductService = require("./locationProductService");
const OrderProductService = require("./OrderProductService");

/**
 * Check whether product exist or not
 *
 * @param {*} productId
 * @param {*} companyId
 * @returns {*} false if not exist else product details
 */
const isExist = async (productId, companyId) => {
  try {
    if (!productId) {
      return callback({ message: "Product id is required" });
    }

    const productDetails = await product.findOne({
      where: { id: productId, company_id: companyId },
    });

    if (!productDetails) {
      return false;
    }

    return productDetails;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Create Product
 *
 * @param data
 * @param callback
 */
const createProduct = (data, companyId, callback) => {
  product.findOne({ where: { name: data.name, company_id: companyId } }).then((productDetails) => {
    // If Product Name is Already Exists
    if (productDetails) {
      return callback({ message: "Product name is already exist" });
    }

    const {
      name,
      type_name,
      brand_name,
      mrp,
      sale_price,
      slug,
      images,
      description,
      category_id,
      brand_id,
      allow_sell_out_of_stock,
    } = data;

    // Create Product Data
    const productCreateData = {
      name,
      brand_name,
      type_name,
      mrp,
      sale_price,
      slug,
      description,
      category_id,
      brand_id,
      allow_sell_out_of_stock,
      company_id: companyId,
    };

    // Create Product
    product
      .create(productCreateData)
      .then(async (result) => {
        const productId = result.id;

        productImageService.createProductImage(productId, images, name, companyId, async (err) => {
          if (!err) {
            return callback(null, productId);
          }

          return callback(err, productId);
        });
        reindex(productId, companyId);
      })
      .catch((err) => callback(err));
  });
};
/**
 * Create new vendor product
 *
 * @param {*} data
 */
const createProductFromUrl = async (data, companyId) => {
  try {
    const supplierUrl = util.removeQueryStringFromUrl(data.url);
    // Validate vendor url is exist

    if (data.brandName) {
      data.brandId = await getProductBrandId(data.brandName, companyId);
    }
    if (data.categoryName) {
      data.categoryId = await getProductCategoryId(data.categoryName, companyId);
    }
    const createProductData = {
      name: data.name,
      description: data.description,
      status: data.status ? data.status : ProductStatus.STATUS_DRAFT,
      category_id: data.categoryId,
      brand_id: data.brandId,
      slug: String.formattedName(data.name),
      vendor_url: supplierUrl,
      company_id: companyId,
      allow_transfer_out_of_stock: Product.ALLOW_TRANSFER_PRODUCT_OUT_OF_STOCK,
      allow_sell_out_of_stock: Product.PRODUCT_SELL_OUT_OF_STOCK_POLICY_CONTINUE_VALUE,
    };
    // let productData;
    const productData = await product.create(createProductData);
    if (data.images && data.images.length > 0) {
      const images = data.images;
      async.eachSeries(images, async (image) => {
        let index = images.indexOf(image);

        let fileName = productData.name && String.replaceSpecialCharacter(productData.name);

        let medaiData = {
          name: productData.name,
          file_name: fileName,
          visibility: Media.VISIBILITY_PUBLIC,
          company_id: companyId,
          object_id: productData.id,
          object_name: "PRODUCT",
          feature: index == 0 ? productConstants.FEATURE_ENABLED : productConstants.FEATURE_DISABLED,
        };

        let mediaData = await MediaModel.create(medaiData);
        const mediaId = mediaData.id;
        const imagePath = `${mediaId}-${fileName}`;

        // Media Upload In S3
        UploadFromUrlToS3((image && image.src) || image, imagePath);
      });
      reindex(productData.id, companyId);
    }

    return productData;
  } catch (err) {
    console.log(err);
  }
};
/**
 * Update product tag types
 *
 * @param {*} productId
 * @param {*} productTagType
 */
const updateProductTag = async (productId, productTagType, companyId) => {
  try {
    // Delete existing product tags
    await productTag.destroy({
      where: { product_id: productId, company_id: companyId },
      truncate: true,
    });

    // Create new product tags
    if (productTagType) {
      productTagType.forEach(async (result) => {
        result &&
          (await productTag.create({
            product_id: productId,
            tag_id: result,
            company_id: companyId,
          }));
      });
    }
    for (let tag of productTagType) {
      const { tagId } = tag;
      tagId &&
        (await productTag.create({
          product_id: productId,
          tag_id: tagId,
          company_id: companyId,
        }));
    }
  } catch (err) {
    console.log(err);
  }
};

/**
 * Update Product
 *
 * @param productId
 * @param data
 * @param callback
 * @returns {*}
 */
async function updateProducts(productId, data, companyId, callback) {
  try {
    let errorMessage;
    if (!productId) {
      errorMessage = { message: "Master product id not found" };
      if (callback) return callback(errorMessage);

      throw errorMessage;
    }

    const productDetails = await isExist(productId, companyId);

    if (!productDetails) {
      errorMessage = { message: "Master product not found" };
      if (callback) return callback(errorMessage);

      throw errorMessage;
    }

    let updateData = new Object();

    if (data.store_id) {
      updateData.store_id = data.store_id;
    }

    if (data.hsn_code) {
      updateData.hsn_code = data.hsn_code;
    }
    if (data.pack_size) {
      updateData.pack_size = Number.Get(data.pack_size);
    }
    if (data.slug) {
      updateData.slug = data.slug;
    }

    if (data.sku) {
      updateData.sku = data.sku;
    }
    if (data.print_name) {
      updateData.print_name = data.print_name;
    }
    if (data.description) {
      updateData.description = data.description;
    }

    if (data.weight) {
      updateData.weight = data.weight;
    }

    if (data.weight_unit) {
      updateData.weight_unit = data.weight_unit;
    }

    if (data.max_quantity) {
      updateData.max_quantity = data.max_quantity;
    }

    if (data.min_quantity) {
      updateData.min_quantity = data.min_quantity;
    }

    if (data.quantity) {
      updateData.quantity = data.quantity;
    }

    if (data.taxable) {
      updateData.taxable = data.taxable;
    }

    if (data.notes) {
      updateData.notes = data.notes;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.shopify_product_id) {
      updateData.shopify_product_id = data.shopify_product_id;
    }

    if (data.brand_id) {
      updateData.brand_id = data.brand_id;
    }

    if (data.allow_sell_out_of_stock != null) {
      updateData.allow_sell_out_of_stock = data.allow_sell_out_of_stock;
    }

    if (data.category_id) {
      updateData.category_id = data.category_id;
    }

    updateData.tax_percentage = data.tax_percentage;

    updateData.cgst_percentage = data.cgst_percentage;

    updateData.sgst_percentage = data.sgst_percentage;

    updateData.igst_percentage = data.igst_percentage;

    updateData.discount_percentage = Number.GetFloat(data.discount_percentage);

    updateData.margin_percentage = Number.GetFloat(data.margin_percentage);

    if (data.shopify_quantity) {
      updateData.shopify_quantity = data.shopify_quantity;
    }

    if (data.shopify_out_of_stock) {
      updateData.shopify_out_of_stock = data.shopify_out_of_stock;
    }

    if (data.shopify_price) {
      updateData.shopify_price = data.shopify_price;
    }

    if (data.seo_title) {
      updateData.seo_title = data.seo_title;
    }

    if (data.seo_keyword) {
      updateData.seo_keyword = data.seo_keyword;
    }

    if (data.seo_description) {
      updateData.seo_description = data.seo_description;
    }

    if (data.productTagType && Array.isArray(data.productTagType) && data.productTagType.length > 0) {
      updateData.tag_id = data.productTagType[0];
    }

    if (data.display_name) {
      updateData.display_name = data.display_name;
    }

    if (data.companyId) {
      updateData.company_id = data.companyId;
    }

    if (data.tag_id) {
      updateData.tag_id = data.tag_id;
    }
    if (data.profit_percentage) {
      updateData.profit_percentage = data.profit_percentage;
    }
    if (data.profit_amount) {
      updateData.profit_amount = data.profit_amount;
    }

    if (!isNaN(data.allow_transfer_out_of_stock)) {
      updateData.allow_transfer_out_of_stock = data.allow_transfer_out_of_stock;
    }
    if (!isNaN(data.track_quantity)) {
      updateData.track_quantity = data.track_quantity;
    }

    if (data.name) {
      updateData.name = data.name;
    }
    if (data.size) {
      updateData.size = data.size;
    }

    if (data.unit || data.unit === "") {
      updateData.unit = data.unit ? data.unit : null;
    }
    if (data.sale_price && data.cost) {
      updateData.profit_amount = Currency.Get(data.sale_price - data.cost);
    }

    await product.update(updateData, {
      where: { id: productId, company_id: companyId },
    });

    if (productId && companyId) {
      await reindex(productId, companyId);
    }

    if (data.productTagType) await updateProductTag(productId, data.productTagType, companyId);

    // update store_product export_status as PENDING
    await locationProductService.updateAllStoreProductByProductId(productId, {
      exportStatus: STORE_PRODUCT_EXPORT_STATUS_PENDING,
    });

    callback && callback();
  } catch (err) {
    console.log(err);
  }
}

/**
 * Get product details by product id
 *
 * @param {*} productId
 * @param {*} storeId
 */
const getProductDetails = async (productId, storeId, companyId) => {
  try {
    if (!productId) {
      throw { message: "Product id is required" };
    }

    const productDetail = await product.findOne({
      include: [
        {
          required: false,
          model: productCategory,
          as: "productCategory",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt"],
          },
        },
        {
          required: false,
          model: productBrand,
          as: "productBrand",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt"],
          },
        },
        {
          required: false,
          model: productTag,
          as: "productTag",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt"],
          },
          include: [
            {
              required: false,
              model: Tag,
              as: "tag",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"],
              },
            },
          ],
        },
      ],
      where: { id: productId, company_id: companyId },
    });
    // Product Not Found
    if (!productDetail) {
      throw { message: "Product not found" };
    }

    const {
      id,
      name,
      taxable,
      status,
      description,
      shopify_product_id,
      weight,
      weight_unit,
      quantity,
      shopify_quantity,
      sku,
      slug,
      allow_sell_out_of_stock,
      store_id,
      track_quantity,
    } = productDetail;

    const productTags = [];
    productDetail &&
      productDetail.productTag &&
      productDetail.productTag.forEach((tagType) => {
        productTags.push(tagType.tag.name);
      });

    const productCategoryName =
      productDetail && productDetail.productCategory ? productDetail.productCategory.name : '';
    const productBrandName = productDetail && productDetail.productBrand ? productDetail.productBrand.name : '';
    const productTagNames = productTags.join(",");
    const sellOutOfStockLabel = allow_sell_out_of_stock
      ? Product.PRODUCT_SELL_OUT_OF_STOCK_POLICY_CONTINUE
      : Product.PRODUCT_SELL_OUT_OF_STOCK_POLICY_DENY;

    const data = {
      id,
      name,
      slug,
      productCategoryName,
      productBrandName,
      productTagNames,
      description,
      weight,
      weight_unit,
      shopify_quantity,
      sku,
      sellOutOfStockLabel,
      taxable: taxable ? true : false,
      status: status === Product.PRODUCT_SHOPIFY_STATUS_PUBLISHED ? true : false,
      shopify_product_id,
      quantity,
      store_id,
      featured_media_url,
      track_quantity: track_quantity ? true : false,
    };

    return data;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Export product images in shopify
 *
 * @param {*} storeId
 * @param {*} shopifyProductId
 * @param {*} images
 */
function exportProductImageInShopify(storeId, shopifyProductId, images) {
  try {
    if (!images.length) {
      return null;
    }

    async.eachSeries(images, (image, cb) => {
      const imageData = {
        src: image.src,
        position: image.position,
        alt: image.alt,
      };

      if (image.status === PRODUCT_IMAGE_STATUS_INACTIVE) {
        return cb();
      }

      createProductImage(storeId, shopifyProductId, imageData);
    });
  } catch (err) {
    console.log(err);
  }
}

/**
 * Update product image in shopify
 *
 * @param {*} storeId
 * @param {*} shopifyProductId
 * @param {*} images
 */
function updateProductImageInShopify(storeId, shopifyProductId, images) {
  if (!images.length) {
    return null;
  }

  for (let image of images) {
    const imageData = {
      src: image.src,
      position: image.position,
      alt: image.alt,
    };

    const updateImage =
      image.shopifyStatus === PRODUCT_IMAGE_SHOPIFY_STATUS_PENDING && image.status === PRODUCT_IMAGE_STATUS_ACTIVE;

    const createImage =
      image.shopifyStatus === PRODUCT_IMAGE_SHOPIFY_STATUS_NEW && image.status === PRODUCT_IMAGE_STATUS_ACTIVE;

    const deleteImage =
      image.status === PRODUCT_IMAGE_STATUS_INACTIVE && image.shopifyStatus === PRODUCT_IMAGE_SHOPIFY_STATUS_PENDING;

    if (!image.shopifyStatus) {
      continue;
    }

    // Update image
    else if (updateImage) {
      deleteProductImage(storeId, shopifyProductId, image.shopifyId, () => {
        createProductImage(storeId, shopifyProductId, imageData);
      });
    }

    // Create new image
    else if (createImage || (!image.shopifyId && createImage)) {
      createProductImage(storeId, shopifyProductId, imageData);
    }

    // Delete image
    else if (deleteImage) {
      deleteProductImage(storeId, shopifyProductId);
    }
  }
}

const processData = async (productData) => {
  try {
    if (!productData) return {};

    const companyId = productData.company_id;

    const productId = productData.id;

    const priceDetail = productData.priceDetail;

    let productIndexData = {};

    const productIndexFields = [
      "name",
      "createdAt",
      "company_id",
      "brand_id",
      "category_id",
      "size",
      "unit",
      "category_name",
      "brand_name",
      "hsn_code",
      "quantity",
      "max_quantity",
      "min_quantity",
      "product_media_id",
      "featured_media_url",
      "status",
      "allow_transfer_out_of_stock",
      "allow_online_sale",
      "profit_amount",
      "profit_percentage",
      "allow_sell_out_of_stock",
      "tax_percentage",
      "cgst_percentage",
      "sgst_percentage",
      "igst_percentage",
      "pack_size",
      "track_quantity",
      "print_name",
      "manufacture_id",
      "manufacture_name",
      "discount_percentage",
      "margin_percentage",
      "reward",
      "shelf_life",
      "rack_number",
      "notes",
      "sku",
      "order_quantity"
    ];

    // Compare values between product table and productIndex table
    productIndexFields.forEach((productIndexField) => {
      if (productData[productIndexField]) {
        productIndexData[productIndexField] = productData[productIndexField];
      }
    });

    productIndexData.product_id = productData.id;
    productIndexData.product_name = productData.name;

    if (productData.category_id) {
      const productCategoryData = await productCategory.findOne({
        where: { id: productData.category_id, company_id: companyId },
      });

      if (productCategoryData) {
        productIndexData.category_name = productCategoryData.name;
      }
    }

    if (productData.brand_id) {
      const productBrandData = await productBrand.findOne({
        where: { id: productData.brand_id, company_id: companyId },
        include: [
          {
            required: false,
            model: Tag,
            as: "tag",
          },
        ],
      });

      if (productBrandData) {
        productIndexData.brand_name = productBrandData.name;
        productIndexData.manufacture_id = productBrandData && productBrandData.tag && productBrandData.tag.id;
        productIndexData.manufacture_name = productBrandData && productBrandData.tag && productBrandData.tag.name;
      }
    }

    if (productData.id) {
      //get product media list
      const mediaDetail = await MediaModel.findOne({
        where: { object_id: productData.id, object_name: "PRODUCT", company_id: companyId, feature: true },
      });

      if (mediaDetail) {
        productIndexData.product_media_id = mediaDetail.id;

        let featured_media_url = await MediaService.getMediaURL(mediaDetail.id, companyId);

        if (featured_media_url) {
          productIndexData.featured_media_url = featured_media_url;
        }
      }

      if (priceDetail) {
        if (priceDetail.sale_price) {
          productIndexData.sale_price = priceDetail.sale_price;
        }

        if (priceDetail.cost_price) {
          productIndexData.cost = priceDetail.cost_price;
        }

        if (priceDetail.mrp) {
          productIndexData.mrp = priceDetail.mrp;
        }

        if (priceDetail.discount_percentage) {
          productIndexData.discount_percentage = priceDetail.discount_percentage;
        }
        if (priceDetail.margin_percentage) {
          productIndexData.margin_percentage = priceDetail.margin_percentage;
        }
      }
    }

    let displayNameProperty = new Array();

    let displayName;

    if (productIndexData.brand_name) {
      displayNameProperty.push(productIndexData.brand_name);
    }

    if (productIndexData.name) {
      displayNameProperty.push(productIndexData.name);
    }

    if (productIndexData.size) {
      displayNameProperty.push(productIndexData.size);
    }

    if (productIndexData.unit) {
      displayNameProperty.push(productIndexData.unit);
    }

    if (displayNameProperty && displayNameProperty.length > 1) {
      displayName = displayNameProperty.join(" - ");
    } else if (displayNameProperty && displayNameProperty.length == 1) {
      displayName = displayNameProperty[0];
    }

    productIndexData.product_display_name = displayName;

    if (productData.cost >= 0 && productData.sale_price >= 0) {
      productIndexData.profit_amount = Currency.Get(productData.sale_price - productData.cost);
      productIndexData.profit_percentage = Currency.GetDifferenceInPercentage(productData.sale_price, productData.cost);
    }

    // if (!indexDetails) {
    //   indexDetails = Object.fromEntries(productIndexFields.map((key) => [key]));
    // }

    let order_quantity = await OrderProductService.getOrderProductQuantityByProductId(productData?.id, companyId);
    if (order_quantity) {
      productIndexData.order_quantity = order_quantity;
    }

    return productIndexData;
  } catch (err) {
    console.error(err);
  }
};

// let createIndexData = {};
const createIndex = async (data) => {
  let productIndexData = await processData(data);

  return await productIndex.create(productIndexData);
};

const reindexAll = async (companyId, req) => {
  try {
    History.create("Product Reindex : Reindex All function Triggered", req);

    let statusDetail = await statusService.Get(ObjectName.PRODUCT_PRICE, null, companyId, {
      is_active_price: ProductPrice.STATUS_ACTIVE,
    });

    let productPriceCondition = {};

    if (statusDetail) {
      productPriceCondition.status = statusDetail.id;
    }

    productPriceCondition.is_default = ProductPrice.IS_DEFAULT;

    // Get all products
    const products = await product.findAll({
      where: { company_id: companyId, deletedAt:null },
      include: [
        {
          required: false,
          model: ProductPriceModel,
          as: "priceDetail",
          where: productPriceCondition,
        },
      ],
    });

    if (!products) return null;
    let productData;
    let order_quantity;
    let brandData;
    let productCategoryData;
    let productBrandData;
    let mediaDetail;
    let displayNameProperty;
    let productDetail;
    let featured_media_url;
    if (products && products.length > 0) {
      try {
        for (let i = 0; i < products.length; i++) {
          productData = products[i];
          order_quantity = await OrderProductService.getOrderProductQuantityByProductId(productData?.id, companyId);

          brandData = await productBrand.findOne({
            where: { id: productData.brand_id, company_id: companyId },
            include: [
              {
                required: false,
                model: Tag,
                as: "tag",
              },
            ],
          });

          let productIndexData = {};

          productIndexData.product_id = productData.id;
          productIndexData.company_id = productData.company_id;
          productIndexData.product_name = productData.name;
          productIndexData.print_name = productData.print_name;
          productIndexData.brand_id = productData.brand_id;
          productIndexData.category_id = productData.category_id;
          productIndexData.size = productData.size;
          productIndexData.unit = productData.unit;
          productIndexData.product_price_id = productData.product_price_id;
          productIndexData.quantity = productData.quantity;
          productIndexData.max_quantity = productData.max_quantity;
          productIndexData.min_quantity = productData.min_quantity;
          productIndexData.status = productData.status;
          productIndexData.allow_transfer_out_of_stock = productData.allow_transfer_out_of_stock;
          productIndexData.allow_sell_out_of_stock = productData.allow_sell_out_of_stock;
          productIndexData.track_quantity = productData.track_quantity;
          productIndexData.tax_percentage = productData.tax_percentage;
          productIndexData.cgst_percentage = productData.cgst_percentage;
          productIndexData.sgst_percentage = productData.sgst_percentage;
          productIndexData.igst_percentage = productData.igst_percentage;
          productIndexData.manufacture_id = brandData && brandData.tag && brandData.tag.id;
          productIndexData.manufacture_name = brandData && brandData.tag && brandData.tag.name;
          productIndexData.pack_size = productData.pack_size;
          productIndexData.order_quantity = order_quantity;

          if (productData.priceDetail) {
            if (productData.priceDetail.sale_price) {
              productIndexData.sale_price = productData.priceDetail.sale_price;
            }

            if (productData.priceDetail.mrp) {
              productIndexData.mrp = productData.priceDetail.mrp;
            }

            if (productData.priceDetail.cost_price) {
              productIndexData.cost = productData.priceDetail.cost_price;
            }

            if (productData.priceDetail.discount_percentage) {
              productIndexData.discount_percentage = productData.priceDetail.discount_percentage;
            }

            if (productData.priceDetail.margin_percentage) {
              productIndexData.margin_percentage = productData.priceDetail.margin_percentage;
            }
          }

          if (productData.category_id) {
            productCategoryData = await productCategory.findOne({
              where: { id: productData.category_id, company_id: companyId },
            });

            if (productCategoryData) {
              productIndexData.category_name = productCategoryData.name;
            }
          }

          if (productData.brand_id) {
            productBrandData = await productBrand.findOne({
              where: { id: productData.brand_id, company_id: companyId },
            });

            if (productBrandData) {
              productIndexData.brand_name = productBrandData.name;
            }
          }

          if (productData.id) {
            //get product media list
            mediaDetail = await MediaModel.findOne({
              where: { object_id: productData.id, object_name: "PRODUCT", company_id: companyId, feature: true },
            });

            if (mediaDetail) {
              productIndexData.product_media_id = mediaDetail.id;

              featured_media_url = await MediaService.getMediaURL(mediaDetail.id, companyId);

              if (featured_media_url) {
                productIndexData.featured_media_url = featured_media_url;
              }
            }
          }

          displayNameProperty = new Array();

          if (productIndexData.brand_name) {
            displayNameProperty.push(productIndexData.brand_name);
          }

          if (productIndexData.product_name) {
            displayNameProperty.push(productIndexData.product_name);
          }

          if (productIndexData.size) {
            displayNameProperty.push(productIndexData.size);
          }

          if (productIndexData.unit) {
            displayNameProperty.push(productIndexData.unit);
          }

          if (displayNameProperty && displayNameProperty.length > 1) {
            displayName = displayNameProperty.join(" - ");
          } else if (displayNameProperty && displayNameProperty.length == 1) {
            displayName = displayNameProperty[0];
          }

          productIndexData.product_display_name = displayName;

          if (productData.cost >= 0 && productData.sale_price >= 0) {
            productIndexData.profit_amount = Currency.Get(productData.sale_price - productData.cost);
            productIndexData.profit_percentage = Currency.GetDifferenceInPercentage(
              productData.sale_price,
              productData.cost
            );
          }
          // Create index record
          productDetail = await productIndex.update(productIndexData, {
            where: {
              product_id: productData?.id,
              company_id: companyId,
            },
          });
          if (productDetail && productDetail[0] == 0) {
            await productIndex.create(productIndexData);
          }
        }
      } catch (err) {
        History.create(`Product Reindex Error :${err} `, req);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateProductStatus = async (data, id) => {
  return await product.update(data, { where: { id: id } });
};

const reindex = async (productId, companyId) => {
  //create requuest object
  let reqObject = new Object();

  //validat company Id exist or not
  if (!companyId) {
    return null;
  }
  //create user object
  let user = { company_id: companyId };

  //create req object
  reqObject.user = user;

  try {
    //create susyem log
    History.create("Product Reindex : Reindex function Triggered", reqObject);

    //validate product ID exist or not
    if (!productId) {
      History.create("Product Reindex : Product Id Required", reqObject);
      return null;
    }
    let statusDetail = await statusService.Get(ObjectName.PRODUCT_PRICE, null, companyId, {
      is_active_price: ProductPrice.STATUS_ACTIVE,
    });

    let productPriceCondition = {};

    if (statusDetail) {
      productPriceCondition.status = statusDetail.id;
    }

    productPriceCondition.is_default = ProductPrice.IS_DEFAULT;

    //get product index
    let isProductExist = await productIndex.findOne({ where: { product_id: productId, company_id: companyId } });

    //validate prodict exist or  not
    if (isProductExist) {
      // Hard delete all previous records
      await productIndex.destroy({
        where: { company_id: companyId, product_id: productId },
        force: true,
      });
    }

    //create system log
    History.create("Product Reindex : Product index Table Destroyed", reqObject);

    // Get all products
    const productDetail = await product.findOne({
      where: { company_id: companyId, id: productId },
      include: [
        {
          required: false,
          model: ProductPriceModel,
          as: "priceDetail",
          where: productPriceCondition,
        },
      ],
    });

    //validate product detail
    if (!productDetail) return null;

    //create system log
    History.create("Product Reindex : Take products data from product Table", reqObject);

    // Create index record
    await createIndex(productDetail);
  } catch (err) {
    console.log(err);
    History.create(`Product Reindex Error :${err} `, reqObject);
  }
};

const getDetail = async (product_id, companyId) => {
  try {
    const productDetail = await productIndexModel.findOne({
      where: { product_id: product_id, company_id: companyId },
    });
    return productDetail;
  } catch (err) {
    console.log(err);
  }
};

async function create(req, res, next) {
  const data = req.body;

  const companyId = Request.GetCompanyId(req);

  // Validate product name
  if (!data.name) {
    return res.json(BAD_REQUEST, { message: "Product Name is required", });
  }

  try {
    const name = data.name.trim();

    // Validate duplicate product name
    const productExist = await product.findOne({
      where: { name, company_id: companyId },
    });
    if (productExist) {
      return res.json(BAD_REQUEST, { message: "Product name already exist", });
    }

    const slug = String.formattedName(name);

    // Product Data
    const productData = {
      slug,
      type_name: String.Get(data.typeName),
      brand_name: String.Get(data.brandName),
      category_name: String.Get(data.category_name),
      brand_id: data.brand_id ? String.Get(data.brand_id) : null,
      category_id: data.category_id ? String.Get(data.category_id) : null,
      sku: data.sku ? String.Get(data.sku) : null,
      name: data.name,
      description: data.description ? String.Get(data.description) : null,
      weight: data.weight ? String.Get(data.weight) : null,
      weight_unit: data.weightUnit ? String.Get(data.weightUnit) : null,
      notes: data.notes ? String.Get(data.notes) : null,
      status: data.status ? data.status : Product.STATUS_ACTIVE,
      size: data.size ? String.Get(data.size) : null,
      unit: data.unit ? String.Get(data.unit) : null,
      company_id: companyId,
      allow_transfer_out_of_stock: Product.ALLOW_TRANSFER_PRODUCT_OUT_OF_STOCK,
      allow_sell_out_of_stock: Product.PRODUCT_SELL_OUT_OF_STOCK_POLICY_CONTINUE_VALUE,
    };

    // Create Product
    const productDetails = await product.create(productData);

    const locationList = await Location.findAll({
      where: { company_id: companyId },
    });

    if (productDetails && (data.barcode || data.mrp || data.salePrice)) {
      let statusDetail = await statusService.Get(ObjectName.PRODUCT_PRICE, Status.GROUP_DRAFT, companyId);

      let productPriceData = new Object();

      if (data.barcode) {
        productPriceData.barcode = String.Get(data.barcode);
      }

      if (data.salePrice) {
        productPriceData.sale_price = Number.Get(data.salePrice);
      }

      if (data.mrp) {
        productPriceData.mrp = Number.Get(data.mrp);
      }

      productPriceData.product_id = productDetails.id;

      productPriceData.company_id = companyId;

      if (statusDetail) {
        productPriceData.status = statusDetail.id;
      }

      productPriceData.date = new Date();

      await ProductPriceModel.create(productPriceData);
    }

    let storeListData = locationList;

    //validate stock entry list exist or noit
    if (storeListData && storeListData.length > 0) {
      //loop the stock entry list
      for (let i = 0; i < storeListData.length; i++) {
        //destructure the stock entry list
        const { id } = storeListData[i];

        const productCreateData = {
          product_id: productDetails.id,
          company_id: companyId,
          store_id: id,
          status: productDetails.status,
        };
        await storeProduct.create(productCreateData);
      }
    }

    res.json(CREATE_SUCCESS, { message: "Product Added", productDetails: productDetails });

    res.on('finish', async () => {
      History.create(`${data.name} Product Added`, req, ObjectName.PRODUCT, productDetails.id);

      await reindex(productDetails.id, companyId);
    });

    //create system log
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

const updatePrice = async (req, res, next) => {
  try {
    const data = req.body;
    const companyId = req.user && req.user.company_id;
    const { id } = req.params;
    // Validate product
    if (!id) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    // Product Data
    const mrp = Number.Get(data.mrp);
    const sale_price = Number.Get(data.sale_price);
    const name = data.name || null;
    const cost = Currency.Get(data.cost);
    const tax_percentage = data.cess_percentage;
    const cgst_percentage = data.cgst_percentage;
    const sgst_percentage = data.sgst_percentage;
    const igst_percentage = data.igst_percentage;
    const discount_percentage = data.discount_percentage;
    const margin_percentage = data.margin_percentage;

    // Update product Data
    const updateProductData = {};
    if (data.cost || data.cost === "") {
      updateProductData.cost = cost;
    }
    if (data.mrp || data.mrp === "") {
      updateProductData.mrp = mrp;
    }
    if (data.sale_price || data.sale_price === "") {
      updateProductData.sale_price = sale_price;
    }
    if (data.cgst_percentage || data.cgst_percentage === "") {
      updateProductData.cgst_percentage = cgst_percentage;
    }
    updateProductData.discount_percentage = Number.GetFloat(discount_percentage);

    updateProductData.margin_percentage = Number.GetFloat(margin_percentage);

    updateProductData.sgst_percentage = sgst_percentage;

    updateProductData.igst_percentage = igst_percentage;

    updateProductData.tax_percentage = tax_percentage;

    await updateProducts(id, updateProductData, companyId);

    // API response
    res.json(UPDATE_SUCCESS, { message: "Product Updated" });

    res.on("finish", async () => {
      //create system log for product updation
      for (let [key, value] of Object.entries(data)) {
        History.create(`${key.toUpperCase()} Updated To "₹${value ? value : 0}"`, req, ObjectName.PRODUCT, id);
      }

      reindex(id, companyId);
    });
  } catch (err) {
    console.log(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = req.body;

    const { id } = req.params;

    const companyId = Request.GetCompanyId(req);

    let updateProductObject = new Object();

    // Validate product
    if (!id) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    let productDetails = await productModelService.findOne({
      where: { id: id, company_id: companyId },
    });

    const {
      slug,
      category,
      category_id,
      brand_id,
      sku,
      name,
      print_name,
      description,
      taxable,
      Size,
      Unit,
      max_quantity,
      min_quantity,
      bigbasketUrl,
      hsn_code,
      pack_size,
      shopify_quantity,
      shopifyOutOfStock,
      shopify_price,
      seo_title,
      seo_keyword,
      seo_description,
      taxPercentage,
      cgst_percentage,
      sgst_percentage,
      igst_percentage,
      status,
      allow_transfer_out_of_stock,
      allow_sell_out_of_stock,
      track_quantity,
      cess_percentage,
      manufacture_id,
      max_stock_days,
      min_stock_days,
      manufacture_name,
      discount_percentage,
      margin_percentage,
      reward,
      shelf_life,
      rack_number,
      allow_online_sale,
      notes,
    } = data;

    let historyMessage = new Array();

    if (validator.isNotEmpty(slug) && slug != productDetails.slug) {
      updateProductObject.slug = slug;
      historyMessage.push(`Product Slug Updated from ${productDetails.slug} to ${slug}\n`);
    }

    if (validator.isNotEmpty(sku) && data.sku != productDetails.sku) {
      updateProductObject.sku = sku;
      historyMessage.push(`Product sku Updated from ${productDetails.sku} to ${sku}\n`);
    }

    if (validator.isNotEmpty(bigbasketUrl) && bigbasketUrl != productDetails.vendor_url) {
      updateProductObject.vendor_url = bigbasketUrl;
      historyMessage.push(`Product vendor_url Updated from ${productDetails.vendor_url} to ${bigbasketUrl}\n`);
    }

    if (validator.isNotEmpty(name) && name != productDetails.name) {
      updateProductObject.name = name;
      historyMessage.push(`Product name Updated from ${productDetails.name} to ${name}\n`);
    }

    if (validator.isNotEmpty(description) && description != productDetails.description) {
      updateProductObject.description = description;
      historyMessage.push(`Product description Updated from ${productDetails.description} to ${description}\n`);
    }
    if (validator.isNotEmpty(notes) && notes != productDetails.notes) {
      updateProductObject.notes = String.Get(notes);
      historyMessage.push(`Product notes Updated from ${productDetails.notes} to ${notes}\n`);
    }

    if (validator.isNotEmpty(Size) && Size != productDetails.size) {
      updateProductObject.size = Number.GetFloat(Size);
      historyMessage.push(`Product size Updated from ${productDetails.size} to ${Size}\n`);
    }

    if (Unit !== undefined && Unit != productDetails.unit) {
      updateProductObject.unit = Unit;
      historyMessage.push(`Product unit Updated from ${productDetails.unit} to ${Unit}\n`);
    }

    if (validator.isNotEmpty(max_quantity) && max_quantity != productDetails.max_quantity) {
      updateProductObject.max_quantity = Number.Get(max_quantity);
      historyMessage.push(`Product max quantity Updated from ${productDetails.max_quantity} to ${max_quantity}\n`);
    }

    if (validator.isNotEmpty(min_quantity) && min_quantity != productDetails.min_quantity) {
      updateProductObject.min_quantity = Number.Get(min_quantity);
      historyMessage.push(`Product min quantity Updated from ${productDetails.min_quantity} to ${min_quantity}\n`);
    }

    if (validator.isNotEmpty(taxable) && taxable != productDetails.taxable) {
      updateProductObject.taxable = taxable;
      historyMessage.push(`Product taxable Updated from ${productDetails.taxable} to ${taxable}\n`);
    }

    if (brand_id !== undefined && brand_id != productDetails.brand_id) {
      let getOldBrandDetail = await BrandService.getBrandDetailsById(productDetails.brand_id, companyId);
      let getNewBrandDetail = await BrandService.getBrandDetailsById(brand_id, companyId);
      updateProductObject.brand_id = brand_id;
      historyMessage.push(`Product brand Updated from ${getOldBrandDetail?.name} to ${getNewBrandDetail?.name}\n`);
    }

    if (category_id !== undefined && category_id != productDetails.category_id) {
      let getOldCategoryDetail = await CategoryService.getCategoryDetailsById(productDetails?.category_id, companyId);
      let getNewCategoryDetail = await CategoryService.getCategoryDetailsById(category_id, companyId);
      updateProductObject.category_id = category_id;
      historyMessage.push(
        `Product category Updated from ${getOldCategoryDetail?.name} to ${getNewCategoryDetail?.name}\n`
      );
    }

    if (validator.isNotEmpty(cgst_percentage) && cgst_percentage != productDetails.cgst_percentage) {
      updateProductObject.cgst_percentage = Number.GetFloat(cgst_percentage);
      historyMessage.push(
        `Product cgst_percentage Updated from ${productDetails.cgst_percentage} to ${cgst_percentage}\n`
      );
    }

    if (validator.isNotEmpty(sgst_percentage) && sgst_percentage != productDetails.sgst_percentage) {
      updateProductObject.sgst_percentage = Number.GetFloat(sgst_percentage);
      historyMessage.push(
        `Product sgst_percentage Updated from ${productDetails.sgst_percentage} to ${sgst_percentage}\n`
      );
    }

    if (validator.isNotEmpty(igst_percentage) && igst_percentage != productDetails.igst_percentage) {
      updateProductObject.igst_percentage = Number.GetFloat(igst_percentage);
      historyMessage.push(
        `Product igst_percentage Updated from ${productDetails.igst_percentage} to ${igst_percentage}\n`
      );
    }

    if (validator.isNotEmpty(cess_percentage) && cess_percentage != productDetails.tax_percentage) {
      updateProductObject.tax_percentage = Number.GetFloat(cess_percentage);
      historyMessage.push(
        `Product cess_percentage Updated from ${productDetails.tax_percentage} to ${cess_percentage}\n`
      );
    }

    if (validator.isNotEmpty(hsn_code) && hsn_code != productDetails.hsn_code) {
      updateProductObject.hsn_code = Number.Get(hsn_code);
      historyMessage.push(`Product hsn_code Updated from ${productDetails.hsn_code} to ${hsn_code}\n`);
    }

    if (pack_size !== undefined && pack_size != productDetails.pack_size) {
      updateProductObject.pack_size = Number.Get(pack_size);
      historyMessage.push(`Product pack_size Updated from ${productDetails.pack_size} to ${pack_size}\n`);
    }

    if (validator.isNotEmpty(shopify_quantity) && shopify_quantity != productDetails.shopify_quantity) {
      updateProductObject.shopify_quantity = Number.Get(shopify_quantity);
      historyMessage.push(
        `Product shopify_quantity Updated from ${productDetails.shopify_quantity} to ${shopify_quantity}\n`
      );
    }

    if (validator.isNotEmpty(shopify_price) && shopify_price != productDetails.shopify_price) {
      updateProductObject.shopify_price = Number.GetFloat(shopify_price);
      historyMessage.push(`Product shopify_price Updated from ${productDetails.shopify_price} to ${shopify_price}\n`);
    }

    if (validator.isNotEmpty(seo_title) && seo_title != productDetails.seo_title) {
      updateProductObject.seo_title = seo_title;
      historyMessage.push(`Product seo_title Updated from ${productDetails.seo_title} to ${seo_title}\n`);
    }

    if (validator.isNotEmpty(seo_keyword) && seo_keyword != productDetails.seo_keyword) {
      updateProductObject.seo_keyword = seo_keyword;
      historyMessage.push(`Product seo_keyword Updated from ${productDetails.seo_keyword} to ${seo_keyword}\n`);
    }

    if (validator.isNotEmpty(seo_description) && seo_description != productDetails.seo_description) {
      updateProductObject.seo_description = seo_description;
      historyMessage.push(
        `Product seo_description Updated from ${productDetails.seo_description} to ${seo_description}\n`
      );
    }

    if (validator.isNotEmpty(manufacture_id) && manufacture_id != productDetails.manufacture_id) {
      updateProductObject.manufacture_id = manufacture_id ? manufacture_id : null;
      historyMessage.push(`Product manufacture Updated from ${productDetails.manufacture_id} to ${manufacture_id}\n`);
    }

    if (
      validator.isNotEmpty(manufacture_name) &&
      manufacture_name !== "" &&
      manufacture_name != productDetails.manufacture_name
    ) {
      updateProductObject.manufacture_name = manufacture_name ? manufacture_name : null;
      historyMessage.push(
        `Product manufacture Updated from ${productDetails.manufacture_name} to ${manufacture_name}\n`
      );
    }

    if (validator.isNotEmpty(min_stock_days) && min_stock_days != productDetails.min_stock_days) {
      updateProductObject.min_stock_days = min_stock_days ? min_stock_days : null;
      historyMessage.push(
        `Product min_stock_days Updated from ${productDetails.min_stock_days} to ${min_stock_days}\n`
      );
    }

    if (validator.isNotEmpty(max_stock_days) && max_stock_days != productDetails.max_stock_days) {
      updateProductObject.max_stock_days = max_stock_days ? max_stock_days : null;
      historyMessage.push(
        `Product max_stock_days Updated from ${productDetails.max_stock_days} to ${max_stock_days}\n`
      );
    }

    if (validator.isNotEmpty(discount_percentage) && discount_percentage != productDetails.discount_percentage) {
      updateProductObject.discount_percentage = Number.GetFloat(discount_percentage);

      historyMessage.push(
        `Product discount_percentage Updated from ${productDetails.discount_percentage} to ${discount_percentage}\n`
      );
    }

    if (validator.isNotEmpty(margin_percentage) && margin_percentage != productDetails.margin_percentage) {
      updateProductObject.margin_percentage = Number.GetFloat(margin_percentage);

      historyMessage.push(
        `Product margin_percentage Updated from ${productDetails.margin_percentage} to ${margin_percentage}\n`
      );
    }

    if (validator.isNotEmpty(shopifyOutOfStock)) {
      let ShopifyOutOfStock = shopifyOutOfStock == true ? 1 : 0;

      if (ShopifyOutOfStock != productDetails.shopify_out_of_stock) {
        updateProductObject.shopify_out_of_stock = ShopifyOutOfStock;
      }
      historyMessage.push(
        `Product shopify_out_of_stock Updated from ${productDetails.shopify_out_of_stock} to ${ShopifyOutOfStock}\n`
      );
    }

    if (validator.isNotEmpty(print_name) && print_name != productDetails.print_name) {
      updateProductObject.print_name = print_name;
      historyMessage.push(`Product print_name Updated from ${productDetails.print_name} to ${print_name}\n`);
    }

    if (validator.isNotEmpty(reward) && reward != productDetails.reward) {
      updateProductObject.reward = Number.GetFloat(reward);

      historyMessage.push(`Product Sales Coin Updated from ${productDetails.reward} to ${reward}\n`);
    }

    if (validator.isNotEmpty(shelf_life) && shelf_life != productDetails.shelf_life) {
      updateProductObject.shelf_life = Number.GetFloat(shelf_life);

      historyMessage.push(`Product Shelf Life Updated from ${productDetails.shelf_life} to ${shelf_life}\n`);
    }

    if (validator.isNotEmpty(rack_number) && rack_number != productDetails.rack_number) {
      updateProductObject.rack_number = Number.Get(rack_number);

      historyMessage.push(`Product Rack Updated from ${productDetails.rack_number} to ${rack_number}\n`);
    }

    if (validator.isNotEmpty(status?.value) && status.value != productDetails.status) {
      updateProductObject.status = Number.Get(status.value);

      historyMessage.push(`Product status Updated to ${status.label}\n`);
    }

    const allowTransferProductOutOfStock = allow_transfer_out_of_stock == true ? 1 : 0;
    if (validator.isNotEmpty(allow_transfer_out_of_stock) && allowTransferProductOutOfStock !== productDetails.allow_transfer_out_of_stock) {
      let allowTransferOutOfStock =
        allow_transfer_out_of_stock == true
          ? Product.ALLOW_TRANSFER_PRODUCT_OUT_OF_STOCK
          : Product.DENY_TRANSFER_PRODUCT_OUT_OF_STOCK;

      if (allowTransferOutOfStock != productDetails.allow_transfer_out_of_stock) {
        updateProductObject.allow_transfer_out_of_stock = allowTransferOutOfStock;
      }
      let productData = productDetails.allow_transfer_out_of_stock == 1 ? true : false;
      historyMessage.push(
        `Product Allow transfer when out of stock Updated from ${productData} to ${allow_transfer_out_of_stock}\n`
      );
    }

    const allowOnlineSale = allow_online_sale == true ? 1 : 0;
    if (validator.isNotEmpty(allow_online_sale) && allowOnlineSale !== productDetails.allow_online_sale) {
      let allowOnline =
        allow_online_sale == true
          ? Product.ALLOW_ONLINE_SALE
          : Product.DENY_ONLINE_SALE;

      if (allowOnline != productDetails.allow_online_sale) {
        updateProductObject.allow_online_sale = allowOnline;
      }
      let productData = productDetails.allow_online_sale == 1 ? true : false;
      historyMessage.push(
        `Product Allow Online Sale Updated from ${productData} to ${allow_online_sale}\n`
      );
    }

    const allowSellOutOfStockData = allow_sell_out_of_stock == true ? 1 : 0;
    if (validator.isNotEmpty(allow_sell_out_of_stock) && allowSellOutOfStockData !== productDetails.allow_sell_out_of_stock) {
      let allowSellOutOfStock = data.allow_sell_out_of_stock == true ? 1 : 0;
      if (allowSellOutOfStock !== productDetails.allow_sell_out_of_stock) {
        updateProductObject.allow_sell_out_of_stock = allowSellOutOfStock;
      }
      let productData = productDetails.allow_sell_out_of_stock == 1 ? true : false;
      historyMessage.push(
        `Product Continue selling when out of stock Updated from ${productData} to ${data.allow_sell_out_of_stock}\n`
      );
    }

    const trackQuantityData = track_quantity == true ? 1 : 0;
    if (validator.isNotEmpty(track_quantity) && trackQuantityData !== productDetails.track_quantity) {
      let trackQuantity = track_quantity == true ? Product.ALLOW_TRACKING_QUANTITY : Product.DENY_TRACKING_QUANTITY;

      if (trackQuantity !== productDetails.track_quantity) {
        updateProductObject.track_quantity = trackQuantity;
      }
      let productData = productDetails.track_quantity == 1 ? true : false;
      historyMessage.push(
        `Product Track quantity Updated from ${productData} to ${track_quantity}\n`
      );
    }

    if (data.brand) {
      let createdBrandName = data.brand;

      let isBrandExist = await productBrand.findOne({
        where: { name: createdBrandName, company_id: companyId },
      });

      if (!isBrandExist) {
        let brandDetails = await productBrand.create({
          name: createdBrandName,
          status: Brand.STATUS_ACTIVE,
          company_id: companyId,
        });

        if (brandDetails) {
          updateProductObject.brand_id = brandDetails.id;
        }
      } else {
        updateProductObject.brand_id = isBrandExist.id;
      }
      historyMessage.push(`Product brand Updated from ${productDetails.brand_id} to ${brandDetails.name}\n`);
    }

    if (data.category) {
      const name = category.trim();

      // Validate duplicate product category name
      const categoryExist = await productCategory.findOne({
        where: { name },
      });
      if (!categoryExist) {
        const productCategoryData = {
          name: name,
          status: Category.STATUS_ACTIVE,
          company_id: companyId,
        };
        let categoryDetails = await productCategory.create(productCategoryData);
        if (categoryDetails) {
          updateProductObject.category_id = categoryDetails.id;
        }
      } else {
        updateProductObject.category_id = categoryExist.id;
      }
      historyMessage.push(`Product category Updated from ${productDetails.category_id} to ${categoryExist.name}\n`);
    }

    // Get tag Id
    let tagIds = [];
    if (data.tags) {
      JSON.parse(data.tags).forEach((item) => {
        tagIds.push(item.id);
      });
      await updateProductTag(id, tagIds, companyId);
    }

    await productModelService.update(updateProductObject, {
      where: { id: id, company_id: companyId },
    });

    const updateStoreProductData = {
      min_quantity: Number.Get(min_quantity),
      max_quantity: Number.Get(max_quantity),
    };

    //Update minMaxQty for storeproduct table
    await updateMinMaxQtyByProductId(id, companyId, updateStoreProductData);

    await reindex(id, companyId);

    // API response
    res.json(UPDATE_SUCCESS, { message: "Product Updated" });

    res.on("finish", async () => {
      if (historyMessage && historyMessage.length > 0) {
        let message = historyMessage.join();
        History.create(message, req, ObjectName.PRODUCT, id);
      } else {
        //create system log for product updation
        History.create(`Product Updated`, req, ObjectName.PRODUCT, id);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

const updateMinMaxQtyByProductId = async (productIds, companyId, data) => {
  let where = {};
  const updateStoreProductData = {};

  if (data.min_quantity) {
    updateStoreProductData.min_quantity = Number.Get(data.min_quantity);
  }

  if (data.max_quantity) {
    updateStoreProductData.max_quantity = Number.Get(data.max_quantity);
  }

  if (productIds && Array.isArray(productIds)) {
    where.product_id = {
      [Op.in]: productIds,
    };
  }

  if (productIds && !Array.isArray(productIds)) {
    where.product_id = productIds;
  }

  where.company_id = companyId;

  let updateData = await storeProduct.update(updateStoreProductData, {
    where: where,
  });
  return updateData;
};

const get = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user && req.user.company_id;
    // Validate product id
    if (!id) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    // Validate product is exist or not
    const productDetails = await product.findOne({
      where: { id, company_id: companyId },
      attributes: { exclude: ["deletedAt"] },
      include: [
        {
          required: false,
          model: productTag,
          as: "productTag",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt"],
          },
          include: [
            {
              required: false,
              model: Tag,
              as: "tag",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"],
              },
            },
          ],
        },
      ],
    });

    let productPriceData = await ProductPriceModel.findOne({
      where: { product_id: id, is_default: ProductPrice.IS_DEFAULT },
    }); // To get the product featured image from product index table.
    const productIndexDetails = await productIndex.findOne({
      where: { product_id: id },
    });
    console.debug("productIndexDetails--------------->>>", productIndexDetails)

    if (!productDetails) {
      return res.json(BAD_REQUEST, { message: "Product id is required" });
    }

    const productTagDetails = productDetails.productTag;

    let {
      image,
      createdAt,
      updatedAt,
      sell_out_of_stock,
      taxable,
      store_id,
      vendor_url,
      allow_transfer_out_of_stock,
      allow_online_sale,
      status,
      min_stock_days,
      max_stock_days,
    } = productDetails;
    productDetails.status =
      status == Product.STATUS_ACTIVE
        ? Product.STATUS_ACTIVE_TEXT
        : status === Product.STATUS_DRAFT
          ? Product.STATUS_DRAFT_TEXT
          : Product.STATUS_INACTIVE_TEXT;

    const data = { ...productDetails.get() };
    const tagDetails = [];

    // Defining Featured media url
    let featured_media_url;
    // Getting the product image from product index table
    featured_media_url = productIndexDetails && productIndexDetails?.featured_media_url;
    
    // formate object property
    // data.image = image ? getMediaUrl(id, image) : null;
    data.url = featured_media_url;
    data.vendor_url = vendor_url || '';
    data.allow_transfer_out_of_stock =
      allow_transfer_out_of_stock == Product.ALLOW_TRANSFER_PRODUCT_OUT_OF_STOCK ? true : false;
    data.allow_online_sale = allow_online_sale == Product.ALLOW_ONLINE_SALE ? true : false;
    data.createdAt = DateTime.defaultDateFormat(createdAt);
    data.updatedAt = DateTime.defaultDateFormat(updatedAt);
    data.brandName = productIndexDetails &&productIndexDetails.brand_name;
    data.categoryName =productIndexDetails && productIndexDetails.category_name;
    data.taxableLabel = taxable ? Product.PRODUCT_TAXABLE_YES : Product.PRODUCT_TAXABLE_NO;
    data.sellOutOfStockLabel =
      sell_out_of_stock === 1 ? Product.PRODUCT_SELL_OUT_OF_STOCK_ALLOW : Product.PRODUCT_SELL_OUT_OF_STOCK_DENY;
    data.profit_amount =productIndexDetails && productIndexDetails.profit_amount;
    data.profit_percentage = productIndexDetails &&productIndexDetails.profit_percentage;
    if (store_id && productDetails.store) {
      data.storeName = productDetails.store.name;
    }
    data.product_display_name = productIndexDetails &&productIndexDetails?.product_display_name;
    data.print_name = productIndexDetails &&productIndexDetails.print_name;
    data.sale_price = productIndexDetails &&productIndexDetails?.sale_price ? productIndexDetails?.sale_price : "";
    (data.mrp = productIndexDetails &&productIndexDetails?.mrp ? productIndexDetails?.mrp : ""),
      (data.discount_percentage = Number.GetFloat(productIndexDetails && productIndexDetails.discount_percentage));
    data.margin_percentage = Number.GetFloat(productIndexDetails && productIndexDetails.margin_percentage);
    data.reward = productIndexDetails && productIndexDetails?.reward ? productIndexDetails?.reward : "";
    data.shelf_life = productIndexDetails && productIndexDetails?.shelf_life;
    data.barcode = productPriceData && productPriceData.barcode ? productPriceData.barcode : "";
    data.notes = productIndexDetails && productIndexDetails?.notes ? productIndexDetails?.notes : "";
    data.rack_number = productIndexDetails && productIndexDetails?.rack_number ? productIndexDetails?.rack_number : "";

    // Format tag details
    productTagDetails.forEach((tagType) => {
      tagDetails.push({
        id: tagType.tag.id,
        name: tagType.tag.name,
        type: tagType.tag.type,
        status: tagType.tag.status,
      });
    });
    const storeProducts = await storeProduct.findAll({
      where: { product_id: id, company_id: companyId },
    });
    let selectedStoreId = [];
    storeProducts.forEach((store) => {
      selectedStoreId.push(store.store_id);
    });
    data.tag = [...tagDetails];
    data.selectedStoreId = [...selectedStoreId];
    // API response
    res.json({ productData: data, priceData: productPriceData && productPriceData });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};

const _delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company_id = Request.GetCompanyId(req);

    // Validate product id
    if (!id) {
      return res.json(BAD_REQUEST, { message: "Product id is required", });
    }

    // Validate product is exist or not
    const productDetails = await product.findOne({ where: { id } });
    if (!productDetails) {
      return res.json(BAD_REQUEST, { message: "Product not found" });
    }

    const productId = productDetails.id;

    const data = {
      product_id: null,
      status: "New",
    };
    // Reset Product id in vendor product table
    const vendorProducts = await vendorProduct.update(data, { where: { product_id: productId }, returning: true });
    const VendoProduct = vendorProducts ? vendorProducts[1] : "";

    if (!VendoProduct) {
      // Delete sync object
      await syncService.deleteSyncObject(
        VendoProduct.id,
        SYNC_OBJECT_NAME_VENDOR_PRODUCT,
        SYNC_NAME_EXPORT_TO_MASTER,
        company_id
      );
    }
    // Delete product in shopify
    if (productDetails.shopify_product_id && productDetails.store_id) {
      shopifyService.deleteProduct(productDetails.store_id, productDetails.shopify_product_id, () => { });
    }
    if (VendoProduct) {
      for (let i = 0; i < VendoProduct.length; i++) {
        await vendorProduct.destroy({ where: { id: VendoProduct[i].id } });
      }
    }

    // systemLog

    // Delete product
    await productDetails.destroy();

    await reindex(id, company_id);

    // API response
    res.json(DELETE_SUCCESS, { message: "Product Deleted", });

    res.on("finish", async () => {
      History.create("Product Deleted", req, ObjectName.PRODUCT, id);
    });
  } catch (err) {
    console.log(err);
  }
};

const clone = async (req, res, next) => {
  try {
    //get transfer order Id
    const id = req.params.id;
    //get company Id
    const company_id = Request.GetCompanyId(req);

    let data = req.params;
    //get transfer order details
    let productDetail = await productModelService.findOne({ where: { id: id, company_id: company_id } });

    //validate transfer order detail exist or not
    if (!productDetail) {
      return res.json(400, { message: "Transfer Not Found" });
    }

    //create transfer order data
    let createData = {
      slug: productDetail?.slug,
      sku: productDetail?.sku,
      vendor_url: productDetail?.vendor_url,
      name: productDetail?.name,
      description: productDetail?.description,
      size: productDetail?.size,
      unit: productDetail?.unit,
      max_quantity: productDetail?.max_quantity,
      min_quantity: productDetail?.min_quantity,
      taxable: productDetail?.taxable,
      notes: productDetail?.notes,
      shopify_product_id: productDetail?.shopify_product_id,
      brand_id: productDetail?.brand_id,
      category_id: productDetail?.category_id,
      tax_percentage: productDetail?.tax_percentage,
      cgst_percentage: productDetail?.cgst_percentage,
      sgst_percentage: productDetail?.sgst_percentage,
      igst_percentage: productDetail?.igst_percentage,
      status: Product.STATUS_DRAFT,
      shopify_quantity: productDetail?.shopify_quantity,
      company_id: productDetail?.company_id,
      shopify_out_of_stock: productDetail?.shopify_out_of_stock,
      shopify_price: productDetail?.shopify_price,
      seo_title: productDetail?.seo_title,
      seo_keyword: productDetail?.seo_keyword,
      seo_description: productDetail?.seo_description,
      tag_id: productDetail?.tag_id,
      allow_transfer_out_of_stock: productDetail?.allow_transfer_out_of_stock,
      allow_online_sale: productDetail?.allow_online_sale,
      allow_sell_out_of_stock: productDetail?.allow_sell_out_of_stock,
      hsn_code: productDetail?.hsn_code,
      pack_size: productDetail?.pack_size,
      track_quantity: productDetail?.track_quantity,
      print_name: productDetail?.print_name,
      date: DateTime.UTCtoLocalTime(new Date()),
      discount_percentage: Number.GetFloat(productDetail && productDetail?.discount_percentage),
      margin_percentage: Number.GetFloat(productDetail && productDetail?.margin_percentage),
    };

    let productData = await productModelService.create(createData);

    const locationList = await Location.findAll({
      where: { company_id: company_id },
    });
    let storeListData = locationList;

    //validate stock entry list exist or noit
    if (storeListData && storeListData.length > 0) {
      //loop the stock entry list
      for (let i = 0; i < storeListData.length; i++) {
        //destructure the stock entry list
        const { id } = storeListData[i];

        const productCreateData = {
          product_id: productData?.id,
          company_id: company_id,
          store_id: id,
          status: productData?.status,
        };
        await storeProduct.create(productCreateData);
      }
    }

    if (productData?.id) {
      //get product media list
      const productMediaList = await MediaModel.findAll({
        where: { object_id: id, object_name: ObjectName.PRODUCT, company_id: company_id },
      });

      if (productMediaList && productMediaList.length > 0) {
        //loop the product media
        for (let i = 0; i < productMediaList.length; i++) {
          //destrcture the media Id
          let media = productMediaList[i];
          const mediaUpload = {
            file_name: media.file_name,
            company_id: media.company_id,
            name: media.name,
            feature: media.feature,
            status: media.status,
            object_id: productData?.id,
            object_name: media.object_name,
            visibility: media.visibility,
          };
          let mediaData = await MediaModel.create(mediaUpload);

          let mediaImage = await mediaService.getMediaURL(media.id, company_id);

          const mediaId = mediaData.id;

          const imagePath = `${mediaId}-${media.file_name}`;

          await UploadFromUrlToS3(mediaImage, imagePath);
        }
      }
    }
    //send response
    res.json(Response.OK, { message: "Product Cloned" });

    res.on("finish", async () => {
      reindex(productData?.id, company_id);
      //create system log for Product updation
      History.create("Product Cloned", req, ObjectName.PRODUCT, id);
    });
  } catch (err) {
    console.log(err);
    return res.json(Response.BAD_REQUEST, { message: err.message });
  }
};

const updateStatus = async (id, data, companyId) => {
  try {
    let status;
    if (data.status == Product.STATUS_ACTIVE_TEXT) {
      status = Product.STATUS_ACTIVE;
    } else if (data.status == Product.STATUS_DRAFT_TEXT) {
      status = Product.STATUS_DRAFT;
    } else if (data.status == Product.STATUS_INACTIVE_TEXT) {
      status = Product.STATUS_INACTIVE;
    }

    await product.update({ status: status }, { where: { id } });
    const productIndexDetails = await productIndex.findOne({
      where: { product_id: id, company_id: companyId },
    });
    if (productIndexDetails) {
      await productIndexModel.update(
        { status: status },
        {
          where: { product_id: id, company_id: companyId },
        }
      );
    }
    if (productIndexDetails) {
      await storeProduct.update(
        { status: status },
        {
          where: { product_id: id, company_id: companyId },
        }
      );
    }

    let newStatus;
    if (status == Product.STATUS_ACTIVE) {
      newStatus = Product.STATUS_ACTIVE_TEXT;
    } else if (status == Product.STATUS_DRAFT) {
      newStatus = Product.STATUS_DRAFT_TEXT;
    } else if (status == Product.STATUS_INACTIVE) {
      newStatus = Product.STATUS_INACTIVE_TEXT;
    }

    return { newStatus: newStatus, status_id: status };
  } catch (err) {
    console.log(err);
  }
};

const merge = async (req, res) => {
  try {
    let data = req.params;
    const companyId = Request.GetCompanyId(req);

    if (data.id && data.selectedProductId) {
      const updateData = {
        product_id: data.selectedProductId,
      };
      await orderProduct.update(updateData, {
        where: { product_id: data.id, company_id: companyId },
      });
      await purchaseOrderProductModal.update(updateData, {
        where: { product_id: data.id, company_id: companyId },
      });

      await PurchaseProduct.update(updateData, {
        where: { product_id: data.id, company_id: companyId },
      });

      await StockEntryProduct.update(updateData, {
        where: { product_id: data.id, company_id: companyId },
      });

      await TransferProduct.update(updateData, {
        where: { product_id: data.id, company_id: companyId },
      });

      await ProductPriceModel.update(
        {
          product_id: data.selectedProductId,
          is_default: ProductPrice.IS_NOT_DEFAULT,
        },
        {
          where: { product_id: data.id, company_id: companyId },
        }
      );
      let selectedProduct = await storeProduct.findAll({
        where: { product_id: data.selectedProductId, company_id: companyId },
      });

      for (let index = 0; index < selectedProduct.length; index++) {
        let existProduct = await storeProduct.findAll({
          where: { product_id: data.id, store_id: selectedProduct[index].store_id, company_id: companyId },
        });

        if (existProduct && existProduct.length > 0) {
          for (let j = 0; j < existProduct.length; j++) {
            if (
              selectedProduct[index].quantity >= 0 ||
              (existProduct[j].quantity >= 0 && selectedProduct[index].store_id == existProduct[j].store_id)
            ) {
              let updateData = {
                quantity: selectedProduct[index].quantity + existProduct[j].quantity,
              };

              await storeProduct.update(updateData, {
                where: {
                  product_id: data.selectedProductId,
                  store_id: selectedProduct[index].store_id,
                  company_id: companyId,
                },
              });
            }
            let updateExistingData = {
              quantity: null,
            };

            if (selectedProduct[index].store_id == existProduct[j].store_id) {
              await storeProduct.update(updateExistingData, {
                where: { product_id: data.id, store_id: selectedProduct[index].store_id, company_id: companyId },
              });
            }
          }
        }
      }
      res.on('finish', async () => {
        await locationProductService.Reindex(companyId, data.selectedProductId);
        await StoreProductMinMaxQuantityUpdateService.update(companyId, data.selectedProductId);
        History.create("Product Merged", req, ObjectName.PRODUCT, data.id);
      });

      res.json(Response.OK, { message: "Product Merged" });
    }
  } catch (err) {
    console.log(err);
  }
};

const updateOrderQuantity = async (companyId, req) => {
  History.create('Product Index: Update Order Quantity Triggered', req);

  let productIndexDetail = await productIndex.findAll({
    where: {
      company_id: companyId,
    },
    attributes: ['product_id'],
  });

  let product_ids =
    productIndexDetail && productIndexDetail.length > 0 && productIndexDetail.map((data) => data?.product_id);
  let order_quantity;
  let productId;
  for (let i = 0; i < product_ids.length; i++) {
    productId = product_ids[i];
    order_quantity = await OrderProductService.getOrderProductQuantityByProductId(productId, companyId);

    await productIndex.update(
      { order_quantity: order_quantity },
      {
        where: {
          product_id: productId,
          company_id: companyId,
        },
      }
    );
  }
};

module.exports = {
  isExist,
  createProduct,
  updateProducts,
  getProductDetails,
  updateProductImageInShopify,
  exportProductImageInShopify,
  reindexAll,
  createProductFromUrl,
  updateMinMaxQtyByProductId,
  reindex,
  getDetail,
  create,
  update,
  get,
  _delete,
  clone,
  updatePrice,
  updateStatus,
  merge,
  updateOrderQuantity,
};
