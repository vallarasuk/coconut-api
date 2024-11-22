const { Op, QueryTypes, Sequelize } = require("sequelize");

// Utils
const DateTime = require("../lib/dateTime");

// Services
const shopifyService = require("./ShopifyService");


const Date = require("../lib/dateTime");

const Number = require("../lib/Number");
const ArrayList = require("../lib/ArrayList");

const {
  storeProduct,
  product,
  Location: locationModel,
  Media,
  productIndex,
  Tag: TagModel,
  productTag,
  orderProduct,
  StockEntryProduct,
  TransferProduct,
  LocationRack
} = require("../db").models;

const DataBaseService = require("../lib/dataBaseService");
const ObjectName = require("../helpers/ObjectName");
const { OK, BAD_REQUEST } = require("../helpers/Response");
const History = require("./HistoryService");
const { validationError } = require("../lib/validator");
const storeProductModel = new DataBaseService(storeProduct);
const db = require("../db");
const Location = require("../helpers/Location");
const validator = require("../lib/validator");
const Boolean = require("../lib/Boolean");
const StockType = require("../helpers/StockType");
const { getSettingValue } = require("./SettingService");
const StoreProductMinMaxQuantityUpdateService = require("./StoreProductMinMaxQuantityUpdateService");
const Request = require("../lib/request");
const fs = require("fs");
const Status = require("../helpers/Status");
const { getStockEntryById } = require("./StockEntryService");
const statusService = require("./StatusService");
const StockEntryProductService = require("./services/stockEntryProductService");
const StockEntryService = require("./StockEntryService")
const Setting = require("../helpers/Setting");
const Transfer = require("../helpers/Transfer");
const { getAllOrderProductByOrderId } = require("./OrderProductService");
const orderProductService = require("./OrderProductService");


/**
 * Check whether location product exist or not by name
 *
 * @param {*} store_id
 * @param {*} product_id
 * @returns {*} false if not exist else details
 */
const isExist = async (store_id, product_id, company_id) => {
  try {
    if (!store_id) {
      throw { message: "Location id is required" };
    }

    if (!product_id) {
      throw { message: "Product id is required" };
    }
    const storeProductDetails = await storeProduct.findOne({
      where: { store_id: store_id, product_id: product_id, company_id: company_id },
    });

    if (!storeProductDetails) {
      return false;
    }

    return storeProductDetails.get();
  } catch (err) {
    console.log(err);
  }
};

/**
 * Check whether location product exist or not by id
 *
 * @param {*} id
 * @returns {*} false if not exist else details
 */
const isExistById = async (id) => {
  try {
    if (!id) {
      throw { message: "Store product id is required" };
    }

    const storeProductDetails = await storeProduct.findOne({
      where: { id },
      include: [
        {
          required: true,
          model: product,
          as: "productDetail",
        },
        {
          required: true,
          model: productIndex,
          as: "productIndex",
        },
        {
          required: true,
          model: locationModel,
          as: "location",
          attributes: {
            exclude: ["shopify_password", "createdAt", "updatedAt", "deletedAt"],
          },
        },
      ],
    });

    if (!storeProductDetails) {
      return false;
    }

    return storeProductDetails.get();
  } catch (err) {
    console.log(err);
  }
};

/**
 *  Create location product
 *
 * @param {*} data
 */
