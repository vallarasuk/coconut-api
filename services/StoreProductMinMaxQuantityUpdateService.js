const { orderProduct: orderProductModal, storeProduct: storeProductModal, product, Location, productIndex: ProductIndexModal } = require('../db').models;
const DataBaseService = require('../lib/dataBaseService');
const DateTime = require('../lib/dateTime');
const storeProductService = new DataBaseService(storeProductModal);
const Order = require('../helpers/Order');
const { Op } = require('sequelize');
const Number = require('../lib/Number');
const ArrayList = require('../lib/ArrayList');
const SettingService = require("../services/SettingService");
const Setting = require('../helpers/LocationProduct');
const LocationHelper = require('../helpers/StoreStatus');
const { USER_DEFAULT_TIME_ZONE, REPLENISHMENT_BY } = require("../helpers/Setting");
const Replenishment = require("../helpers/Replenishment");
const ObjectName = require("../helpers/ObjectName");
const Status = require("../helpers/Status");
const StatusService = require("./StatusService")
class StoreProductMinMaxQuantityUpdateService {
  // Function to sum the quantity based on product ID, store ID, and date range
  static async getQuantityByDate(orderProductList, dateRange, currentDate, productId, storeId) {
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
  }

  static async getByOrderDate(currentDate, companyId, maxOrderDays, productId, storeId) {
    try {
      if (maxOrderDays > 0) {

        let orderProductList = [];

        let orderProductObject = new Object();
        let timeZone = await SettingService.getSettingValue(USER_DEFAULT_TIME_ZONE, companyId);
        let startDate = DateTime.subtract(maxOrderDays)
        let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
        let end_date = DateTime.toGetISOStringWithDayEndTime(currentDate)

        let orderWhere = {
          order_date: {
            [Op.and]: {
              [Op.gte]: DateTime.toGMT(start_date,timeZone),
              [Op.lte]: DateTime.toGMT(end_date,timeZone),
            },
          },
          company_id: companyId,
        };

        if (productId) {
          orderWhere.product_id = productId;
        }

        orderWhere.cancelled_at= {[Op.eq]:null}
        
        if (storeId) {
          orderWhere.store_id = storeId;
        }

        let statusDetail = await StatusService.getAllStatusByGroupId(
          ObjectName.ORDER_PRODUCT,
          Status.GROUP_COMPLETED,
          companyId
        );

        if (ArrayList.isArray(statusDetail)) {
          let status = statusDetail.map((value) => value.id);
          orderWhere.status = status;
        }

        let OrderProductData = await orderProductModal.findAll({
          where: orderWhere,
          attributes: ['order_date', 'quantity', 'product_id', 'store_id'], // Specify the attributes to retrieve
        });

        for (let i = 0; i < OrderProductData.length; i++) {
          orderProductObject = {
            quantity: OrderProductData[i].quantity,
            order_date: new Date(OrderProductData[i].order_date).toISOString().slice(0, 10),
            product_id: OrderProductData[i].product_id,
            store_id: OrderProductData[i].store_id,
          };
          orderProductList.push(orderProductObject);
        }
        return orderProductList;
      }
    } catch (err) {
      console.log(err);
    }
  }