const createStoreProduct = async (data) => {
  try {
    if (!data) {
      throw { message: "Store product details is required" };
    }
    const storeProducts = await isExist(data.storeId, data.productId, data.company_id);
    if (storeProducts) {
      throw { message: "Store product already exist" };
    }
    const createData = {
      product_id: data.productId,
      store_id: data.storeId,
      company_id: data.company_id,
      min_quantity: data.min_quantity ? data.min_quantity : null,
      max_quantity: data.max_quantity ? data.max_quantity : null,
    };

    const storeProductDetails = await storeProduct.create(createData);

    return storeProductDetails;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Update location product
 *
 * @param {*} store_id
 * @param {*} product_id
 * @param {*} data
 */
/**
 * Update location product
 *
 * @param {*} store_id
 * @param {*} product_id
 * @param {*} data
 */
const updateStoreProduct = async (store_id, product_id, data) => {
  try {
    const storeProductDetails = await isExist(store_id, product_id);

    if (!storeProductDetails) {
      throw { message: "Store product not found" };
    }

    // Update data
    const updateData = {
      product_id: data.productId,
      store_id: data.storeId,
    };

    const save = await storeProduct.update(updateData, {
      where: { store_id, product_id },
      returning: true,
      plain: true,
    });

    return save;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Update all the location product associated with product_id
 *
 * @param {*} product_id
 * @param {*} data
 */
const updateAllStoreProductByProductId = async (product_id, data) => {
  try {
    const storeProductDetails = await getStoreProductByProductId(product_id);

    if (!storeProductDetails.count) {
      return null;
    }

    storeProductDetails.rows.forEach(async (storeProduct) => {
      const updateData = {
        product_id: data.productId,
        store_id: data.storeId,
      };

      await storeProduct.update(updateData, {
        where: { id: storeProduct.id },
      });
    });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Update location product by id
 *
 * @param {*} id
 * @param {*} data
 */
const updateStoreProductById = async (id, data) => {
  try {
    let updateData = new Object();
    if (!id) {
      throw { message: "Store Product id is required" };
    }

    const storeProductDetails = await isExistById(id);

    if (!storeProductDetails) {
      throw { message: "Store product not found" };
    }

    if (validator.isNotEmpty(data.quantity) && storeProductDetails.quantity != data.quantity) {
      updateData.quantity = Number.Get(data.quantity);
    }

    if (validator.isNotEmpty(data.min_quantity) && storeProductDetails.min_quantity != data.min_quantity) {
      updateData.min_quantity = Number.Get(data.min_quantity);
    }

    if (validator.isNotEmpty(data.max_quantity) && storeProductDetails.max_quantity != data.max_quantity) {
      updateData.max_quantity = Number.Get(data.max_quantity);
    }


    if (validator.isNotEmpty(data.location_rack) && storeProductDetails.location_rack != data.location_rack) {
      updateData.location_rack = Number.Get(data.location_rack);
    }

    const save = await storeProduct.update(updateData, {
      where: { id },
      returning: true,
      plain: true,
    });

    return save;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Delete location product
 *
 * @param {*} store_id
 * @param {*} product_id
 */
const deleteStoreProduct = async (store_id, product_id) => {
  try {
    const storeProductDetails = await isExist(store_id, product_id);

    if (!storeProductDetails) {
      throw { message: "Store product not found" };
    }

    await storeProduct.destroy({
      where: { id: store_id, product_id },
    });

    storeProductDetails.product_id && shopifyService.deleteProduct(store_id, storeProductDetails.product_id, () => { });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Delete location product by id
 *
 * @param {*} id
 */
const deleteStoreProductById = async (id) => {
  try {
    const storeProductDetails = await isExistById(id);

    if (!storeProductDetails) {
      throw { message: "Store product not found" };
    }

    await storeProduct.destroy({
      where: { id },
    });

    storeProductDetails.product_id &&
      shopifyService.deleteProduct(storeProductDetails.store_id, storeProductDetails.product_id, () => { });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Get all location product details by product_id
 *
 * @params product_id
 */
const getStoreProductByProductId = async (product_id) => {
  try {
    if (!product_id) {
      throw { message: "Product id is required" };
    }

    const storeProducts = await storeProduct.findAndCountAll({
      where: { product_id },
    });

    return storeProducts;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Get location product details by store_id and product_id
 *
 * @params store_id
 * @params product_id
 */
const getStoreProductByStoreAndProductId = async (store_id, product_id) => {
  try {
    if (!store_id) {
      throw { message: "Location id is required" };
    }

    if (!product_id) {
      throw { message: "Product id is required" };
    }

    const storeProducts = await storeProduct.findOne({
      where: { store_id, product_id },
    });

    return storeProducts;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Get all location products by id
 *
 * @param ids - Array
 * @param options add more where condition option: {objectType}
 */
const getAllStoreProductById = async (ids, options) => {
  try {
    if (!ids) {
      throw { message: "Product id is required" };
    }

    const storeProducts = await storeProduct.findAndCountAll({
      where: { id: { $in: ids }, ...options },
    });

    return storeProducts;
  } catch (err) {
    console.log(err);
  }
};

const getRequiredQuantity = (quantity, minQuantity) => {
  if (validator.isEmpty(quantity)) {
    quantity = 0;
  }

  let requiredQuantity = minQuantity - quantity > 0 ? minQuantity - quantity : 0;

  return requiredQuantity;
};


const searchReplenishStoreProduct = async (productId, companyId, unselectedStores, sort, sortDir,search) => {
  try {
    if (!productId) {
      return res.json(400, { message: "Product Id Is Required" });
    }
    const sortParam = sort || "order_quantity";
    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    
    let where = new Object();
    let unSelectedStore;
    if (unselectedStores) {
      unSelectedStore = unselectedStores.split(",");
    }
    where.company_id = companyId;
    // Search by product id
    where.product_id = productId;
    let order=[]
    if(Number.isNotNull(sort) && sort =="store_id"){
      order.push([{ model: locationModel, as: 'location' }, 'name', sortDir])
    }
    if(Number.isNotNull(sort) && sort =="name"){
      order.push([{ model: locationModel, as: 'location' }, 'name', sortDir])
    }
    
    if(Number.isNotNull(sort) && sort !=="store_id" && sort !=="name" &&  sort !=="location_name"){
      const nullsPlacement = sortDirParam === "DESC" ? "NULLS LAST" : "NULLS FIRST";
      order.push([Sequelize.literal(`${sortParam} ${sortDirParam} ${nullsPlacement}`)]);


    }
    if(!Number.isNotNull(sort)){
      order.push([{ model: locationModel, as: 'location' }, 'sort_order', "ASC"])
    }
    

    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
     
        where[Op.or] = [
          {
            '$location.name$': {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
    }
    const query = {
      order: order,
      where,
      include: [
        {
          required: true,
          model: locationModel,
          as: "location",
          where: { status: "Active", allow_replenishment: Location.ALLOW_REPLENISHMENT_ENABLED },
        },
        {
          required: true,
          duplicating: false,
          model: productIndex,
          as: "productIndex",
        },
      ],
    };

    let transferData = await TransferProduct.findAll({
      attributes: ["product_id", "to_store_id", [Sequelize.fn("SUM", Sequelize.col("quantity")), "quantity"], [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastTransferredDate'],],
      group: ["product_id", "to_store_id"],
      where:{product_id:productId}
    });

    let returnTransferData = await TransferProduct.findAll({
      attributes: ["product_id", "from_store_id", [Sequelize.fn("SUM", Sequelize.col("quantity")), "quantity"], [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastReturnedDate'],],
      group: ["product_id", "from_store_id"],
      where:{product_id:productId}

    });
    // Get location list and count
    let storeProducts = await storeProduct.findAndCountAll(query);
    storeProducts = storeProducts && storeProducts.rows;
    // Return location is null
    if (storeProducts.count === 0) {
      return { data: [] };
    }
    let distributionCenterQuantity = 0;
    let maxQuantity = 0;
    let tempRequiredQuantity = 0;
    let updatedQuantity = 0;
    let totalRequiredQuantity = 0;
    let totalReplenishQuantity = 0;
    let tempQuantity = 0;
    let tempReplenishQuantity = 0;
    let allocatedQuntity = 0;
    let tempDistributionQuantity = 0;
    let totalReplenishedQuantity = 0;
    let totalAllocatedQuantityToReplenish = 0;
    let distributionCenterStoreQuantity = 0;
    let tempUnselectedStore;
    let lastTransferredData;
    let lastReturnedData;

    
    const data = [];
    let distributionCenterStoreId = await getSettingValue(Location.DISTRIBUTION_CENTER, companyId);
    let distributionStoreProduct = storeProducts.find((data) => data.store_id == distributionCenterStoreId);
    let replenishBy = await getSettingValue(Setting.REPLENISHMENT_BY, companyId);
    if (distributionStoreProduct) {
      distributionCenterQuantity = Number.GetPositiveOnly(distributionStoreProduct.quantity);
      distributionCenterStoreQuantity = Number.GetPositiveOnly(distributionStoreProduct.quantity, 0);
      distributionStoreProduct.quantity = Number.Get(distributionStoreProduct.quantity, 0);
    }
    
    for (let i = 0; i < storeProducts.length; i++) {
      const {
        id,
        store_id,
        product_id,
        quantity,
        min_quantity,
        max_quantity,
        order_quantity,
        replenish_quantity,
        last_order_date,
        last_stock_entry_date,
        location,
        productIndex,
        min_order_quantity,
        max_order_quantity,
        transferred_quantity,
        transfer_quantity,
        return_quantity,
        system_quantity
      } = storeProducts[i];
      if (unSelectedStore && unSelectedStore.length > 0) {
        tempUnselectedStore = unSelectedStore.find((storeId) => storeId == store_id);
      }
      allocatedQuntity = Number.GetPositiveOnly(min_quantity);
      if (replenishBy == Transfer.REPLENISHMENT_BY_ORDER) {
        if (min_order_quantity > allocatedQuntity) {
          allocatedQuntity = min_order_quantity
        }
        if (allocatedQuntity > max_quantity) {
          allocatedQuntity = max_quantity
        }
      }
      tempQuantity = Number.GetPositiveOnly(quantity, 0);
      tempReplenishQuantity = Number.GetPositiveOnly(replenish_quantity, 0);
      tempDistributionQuantity = Number.GetPositiveOnly(transferred_quantity, 0);
      updatedQuantity = tempQuantity + tempReplenishQuantity + tempDistributionQuantity;
      tempRequiredQuantity = allocatedQuntity - updatedQuantity > 0 ? allocatedQuntity - updatedQuantity : 0;
      if (store_id != distributionCenterStoreId && tempReplenishQuantity <= 0 && tempDistributionQuantity <= 0 && !tempUnselectedStore) {
        totalRequiredQuantity += tempRequiredQuantity;
      }
      totalReplenishedQuantity += tempReplenishQuantity + tempDistributionQuantity;
      if (store_id != distributionCenterStoreId && tempQuantity > maxQuantity && !tempUnselectedStore) {
        maxQuantity = tempQuantity;
      }

       lastTransferredData = transferData.find(value => value.to_store_id === store_id && value.product_id === product_id);
       
       lastReturnedData= returnTransferData.find(value => value.from_store_id === store_id && value.product_id === product_id);

      const values = {
        productName: productIndex.product_name,
        image: productIndex.featured_media_url || null,
        sale_price: productIndex.sale_price,
        unit: productIndex.unit,
        size: productIndex.size,
        product_display_name: productIndex.product_display_name,
        productId: product_id,
        id: productId ? store_id : product_id,
        store_product_id: id,
        quantity: quantity,
        requiredQuantity: tempRequiredQuantity,
        productIndex: productIndex,
        last_order_date: last_order_date ? Date.Format(last_order_date) : "",
        last_stock_entry_date: Date.Format(last_stock_entry_date),
        locationName: location.name,
        brand_name: productIndex.brand_name,
        store_id: store_id,
        min_quantity: min_quantity,
        max_quantity: max_quantity,
        brand_id: productIndex.brand_id,
        order_quantity: order_quantity,
        replenishedQuantity: replenish_quantity,
        updatedQuantity: updatedQuantity,
        replenishQuantity: 0,
        tempQuantity: tempQuantity,
        allocatedQuntity: allocatedQuntity,
        tempReplenishedQuantity: tempReplenishQuantity,
        storeColorCode: location.color,
        printName: location.print_name,
        minOrderQuantity: min_order_quantity,
        maxOrderQuantity: max_order_quantity,
        allowReplenishment: location.allow_replenishment,
        distributionQuantity: transferred_quantity,
        transfer_quantity: transfer_quantity,
        return_quantity: return_quantity,
        system_quantity: system_quantity,
        lastTransferDate:Date.Format(lastTransferredData && lastTransferredData.dataValues && lastTransferredData.dataValues.lastTransferredDate),
        lastReturnedDate:Date.Format(lastReturnedData && lastReturnedData.dataValues && lastReturnedData.dataValues.lastReturnedDate)

      };
      data.push(values);
    }
    let quantityCounter = 0;
    let isCompleted = false;
    let isUnselectedStore;
    distributionCenterQuantity = distributionCenterQuantity - totalReplenishedQuantity;
    do {
      if (distributionCenterQuantity <= 0 || totalRequiredQuantity <= totalReplenishQuantity) {
        isCompleted = true;
        break;
      }
      if (isCompleted == false) {
        // Repliesh with 1 quantity
        for (let i = 0; i < data.length; i++) {
          if (unSelectedStore && unSelectedStore.length > 0) {
            isUnselectedStore = unSelectedStore.find((storeId) => storeId == data[i].store_id);
          }
          if (
            data[i].store_id != distributionCenterStoreId &&
            data[i].tempReplenishedQuantity <= 0 &&
            !isUnselectedStore
          ) {
            updatedQuantity = data[i].tempQuantity + data[i].replenishQuantity + data[i].distributionQuantity;
            if (updatedQuantity < data[i].allocatedQuntity && data[i].tempQuantity == quantityCounter) {
              data[i].replenishQuantity += 1;
              totalReplenishQuantity += 1;
              distributionCenterQuantity -= 1;
              if (distributionCenterQuantity <= 0 || totalRequiredQuantity <= totalReplenishQuantity) {
                isCompleted = true;
                break;
              }
            }
          }
        }
        quantityCounter += 1;
        if (quantityCounter > maxQuantity) {
          quantityCounter = 0;
        }
      }
    } while (isCompleted == false);
    totalAllocatedQuantityToReplenish = Number.Get(totalReplenishedQuantity, 0) + Number.Get(totalReplenishQuantity);

    let replenishStoreList = data.filter((data) => data.replenishQuantity > 0);
    let replenishedStoreList = data.filter((data) => data.replenishedQuantity > 0);
    let noReplenishStoreList = data.filter(
      (data) => data.replenishQuantity <= 0 && data.replenishedQuantity <= 0
    );

    return {
      data,
      allStoreList: data,
      replenishStoreList: replenishStoreList,
      replenishedStoreList: replenishedStoreList,
      noReplenishStoreList: noReplenishStoreList,
      totalReplenishQuantity: totalAllocatedQuantityToReplenish,
      totalBalanceQuantity: Number.Get(distributionCenterStoreQuantity) - Number.Get(totalAllocatedQuantityToReplenish),
      distributionCenterStoreProducDetail: distributionStoreProduct,
      distributionCenterQuantity: distributionCenterStoreQuantity,
      replenishBy: replenishBy
    };
  } catch (err) {
    console.log(err);
  }
};
/**
 * Search location product
 *
 * @param {*} params
 */
const searchStoreProduct = async (params, companyId) => {
  try {
    let { page, pageSize, search, sort, sortDir, pagination, productId, code, status, stockType, store_id } = params;
    let storeProductIds = [];

    // Validate if page is not a
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: "Invalid page" };
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: "Invalid page size" };
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      product_id: "product_id",
      store_id: "store_id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      status: "status",
      quantity: "quantity",
      min_quantity: "min_quantity",
      max_quantity: "max_quantity",
      product_name: "product_name",
      last_order_date: "last_order_date",
      last_stock_entry_date: "last_stock_entry_date",
      order_quantity: "order_quantity",
      location_name: "location_name",
      min_order_quantity: "min_order_quantity",
      max_order_quantity: "max_order_quantity",
      last_transfer_date: "last_transfer_date",
      discrepancy_quantity:"discrepancy_quantity",
      order_quantity:"order_quantity",
      transfer_quantity:"transfer_quantity",
      return_quantity:"return_quantity",
      replenish_quantity:"replenish_quantity",
      average_order_quantity:"average_order_quantity",
      sort_order: "sort_order",
      location_rack_name: "location_rack_name"

    };

    const sortParam = sort ? sort : "location_name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort location by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";

    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }

    let where = new Object();

    let whereStore = new Object();

    if (status) {
      whereStore.status = status;
    }
    let whereProductIndex = new Object();

    where.company_id = companyId;
    // Search term
    const searchTerm = search ? search.trim() : null;

    if (searchTerm) {
      where[Op.or] = [
        {
          "$productIndex.product_name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$location.name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          "$productIndex.brand_name$": {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    if (params.tag) {
      const productIds = [];
      let tagData = await productTag.findAll({ where: { tag_id: params.tag, company_id: companyId } });
      for (let i = 0; i < tagData.length; i++) {
        productIds.push(tagData[i].product_id);
      }

      whereProductIndex.product_id = { [Op.in]: productIds };
    }

    if (params.brand) {
      whereProductIndex.brand_id = params.brand.split(",");
    }
    if (params.category) {
      whereProductIndex.category_id = params.category.split(",");
    }

    //whereProductIndex.status = Product.STATUS_ACTIVE;

    // Search by product id
    if (productId || params.product) {
      where.product_id = productId ? productId : params.product;
    }

    // Search by location id
    if (params.store_id || params.store || params.location) {
      where.store_id = params.store_id ? params.store_id : params.store || params.location;
    }
    let timeZone = params.timeZone;

    let stockEntryStartDate = DateTime.toGetISOStringWithDayStartTime(params?.stockEntryStartDate)
    let stockEntryEndDate = DateTime.toGetISOStringWithDayEndTime(params?.stockEntryEndDate)

    let orderStartDate = DateTime.toGetISOStringWithDayStartTime(params?.orderStartDate)
    let orderEndDate = DateTime.toGetISOStringWithDayEndTime(params?.orderEndDate)

    let transferStartDate = DateTime.toGetISOStringWithDayStartTime(params?.transferStartDate)
    let transferEndDate = DateTime.toGetISOStringWithDayEndTime(params?.transferEndDate)
    //StockEntry Date Filter
    if (params?.stockEntryStartDate && !params?.stockEntryEndDate) {
      where.last_stock_entry_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(stockEntryStartDate,timeZone),
        },
      };
    }
    if (params?.stockEntryEndDate && !params?.stockEntryStartDate) {
      where.last_stock_entry_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(stockEntryEndDate,timeZone),
        },
      };
    }
  
    if (params?.stockEntryStartDate && !params?.stockEntryEndDate) {
      where.last_stock_entry_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(stockEntryStartDate,timeZone),
          [Op.lte]: DateTime.toGMT(stockEntryEndDate,timeZone),
        },
      };
    }

    //order Date Filter
    if (params?.orderStartDate && !params?.orderEndDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(orderStartDate,timeZone),
        },
      };
    }
    if (params?.orderEndDate && !params?.orderStartDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(orderEndDate,timeZone),
        },
      };
    }
  
    if (params?.orderStartDate && !params?.orderEndDate) {
      where.last_order_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(orderStartDate,timeZone),
          [Op.lte]: DateTime.toGMT(orderEndDate,timeZone),
        },
      };
    }


    //transfer date filter
    if (params?.transferStartDate && !params?.transferEndDate) {
      where.last_transfer_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(transferStartDate,timeZone),
        },
      };
    }
    if (params?.transferEndDate && !params?.transferStartDate) {
      where.last_transfer_date = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(transferEndDate,timeZone),
        },
      };
    }
  
    if (params?.transferStartDate && !params?.transferEndDate) {
      where.last_transfer_date = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(transferStartDate,timeZone),
          [Op.lte]: DateTime.toGMT(transferEndDate,timeZone),
        },
      };
    }

    const order = [];

    if (sortParam === "location_name") {
      order.push([{ model: locationModel, as: "location" }, "name", sortDirParam]);
    }

    if (sortParam === "sort_order") {
      order.push([{ model: locationModel, as: "location" }, "sort_order", sortDirParam]);
    }

    if (sortParam === "product_name") {
      order.push(
        [{ model: productIndex, as: "productIndex" }, "brand_name", sortDirParam],
        [{ model: productIndex, as: "productIndex" }, "product_name", sortDirParam],
        [{ model: productIndex, as: "productIndex" }, "sale_price", sortDirParam]
      );
    }

    const nullsPlacement = "NULLS LAST";

    if(sortParam !== "location_name" && sortParam !=="location_rack_name"){
    order.push([
      Sequelize.literal(`${sortParam} ${sortDirParam} ${nullsPlacement}`),
    ]);
  }

    if (sortParam !== "sort_order" && sortParam !== "location_name" && sortParam !== "product_name" && sortParam !== "product_id" && sortParam !=="location_rack_name" && sort) {
      order.push([sortableFields[sortParam], sortDirParam]);
    }

    if (sortableFields[sortParam] == "product_id") {
      order.push([{ model: productIndex, as: "productIndex" }, "product_name", sortDirParam]);
    }

    if (sortableFields[sortParam] == "location_rack_name") {
      order.push(["locationRackDetail", "name", sortDirParam]);
    }

    if (stockType == StockType.SHORTAGE_QUANTITY) {
      let whereString;

      if (store_id || params.location) {
        whereString = `where store_id=${store_id ? store_id : params.location} and company_id=${companyId}`;
      }

      if (productId) {
        whereString = `where product_id=${productId} and company_id=${companyId}`;
      }

      let storeProduct = await db.connection.query(`with storeProduct as (
        SELECT  id,min_quantity,quantity, SUM(min_quantity - quantity) as required_quantity FROM store_product ${whereString} GROUP BY ID),
        cte2 AS (select  * from storeProduct where required_quantity > 0)                  
        SELECT * FROM cte2`);

      if (storeProduct && storeProduct.length > 0) {
        storeProductIds = storeProduct[0].map((data) => {
          return data.id;
        });
      }

      if (storeProductIds && storeProductIds.length > 0) {
        where.id = { [Op.in]: storeProductIds };
      } else {
        return {
          totalCount: 0,
          currentPage: page,
          pageSize,
          data: [],
          sort,
          sortDir,
          search,
          store_id: params.store_id ? params.store_id : params.location,
        };
      }
    }

    if (stockType == StockType.EXCESS_QUANTITY) {
      let whereString;

      if (store_id || params.location) {
        whereString = `where store_id=${store_id ? store_id : params.location
          } and company_id=${companyId} and max_quantity < quantity`;
      }

      if (productId) {
        whereString = `where product_id=${productId} and company_id=${companyId} and max_quantity < quantity`;
      }

      let storeProduct = await db.connection.query(`SELECT id,min_quantity,quantity FROM store_product ${whereString}`);

      if (storeProduct && storeProduct.length > 0) {
        storeProductIds = storeProduct[0].map((data) => {
          return data.id;
        });
      }

      if (storeProductIds && storeProductIds.length > 0) {
        where.id = { [Op.in]: storeProductIds };
      } else {
        return {
          totalCount: 0,
          currentPage: page,
          pageSize,
          data: [],
          sort,
          sortDir,
          search,
          store_id: params.store_id ? params.store_id : params.location,
        };
      }
    }

    if (stockType == StockType.NO_STOCK_QUANTITY) {
      let whereString;

      if (store_id || params.location) {
        whereString = `where store_id=${store_id ? store_id : params.location
          } and company_id=${companyId} and quantity = 0 or quantity=null `;
      }

      if (productId) {
        whereString = `where product_id=${productId} and company_id=${companyId} and quantity = 0 or quantity=null`;
      }

      let storeProduct = await db.connection.query(`SELECT id,min_quantity,quantity FROM store_product ${whereString}`);

      if (storeProduct && storeProduct.length > 0) {
        storeProductIds = storeProduct[0].map((data) => {
          return data.id;
        });
      }

      if (storeProductIds && storeProductIds.length > 0) {
        where.id = { [Op.in]: storeProductIds };
      } else {
        return {
          totalCount: 0,
          currentPage: page,
          pageSize,
          data: [],
          sort,
          sortDir,
          search,
          store_id: params.store_id ? params.store_id : params.location,
        };
      }
    }
    const query = {
      distinct: true,
      attributes: { exclude: ["deletedAt"] },
      where,
      order,
      where,
      include: [
        {
          required: true,
          model: locationModel,
          as: "location",
          where: whereStore,
        },
        {
          required: true,
          duplicating: false,
          model: productIndex,
          as: "productIndex",
          where: whereProductIndex,
        },
        {
          required: true,
          model: product,
          as: "productDetail",
        },
        {
          required: false,
          model: LocationRack,
          as: "locationRackDetail",
        },
      ],
    };

    if (validator.isEmpty(pagination)) {
      pagination = true;
    }
    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    // Get location list and count
    const storeProducts = await storeProduct.findAndCountAll(query);
    // Return location is null
    if (storeProducts.count === 0) {
      return { data: [] };
    }

    const data = [];
    const storeProductDetail = storeProducts && storeProducts.rows;
    for (let i = 0; i < storeProductDetail.length; i++) {

      const {
        id,
        product_id,
        store_id,
        location,
        createdAt,
        updatedAt,
        status,
        productDetail,
        productIndex,
        quantity,
        min_quantity,
        max_quantity,
        order_quantity,
        last_order_date,
        last_stock_entry_date,
        replenish_quantity,
        min_order_quantity,
        max_order_quantity,
        discrepancy_quantity,
        return_quantity,
        transfer_quantity,
        system_quantity,
        transferred_quantity,
        average_order_quantity,
        locationRackDetail,
        last_transfer_date,
        last_return_date
      } = storeProductDetail[i];
      updatedQuantity = quantity >= 0 && replenish_quantity >= 0 ? quantity + replenish_quantity : quantity;

      const values = {
        productName: productIndex.product_name,
        image: productIndex.featured_media_url || null,
        sale_price: productIndex.sale_price,
        unit: productIndex.unit,
        category_name: productIndex.category_name,
        size: productIndex.size,
        product_display_name: productIndex.product_display_name,
        productId: product_id,
        id: productId ? store_id : product_id,
        store_product_id: id,
        createdAt: DateTime.shortDateAndTime(createdAt),
        updatedAt: DateTime.shortDateAndTime(updatedAt),
        updatedAt: DateTime.shortDateAndTime(updatedAt),
        status:
        productIndex?.status == Location.ACTIVE
            ? Location.STATUS_ACTIVE
            :  productIndex?.status == Location.DRAFT
              ? Location.STATUS_DRAFT
              : Location.STATUS_INACTIVE,
        quantity: quantity,
        requiredQuantity: getRequiredQuantity(quantity, min_quantity),
        productIndex: productIndex,
        last_order_date: last_order_date ? Date.Format(last_order_date) : "",
        last_stock_entry_date: Date.Format(last_stock_entry_date),
        location: location.name,
        brand_name: productIndex.brand_name,
        store_id: store_id,
        min_quantity: min_quantity,
        max_quantity: max_quantity,
        brand_id: productIndex.brand_id,
        order_quantity: order_quantity,
        cgst_percentage: productIndex.cgst_percentage,
        sgst_percentage: productIndex.sgst_percentage,
        tax_percentage: productIndex.tax_percentage,
        replenishedQuantity: replenish_quantity,
        updatedQuantity: updatedQuantity,
        replenishQuantity: 0,
        max_order_quantity: max_order_quantity,
        min_order_quantity: min_order_quantity,
        discrepancy_quantity:discrepancy_quantity,
        return_quantity:return_quantity,
        transfer_quantity:transfer_quantity,
        system_quantity:system_quantity,
        transferred_quantity:transferred_quantity,
        average_order_quantity:average_order_quantity,
        location_rack: locationRackDetail?.id,
        location_rack_name: locationRackDetail?.name,
        lastTransferDate: Date.Format(last_transfer_date),
        lastReturnedDate: Date.Format(last_return_date),
      };
      data.push(values);
    }

    return {
      totalCount: storeProducts.count,
      currentPage: page,
      pageSize,
      data,
      sort,
      sortDir,
      search,
      store_id: params.store_id ? params.store_id : params.location,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
};

/**
 * Get location product details by id
 *
 * @param {*} storeProductId
 */
const getStoreProductDetails = async (storeProductId) => {
  try {
    const storeProductDetails = await isExistById(storeProductId);
    if (!storeProductDetails) {
      throw { message: "Store product not found" };
    }

    const {
      id,
      product_id,
      store_id,
      productDetail,
      location,
      productIndex,
      quantity,
      min_quantity,
      max_quantity,
      createdAt,
      updatedAt,
    } = storeProductDetails;
    const data = {
      id,
      product_id,
      store_id,
    };

    if (product_id && productDetail) {
      data.productName = productDetail.name;
    }
    if (store_id && location) {
      data.locationName = location.name;
    }
    // formate object property
    data.image = productIndex[0].featured_media_url;
    data.product_display_name = productIndex[0].product_display_name;
    data.createdAt = DateTime.shortDateAndTime(createdAt);
    data.updatedAt = DateTime.shortDateAndTime(updatedAt);
    data.slug = productDetail.slug;
    data.productDetail = productDetail;
    data.quantity = quantity;
    data.min_quantity = min_quantity;
    data.max_quantity = max_quantity;
    data.tax_percentage = productDetail.tax;
    return data;
  } catch (err) {
    console.log(err);
  }
};

const search = async (companyId, store_id) => {
  try {
    const storeProductList = await storeProductModel.find({
      where: {
        company_id: companyId,
        store_id: store_id,
      },
    });
    return storeProductList;
  } catch (err) {
    console.log(err);
  }
};

const bulkUpdate = async (req, res) => {
  const data = req.body;

  const selectedIds = data?.ids?.selectedIds;

  if(!data?.storeProductIds){
    if (!selectedIds || !selectedIds.length) {
      return next(validationError("Selected location IDs are required"));
    }
  }
  
  let companyId = Request.GetCompanyId(req)

  const productId = data?.productId ? parseInt(data?.productId): null;
  const updateData = {};

  if (data.min_quantity) {
    updateData.min_quantity = data.min_quantity.value;
  }
  if (data.max_quantity) {
    updateData.max_quantity = data.max_quantity.value;
  }
  if (data.quantity) {
    updateData.quantity = data.quantity.value;
  }

  if (data.location_rack) {
    updateData.location_rack = data.location_rack.value;
  }

  let where ={}
  if(data?.ids?.selectedIds && selectedIds.length > 0){
    where.store_id={
      [Op.in]: selectedIds
    }
  }
  if(productId){
    where.product_id = productId
  }

  if(data?.storeProductIds){
    where.id ={ [Op.in]: data?.storeProductIds 
    }
  }
  where.company_id = companyId
     await  storeProduct.update(updateData, {
      where: where,
    });

  try {
    if(productId){
      await StoreProductMinMaxQuantityUpdateService.update(companyId, productId);
    }

    //create system log for bulk updation
    History.create("Products bulk updated", req, ObjectName.LOCATION);
    // API response
    return res.json(OK, { message: "Products updated" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

const creatStoreProductByStoreId = async (storeId, companyId) => {
  try {
    if (storeId && companyId) {
      let list = await db.connection.query(
        `select product_id, min_quantity, max_quantity from product_index where product_id not in (select product_id from store_product where store_id = ${storeId} and company_id=${companyId})`
      );

      if (list && Array.isArray(list) && list.length > 0) {
        let productList = list[0];

        if (productList && ArrayList.isNotEmpty(productList) && productList.length > 0) {
          for (let i = 0; i < productList.length; i++) {
            const { product_id, min_quantity, max_quantity } = productList[i];

            await storeProductModel.create({
              company_id: companyId,
              product_id: product_id,
              store_id: storeId,
              min_quantity: min_quantity,
              max_quantity: max_quantity,
            });
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateByProductId = async (storeId, productId, companyId, updateData) => {
  try {
    if (storeId && productId && companyId) {
      await storeProductModel.update(updateData, {
        where: { store_id: storeId, product_id: productId, company_id: companyId },
      });
    }
  } catch (err) {
    console.log(err);
  }
};

const Reindex = async (companyId, productId) => {
  try {
    let where = { company_id: companyId };
    if (productId) {
      where.product_id = productId;
    }
    const locationIds = await locationModel.findAll({ where: { status: Status.ACTIVE_TEXT, company_id: companyId },
    attributes: ['id'],
      raw: true
    }).then(data => data.map(loc => loc.id));

    if (locationIds.length > 0) {
      where.store_id = { [Op.in]: locationIds };
    }

    const batchSize = 1000;
    let offset = 0;
    let locationProductData = [];

    do {
      const batchData = await storeProduct.findAll({
        where: where,
        attributes: ["store_id", "product_id","quantity"],
        order: [["product_id", "ASC"]],
        offset: offset,
        limit: batchSize,
        raw: true
      });

      locationProductData = batchData;

      if (locationProductData.length === 0) break;


      const transferQuantityData = await TransferProduct.findAll({
        attributes: ["product_id", "to_store_id", [Sequelize.fn("SUM", Sequelize.col("quantity")), "quantity"],[Sequelize.fn("MAX", Sequelize.col("createdAt")), "createdAt"]],
        group: ["product_id", "to_store_id"],
        where: { company_id: companyId },
        raw: true
      });

      const returnQuantityData = await TransferProduct.findAll({
        attributes: ["product_id", "from_store_id", [Sequelize.fn("SUM", Sequelize.col("quantity")), "quantity"],[Sequelize.fn("MAX", Sequelize.col("createdAt")), "createdAt"]],
        group: ["product_id", "from_store_id"],
        where: { company_id: companyId },
        raw: true
      });

      const orderQuantityData = await orderProduct.findAll({
        attributes: ["product_id", "store_id", [Sequelize.fn("SUM", Sequelize.col("quantity")), "quantity"]],
        group: ["product_id", "store_id"],
        where: { company_id: companyId, cancelled_at: { [Op.eq]: null } },
        raw: true
      });

      const orderProductData = await orderProduct.findAll({
        attributes: ["product_id", "store_id", [Sequelize.fn("MAX", Sequelize.col("order_date")), "order_date"]],
        where: { company_id: companyId, cancelled_at: { [Op.eq]: null } },
        group: ["product_id", "store_id"],
        order: [["order_date", "DESC"]],
        raw: true
      });

      const stockEntryData = await StockEntryProduct.findAll({
        attributes: ["product_id", "store_id", [Sequelize.fn("MAX", Sequelize.col("createdAt")), "createdAt"]],
        where: { company_id: companyId },
        group: ["product_id", "store_id"],
        order: [["createdAt", "DESC"]],
        raw: true
      });


      const transferQuantityMap = Object.fromEntries(
        transferQuantityData.map(item => [`${item.product_id}-${item.to_store_id}`, item])
      );

      const returnQuantityMap = Object.fromEntries(
        returnQuantityData.map(item => [`${item.product_id}-${item.from_store_id}`, item])
      );

      const orderQuantityMap = Object.fromEntries(
        orderQuantityData.map(item => [`${item.product_id}-${item.store_id}`, item])
      );

      const lastOrderMap = Object.fromEntries(
        orderProductData.map(item => [`${item.product_id}-${item.store_id}`, item])
      );

      const lastStockEntryMap = Object.fromEntries(
        stockEntryData.map(item => [`${item.product_id}-${item.store_id}`, item])
      );

      for (const value of locationProductData) {
        const transferQty = transferQuantityMap[`${value.product_id}-${value.store_id}`];
        const returnQty = returnQuantityMap[`${value.product_id}-${value.store_id}`];
        const orderQty = orderQuantityMap[`${value.product_id}-${value.store_id}`];
        const lastOrder = lastOrderMap[`${value.product_id}-${value.store_id}`];
        const lastStockEntry = lastStockEntryMap[`${value.product_id}-${value.store_id}`];

        const data = {
          order_quantity: orderQty && Number.Get(orderQty.quantity),
          last_order_date: lastOrder && lastOrder.order_date,
          last_stock_entry_date: lastStockEntry && lastStockEntry.createdAt,
          last_transfer_date: transferQty && transferQty?.createdAt,
          last_return_date: returnQty && returnQty?.createdAt,
          transfer_quantity: transferQty && Number.Get(transferQty.quantity),
          return_quantity: returnQty && Number.Get(returnQty.quantity),
          system_quantity: (transferQty ? Number.Get(transferQty.quantity) : 0) -
            (returnQty ? Number.Get(returnQty.quantity) : 0) -
            (orderQty ? Number.Get(orderQty.quantity) : 0),
        };

        const discrepancyQty = (Number.Get(data.transfer_quantity || 0) -
          (Number.Get(data.return_quantity || 0) + Number.Get(data.order_quantity || 0))) -
          Number.Get(value.quantity);

        data.discrepancy_quantity = discrepancyQty

        const shouldUpdate = (data.order_quantity !== value.order_quantity) ||
          (data.transfer_quantity !== value.transfer_quantity) ||
          (data.return_quantity !== value.return_quantity) ||
          (data.last_order_date && lastOrder && data.last_order_date !== lastOrder.order_date) ||
          (data.last_stock_entry_date && lastStockEntry && data.last_stock_entry_date !== lastStockEntry.createdAt);

        if (shouldUpdate) {
          await storeProduct.update(data, {
            where: { product_id: value.product_id, store_id: value.store_id }
          });
        }
      }
      offset += batchSize;
    } while (locationProductData.length > 0);
  } catch (err) {
    console.log(err);
  }
};

const updateDistributionQuantityFromReplenish = async (transferId, companyId, req) => {
  try {
    if (transferId && companyId) {

      let transferProductList = await TransferProduct.findAll({
        where: { transfer_id: transferId, company_id: companyId },
        include: [{
          required: false,
          model: locationModel,
          as: "from_location",

        },
        {
          required: false,
          model: locationModel,
          as: "to_location",
        }]
      })

      if (transferProductList && transferProductList.length > 0) {

        for (let i = 0; i < transferProductList.length; i++) {

          const { from_location, to_location, product_id, quantity } = transferProductList[i];

          if (from_location && to_location && quantity) {

            let isToStoreProductExist = await storeProduct.findOne({ where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })

            if (isToStoreProductExist) {

              let updatedDistributionQuantity = Number.Get(isToStoreProductExist.transferred_quantity) + Number.Get(quantity);

              let updatedReplenishQuantity = Number.Get(isToStoreProductExist.replenish_quantity) - Number.Get(quantity);

              if (updatedDistributionQuantity < 0) {

                History.create(
                  `TRANSFERRED QTY NEGATIVE VALUE UPDATE(Draft - Ready For Distribution):
                productId: ${product_id}
                transferProductQuantity: ${quantity}

                BEFORE UPDATE IN (${to_location.name}(store)): 
                Distribution Quantity: ${isToStoreProductExist.transferred_quantity},
                Replenish Quantity: ${isToStoreProductExist.replenish_quantity},

                AFTER UPDATE IN (${to_location.name}(store)): 
                Distribution Quantity: ${updatedDistributionQuantity},
                Replenish Quantity: ${updatedReplenishQuantity},
                `, req, ObjectName.TRANSFER, transferId);
              }

              if (updatedReplenishQuantity < 0) {

                History.create(
                  `REPLENISH QTY NEGATIVE VALUE UPDATE(Draft - Ready For Distribution):
                  productId: ${product_id}
                  transferProductQuantity: ${quantity},

                   BEFORE UPDATE IN (${to_location.name}(store)): 
                   Distribution Quantity: ${isToStoreProductExist.transferred_quantity},
                   Replenish Quantity: ${isToStoreProductExist.replenish_quantity},
  
                   AFTER UPDATE IN (${to_location.name}(store)): 
                   Distribution Quantity: ${updatedDistributionQuantity},
                   Replenish Quantity: ${updatedReplenishQuantity},
                  `, req, ObjectName.TRANSFER, transferId);
              }

              await storeProduct.update({ transferred_quantity: updatedDistributionQuantity, replenish_quantity: updatedReplenishQuantity }, { where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })
            }

          }
        }
      }
    }

  } catch (err) {
    console.log(err);
  }
}

const updateQuantityFromReplenishment = async (transferId, companyId, req) => {
  try {
    if (transferId && companyId) {

      let transferProductList = await TransferProduct.findAll({
        where: { transfer_id: transferId, company_id: companyId },
        include: [{
          required: false,
          model: locationModel,
          as: "from_location",
        },
        {
          required: false,
          model: locationModel,
          as: "to_location",
        }]
      })

      if (transferProductList && transferProductList.length > 0) {

        for (let i = 0; i < transferProductList.length; i++) {

          const { from_location, to_location, product_id, quantity } = transferProductList[i];

          if (from_location && to_location && quantity) {

            let isFromStoreProductExist = await storeProduct.findOne({ where: { store_id: from_location.id, product_id: product_id, company_id: companyId } })

            let isToStoreProductExist = await storeProduct.findOne({ where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })

            if (isFromStoreProductExist) {

              let fromStoreQuanity = isFromStoreProductExist.quantity;

              if (fromStoreQuanity >= quantity) {

                let updatedQuantity = fromStoreQuanity - quantity;

                await storeProduct.update({ quantity: updatedQuantity }, { where: { store_id: from_location.id, product_id: product_id, company_id: companyId } })
              }
            }

            if (isToStoreProductExist) {

              let updatedQuantity = Number.Get(isToStoreProductExist.quantity) + Number.Get(quantity);

              let updatedDistributionQuantity = Number.Get(isToStoreProductExist.transferred_quantity) - Number.Get(quantity);

              if (updatedDistributionQuantity < 0) {

                History.create(
                  ` TRANSFERRED QTY NEGATIVE VALUE UPDATE(Ready For Distribution To Complete):
                  productId: ${product_id}
                  transferProductQuantity: ${quantity}

 

               BEFORE UPDATE IN (${to_location.name}(store)): 
               To Store Quantity(${to_location.name}): ${isToStoreProductExist.quantity},
               Distribution Quantity: ${isToStoreProductExist.transferred_quantity},

               AFTER UPDATE IN (${to_location.name}(store)): 
               To Store Quantity(${to_location.name}): ${updatedQuantity},
               Distribution Quantity: ${updatedDistributionQuantity},

               Replenish Quantity : ${isToStoreProductExist.replenish_quantity},
              
              `, req, ObjectName.TRANSFER, transferId);

              }

              await storeProduct.update({ quantity: updatedQuantity, transferred_quantity: updatedDistributionQuantity }, { where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })
            }

          }

        }
      }
    }

  } catch (err) {
    console.log(err);
  }
}

const updateStoreQuantityFromTransfer = async (transferId, companyId) => {
  try {
    if (transferId && companyId) {

      let transferProductList = await TransferProduct.findAll({
        where: { transfer_id: transferId, company_id: companyId },
        include: [{
          required: false,
          model: locationModel,
          as: "from_location",
        },
        {
          required: false,
          model: locationModel,
          as: "to_location",
        }]
      })

      if (transferProductList && transferProductList.length > 0) {

        for (let i = 0; i < transferProductList.length; i++) {

          const { from_location, to_location, product_id, quantity } = transferProductList[i];

          if (from_location && to_location && quantity) {

            let isFromStoreProductExist = await storeProduct.findOne({ where: { store_id: from_location.id, product_id: product_id, company_id: companyId } })

            let isToStoreProductExist = await storeProduct.findOne({ where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })

            if (isFromStoreProductExist) {

              let fromStoreQuanity = isFromStoreProductExist.quantity;

              if (fromStoreQuanity >= quantity) {

                let updatedQuantity = Number.Get(fromStoreQuanity) - Number.Get(quantity);

                await storeProduct.update({ quantity: updatedQuantity }, { where: { store_id: from_location.id, product_id: product_id, company_id: companyId } })
              }
            }

            if (isToStoreProductExist) {

              let toStoreUpdatedQuantity = Number.Get(isToStoreProductExist.quantity) + Number.Get(quantity);

              await storeProduct.update({ quantity: toStoreUpdatedQuantity }, { where: { store_id: to_location.id, product_id: product_id, company_id: companyId } })
            }

          }

        }
      }
    }

  } catch (err) {
    console.log(err);
  }
}


const updateOrderQuantity = async (product_id, companyId) => {

  if (!companyId) {
    res.json(BAD_REQUEST, { message: "CompanyId not Found" })
  }

  if (!product_id) {
    res.json(BAD_REQUEST, { message: "ProductId not Found" })
  }

  const rawQuery = `
  UPDATE store_product
  SET order_quantity = (SELECT SUM(quantity)
                   FROM order_product
                   WHERE product_id = :product_id
                   AND store_id = store_product.store_id
                   AND company_id = :companyId)
  WHERE product_id = :product_id
  AND company_id = :companyId
`;

  const replacements = {
    product_id: product_id,
    companyId: companyId,
  };

  await db.connection.query(rawQuery, {
    replacements: replacements,
    type: QueryTypes.UPDATE,
  });


};

const updateTransferQuantity = async (product_id, companyId) => {

  if (!companyId) {
    res.json(BAD_REQUEST, { message: "CompanyId not Found" })
  }

  if (!product_id) {
    res.json(BAD_REQUEST, { message: "ProductId not Found" })
  }


  const rawQuery = `
  UPDATE store_product
  SET transfer_quantity = (SELECT SUM(quantity)
                   FROM transfer_product
                   WHERE product_id = :product_id
                   AND to_store_id = store_product.store_id
                   AND company_id = :companyId)
  WHERE product_id = :product_id
  AND company_id = :companyId
`;

  const replacements = {
    product_id: product_id,
    companyId: companyId,
  };

  await db.connection.query(rawQuery, {
    replacements: replacements,
    type: QueryTypes.UPDATE,
  });
}

const addToStoreProduct = async (locationIds, productId, userId, companyId) => {
  const draftStatusId = await statusService.Get(ObjectName.STOCK_ENTRY, Status.GROUP_DRAFT, companyId);
  if (!draftStatusId) {
    throw { message: "StockEntry Status Not Found" };
  }

  if (locationIds && locationIds.length > 0) {
    for (let i = 0; i < locationIds.length; i++) {
      const locationId = locationIds[i];
      let stockEntryExist = await getStockEntryById(null, draftStatusId && draftStatusId?.id, locationId, companyId);
      let params = {
        productId: productId,
        companyId: companyId,
        created_by: userId,
      };
      if (stockEntryExist) {
        await StockEntryProductService.create({
          ...params,
          stockEntryId: stockEntryExist?.id,
          storeId: stockEntryExist?.store_id,
        });
      } else {
        await StockEntryService.create({ storeId: locationId, companyId: companyId, owner_id: userId }).then(
          async (res) => {
            await StockEntryProductService.create({ ...params, stockEntryId: res?.id, storeId: res?.store_id });
          }
        );
      }
    }
  }
};



 const updateStoreProductQtyIncreseDecreaseById = async (orderId, newLocationId, oldLocationId, companyId) => {
   try {
     if (Number.Get(oldLocationId) !== Number.Get(newLocationId)) {
       let getOrderProductIds = await getAllOrderProductByOrderId(orderId);

       const productIds =
         getOrderProductIds &&
         getOrderProductIds.rows &&
         getOrderProductIds.rows.length > 0 &&
         getOrderProductIds.rows.map((item) => ({
           quantity: item?.quantity,
           product_id: item?.product_id,
         }));

       if (productIds && productIds.length > 0) {
         for (let i = 0; i < productIds.length; i++) {
           const { product_id, quantity } = productIds[i];

           //  update old storeProduct qty
           let oldStoreProductData = await getStoreProductByStoreAndProductId(oldLocationId, product_id);
           await storeProduct.update(
             { quantity: Number.Get(oldStoreProductData?.quantity) + Number.Get(quantity) },
             {
               where: { product_id: product_id, store_id: oldLocationId, company_id: companyId },
             }
           );

           //  update neew storeProduct qty
           let newStoreProductData = await getStoreProductByStoreAndProductId(newLocationId, product_id);
           await storeProduct.update(
             { quantity: Number.Get(newStoreProductData?.quantity) - Number.Get(quantity) },
             {
               where: { product_id: product_id, store_id: newLocationId, company_id: companyId },
             }
           );
         }
       }
     }
   } catch (err) {
     console.log(err);
   }
 };
 

const getQuantityByDate = (
  orderProductList,
  dateRange,
  currentDate,
  productId,
  storeId
) => {
  try {
    const filteredData = orderProductList.filter((item) => {
      return (
        item.order_date >= dateRange &&
        item.order_date <= currentDate &&
        item.product_id == productId &&
        item.store_id == storeId
      );
    });
    const totalQuantity = filteredData.reduce((acc, item) => {
      return acc + item.quantity;
    }, 0);

    return totalQuantity;
  } catch (err) {
    console.log(err);
  }
};
const updateLocationProductAverageOrderQty = async (companyId) => {
  try {
    let averageQuantityOrderDays = await getSettingValue(
      Setting.AVERAGE_ORDER_DAYS,
      companyId
    );
    let storeProductList;
    let updateDataArray = new Array();
    let daysCountByLocation;
    let averageOrderDays;


    let toDate = DateTime.getSQlFormattedDate(new Date());
    let fromDate = DateTime.subtract(averageQuantityOrderDays);

    let locationList = await locationModel.findAll({
      where: {
        status: Status.ACTIVE_TEXT,
        company_id: companyId,
      },
      attributes: ["name", "id","start_date","end_date"],
    });

    let storeDaysCount = DateTime.getDayCount(locationList)

    let orderProductList = await orderProductService.getByOrderDate(
      toDate,
      fromDate,
      companyId
    );

    let query = {
      where: { company_id: companyId },
      attributes: [
        "id",
        "product_id",
        "store_id",
        "min_quantity",
        "max_quantity",
        "average_order_quantity"
      ],
      order:[["product_id","ASC"]],
    };

    const orderProductMap = new Map();
    orderProductList.forEach((item) => {
      const key = `${item.product_id}-${item.store_id}`;
      if (!orderProductMap.has(key)) {
        orderProductMap.set(key, []);
      }
      orderProductMap.get(key).push(item);
    });

    storeProductList = [];
    storeProductList = await storeProduct.findAll(query);
    if (storeProductList && storeProductList.length > 0) {
      for (let k = 0; k < storeProductList.length; k++) {
        totalMinOrderQuantity = null;

        if (orderProductList && ArrayList.isNotEmpty(orderProductList)) {
          const key = `${storeProductList[k].product_id}-${storeProductList[k].store_id}`;
          const totalMinOrderQuantity = orderProductMap.has(key)
            ? getQuantityByDate(
                orderProductMap.get(key),
                fromDate,
                toDate,
                storeProductList[k].product_id,
                storeProductList[k].store_id
              )
            : 0;
     daysCountByLocation = storeDaysCount[storeProductList[k].store_id]
     averageOrderDays = Number.Get(daysCountByLocation>averageQuantityOrderDays?averageQuantityOrderDays:daysCountByLocation)
            updateDataArray.push({
              product_id: storeProductList[k].product_id,
              store_id: storeProductList[k].store_id,
              average_order_quantity:storeProductList[k].average_order_quantity,
              quantity: totalMinOrderQuantity/averageOrderDays
            });
          }
        }
      }

    if (updateDataArray && updateDataArray.length > 0) {
      for (let i = 0; i < updateDataArray.length; i++) {
        if(Number.GetFloat(updateDataArray[i].average_order_quantity) !== Number.GetFloat(updateDataArray[i].quantity)){
        await storeProduct.update(
          { average_order_quantity: Number.GetFloat(updateDataArray[i].quantity) },
          {
            where: {
              store_id: updateDataArray[i].store_id,
              product_id: updateDataArray[i].product_id,
            },
          }
        )
      }
    }
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  isExist,
  createStoreProduct,
  updateStoreProduct,
  updateStoreProductById,
  updateAllStoreProductByProductId,
  searchStoreProduct,
  deleteStoreProduct,
  deleteStoreProductById,
  getAllStoreProductById,
  getStoreProductByProductId,
  getStoreProductDetails,
  getStoreProductByStoreAndProductId,
  search,
  bulkUpdate,
  creatStoreProductByStoreId,
  updateByProductId,
  searchReplenishStoreProduct,
  Reindex,
  updateDistributionQuantityFromReplenish,
  updateQuantityFromReplenishment,
  updateOrderQuantity,
  updateTransferQuantity,
  addToStoreProduct,
  updateStoreProductQtyIncreseDecreaseById,
  updateStoreQuantityFromTransfer,
  updateLocationProductAverageOrderQty,
};