  static async updateMinMaxQuantity(updateDataArray, minBigOrderQuantity, maxBigOrderQuantity) {
    try {

      let maxQuantityUpdateArray;

      let maxQuantityUpdateStoreIds;

      let minQuantityUpdateArray;

      let minQuantityUpdateStoreIds;

      if (minBigOrderQuantity > 0 && updateDataArray.length > 0) {
        for (let i = 1; i <= minBigOrderQuantity; i++) {
          minQuantityUpdateArray = updateDataArray.filter((data) => data.min_order_quantity == i);

          if (minQuantityUpdateArray && minQuantityUpdateArray.length == 0) {
            continue;
          }

          minQuantityUpdateStoreIds = minQuantityUpdateArray.map((data) => data.storeProductId);

          minQuantityUpdateStoreIds = ArrayList.splitArray(minQuantityUpdateStoreIds, 100);

          if (minQuantityUpdateStoreIds && minQuantityUpdateStoreIds.length > 0) {
            for (let j = 0; j < minQuantityUpdateStoreIds.length; j++) {
              await storeProductService.update(
                { min_order_quantity: i },

                {
                  where: { id: { [Op.in]: minQuantityUpdateStoreIds[j] } },
                }
              );
            }
          }
        }
      }

      if (maxBigOrderQuantity > 0 && updateDataArray.length > 0) {
        for (let i = 1; i <= maxBigOrderQuantity; i++) {
          maxQuantityUpdateArray = updateDataArray.filter((data) => data.max_order_quantity == i);

          if (maxQuantityUpdateArray && maxQuantityUpdateArray.length == 0) {
            continue;
          }

          maxQuantityUpdateStoreIds = maxQuantityUpdateArray.map((data) => data.storeProductId);

          maxQuantityUpdateStoreIds = ArrayList.splitArray(maxQuantityUpdateStoreIds, 100);

          if (maxQuantityUpdateStoreIds && maxQuantityUpdateStoreIds.length > 0) {
            for (let j = 0; j < maxQuantityUpdateStoreIds.length; j++) {
              await storeProductService.update(
                { max_order_quantity: i },
                {
                  where: { id: { [Op.in]: maxQuantityUpdateStoreIds[j] } },
                }
              );
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  static async getTotalMinMaxOrderQuantity(productId, companyId, isUseProductStockDays) {
    try {
      let currentDate = DateTime.getSQlFormattedDate(new Date());
      let updateDataArray = new Array();
      let totalMaxOrderQuantity;
      let totalMinOrderQuantity;
      let maxOrderQuantity = 0;
      let minOrderQuantity = 0; 
      let minBigOrderQuantity = 0;
      let maxBigOrderQuantity = 0;
      let updateData;
      let productIndex;
      let storeProductList;
      let where = {};
      let query;
      let locationProductWhere = {};
      let orderProductList;

      let minQuantityOrderDays = await SettingService.getSettingValue(Setting.LOCATION_PRODUCT_MIN_QUANTITY_ORDER_DAYS, companyId);
      let maxQuantityOrderDays = await SettingService.getSettingValue(Setting.LOCATION_PRODUCT_MAX_QUANTITY_ORDER_DAYS, companyId);

      let minOrderDate = DateTime.subtract(minQuantityOrderDays ? minQuantityOrderDays : Order.STORE_PRODUCT_MIN_QUANTITY_ORDER_DAYS);
      let maxOrderDate = DateTime.subtract(maxQuantityOrderDays ? maxQuantityOrderDays : Order.STORE_PRODUCT_MAX_QUANTITY_ORDER_DAYS);

      if (productId) {
        where.id = productId;
        locationProductWhere.product_id = productId
      }

      where.company_id = companyId;
      locationProductWhere.company_id = companyId;

      query = {
        where: locationProductWhere,
        attributes: ["id", "product_id", "store_id", "min_quantity", "max_quantity"]
      };

      let locationList = await Location.findAll({
        where: { status: LocationHelper.STATUS_ACTIVE, company_id: companyId },
        attributes: ["name", "id"]
      })

      let productList = await product.findAll({
        where: where,
        attributes: ["id", "min_stock_days", "max_stock_days"]
      })
      if (!isUseProductStockDays) {
        orderProductList = await this.getByOrderDate(currentDate, companyId, maxQuantityOrderDays);
      }

      if (locationList && locationList.length > 0) {

        for (let i = 0; i < locationList.length; i++) {

          storeProductList = [];

          query.where.store_id = locationList[i].id;

          if (isUseProductStockDays) {
            query.include = [
              {
                required: true,
                model: product,
                as: "productDetail",
                attributes: ["id"],
                where: { max_stock_days: { [Op.ne]: null } }
              }
            ]
          }

          storeProductList = await storeProductService.find(query);

          if (storeProductList && storeProductList.length > 0) {

            for (let k = 0; k < storeProductList.length; k++) {

              updateData = {};

              totalMinOrderQuantity = null;

              totalMaxOrderQuantity = null;

              if (isUseProductStockDays) {

                productIndex = productList.find((data) => data.id == storeProductList[k].product_id); 
                if (productIndex) {
                  productIndex = productIndex.get();

                  if (productIndex.min_stock_days) {
                    minOrderDate = DateTime.subtract(productIndex.min_stock_days);
                  }

                  if (productIndex.max_stock_days) {
                    orderProductList = await this.getByOrderDate(currentDate, companyId, productIndex.max_stock_days, storeProductList[k].product_id, storeProductList[k].store_id);
                    maxOrderDate = DateTime.subtract(productIndex.max_stock_days);
                  }

                }

              }

              if (orderProductList && ArrayList.isNotEmpty(orderProductList)) {

                totalMaxOrderQuantity = await this.getQuantityByDate(
                  orderProductList,
                  maxOrderDate,
                  currentDate,
                  storeProductList[k].product_id,
                  storeProductList[k].store_id
                );


                totalMinOrderQuantity = await this.getQuantityByDate(
                  orderProductList,
                  minOrderDate,
                  currentDate,
                  storeProductList[k].product_id,
                  storeProductList[k].store_id
                );

              }

              updateData.storeProductId = storeProductList[k].id;

              // min order qty
              if (totalMinOrderQuantity < storeProductList[k].min_quantity) {

                minOrderQuantity = Number.Get(storeProductList[k].min_quantity);
              } else {
                if(totalMinOrderQuantity > storeProductList[k].max_quantity){
                  minOrderQuantity = Number.Get(storeProductList[k].max_quantity);
                }else{
                  minOrderQuantity = Number.Get(totalMinOrderQuantity);
                }
              }

             // max order qty
              if (totalMaxOrderQuantity > storeProductList[k].max_quantity) {
                maxOrderQuantity = Number.Get(storeProductList[k].max_quantity);
              } else {
                if(totalMaxOrderQuantity < storeProductList[k].min_quantity){
                  maxOrderQuantity = Number.Get(storeProductList[k].min_quantity);
                }else{
                  maxOrderQuantity = Number.Get(totalMaxOrderQuantity);
                }
              }
              if (minOrderQuantity > maxOrderQuantity) {
                maxOrderQuantity = maxOrderQuantity
              }

              updateData.min_order_quantity = minOrderQuantity;

              updateData.max_order_quantity = maxOrderQuantity;

              if (minOrderQuantity > minBigOrderQuantity) {
                minBigOrderQuantity = minOrderQuantity;
              }

              if (maxOrderQuantity > maxBigOrderQuantity) {
                maxBigOrderQuantity = maxOrderQuantity;
              }

              updateDataArray.push(updateData);

            }
          }
        }
      }

      return { updateDataArray, minBigOrderQuantity, maxBigOrderQuantity };
    } catch (err) {
      console.log(err);
    }
  }

  static async update(companyId, productId) {
    try {
      let replenishBy = await SettingService.getSettingValue(REPLENISHMENT_BY, companyId);
      //update min max order date by setting order days

      if(Number.Get(replenishBy) == Replenishment.BY_ORDER_AVERAGE){
        await this.updateByAverageOrderQty(companyId);
      }
      let orderMinMaxObjBySetting = await this.getTotalMinMaxOrderQuantity(productId, companyId, false);

      if (orderMinMaxObjBySetting && ArrayList.isNotEmpty(orderMinMaxObjBySetting.updateDataArray)) {
        this.updateMinMaxQuantity(orderMinMaxObjBySetting.updateDataArray, orderMinMaxObjBySetting.minBigOrderQuantity, orderMinMaxObjBySetting.maxBigOrderQuantity);
      }

      //update min max order date by product stock days
      let orderMinMaxObjByProduct = await this.getTotalMinMaxOrderQuantity(productId, companyId, true);

      if (orderMinMaxObjByProduct && ArrayList.isNotEmpty(orderMinMaxObjByProduct.updateDataArray)) {
        this.updateMinMaxQuantity(orderMinMaxObjByProduct.updateDataArray, orderMinMaxObjByProduct.minBigOrderQuantity, orderMinMaxObjByProduct.maxBigOrderQuantity);
      }

    } catch (err) {
      console.log(err);
      throw err
    }
  }
  static async updateByAverageOrderQty(companyId) {
    try {
      let locationProductWhere = {};
      let productIndex;
      let minOrderDays;
      let maxOrderDays;

      let maxOrderQuantity;
      let minOrderQuantity;

      let minQuantityOrderDays = await SettingService.getSettingValue(Setting.LOCATION_PRODUCT_MIN_QUANTITY_ORDER_DAYS, companyId);
      let maxQuantityOrderDays = await SettingService.getSettingValue(Setting.LOCATION_PRODUCT_MAX_QUANTITY_ORDER_DAYS, companyId);

      let locationList = await Location.findAll({
        where: { status: LocationHelper.STATUS_ACTIVE, company_id: companyId },
        attributes: ["name", "id"]
      })

      let locationIds = locationList.map(value => value.id)

if(locationIds && locationIds.length>0){

  locationProductWhere.store_id = locationIds
}

locationProductWhere.average_order_quantity = {[Op.ne]:null} 

let  query = {
  where: locationProductWhere,
  attributes: ["id", "product_id", "store_id", "min_quantity", "max_quantity","average_order_quantity"],
  order:[["product_id","ASC"]]
};
let storeProductList = await storeProductService.find(query);

let productList = await product.findAll({
  where: {company_id : companyId},
  attributes: ["id", "min_stock_days", "max_stock_days"],
})

const productMap = productList.reduce((map, product) => {
  map[product.id] = product;
  return map;
}, {});

if (storeProductList && storeProductList.length > 0) {

  for (let k = 0; k < storeProductList.length; k++) {

    productIndex = productMap[storeProductList[k].product_id];
    
    if(productIndex){
      productIndex = productIndex.get();
      if(productIndex.max_stock_days){
      maxOrderDays = productIndex.max_stock_days
    }else{
      maxOrderDays = maxQuantityOrderDays
    }

    if(productIndex.min_stock_days){
    minOrderDays = productIndex.min_stock_days
    }else{
      minOrderDays = minQuantityOrderDays
    }
  }

    minOrderQuantity = Number.GetFloat(storeProductList[k].average_order_quantity)*Number.Get(minOrderDays)
    
    maxOrderQuantity = Number.GetFloat(storeProductList[k].average_order_quantity)*Number.Get(maxOrderDays)

    
    if (minOrderQuantity < storeProductList[k].min_quantity) {
      minOrderQuantity = Number.Get(storeProductList[k].min_quantity);
    } 
    
    if (maxOrderQuantity > storeProductList[k].max_quantity) {
      maxOrderQuantity = Number.Get(storeProductList[k].max_quantity);
    }
    
    if (minOrderQuantity > maxOrderQuantity) {
      maxOrderQuantity = minOrderQuantity
    }

    await storeProductService.update({min_order_quantity:Number.roundOff(minOrderQuantity), max_order_quantity:Number.roundOff(maxOrderQuantity)},{
      where: { id: storeProductList[k].id },
    })

  }
}
    } catch (err) {
      console.log(err);
      throw  err
    }
  }
}

module.exports = StoreProductMinMaxQuantityUpdateService;
