/**
 * Module dependencies
 */
// Express router
const verifyToken = require("../../middleware/verifyToken");

// Route dependencies
const importOrder = require("./importOrder");
const search = require("./search");
const get = require("./get");
const del = require("./delete");
const update = require("./update");
const create = require("./create");
const updateStatus = require("./updateStatus");
const bulkUpdate = require("./bulkUpdate");
const completeOrder = require("./completeOrder");
const getDraftCount = require("./getDraftCount");
const orderCount = require("./orderCount");
const bulkOrder = require("./bulkOrder");
const updateDeliveryStatus = require("./updateDeliveryStatus");
const getBySelectedIds = require("./getBySelectedIds");
const cancelOrder = require("./cancel");
const sendNotification = require("./sendNotification");

module.exports = (server) => {
  server.post("/v1/order", verifyToken, create);
  server.post("/v1/order/import/:storeId", verifyToken, importOrder);
  server.get("/v1/order/search", verifyToken, search);
  server.get("/v1/order/:id", verifyToken, get);
  server.post("/v1/order/getBySelectedIds", verifyToken, getBySelectedIds);
  server.put("/v1/order/:orderId", verifyToken, update);
  server.del("/v1/order/:id", verifyToken, del);
  server.put("/v1/order/status/:id", verifyToken, updateStatus);
  server.put("/v1/order/deliveryStatus/:id", verifyToken, updateDeliveryStatus);
  server.put("/v1/order/bulkUpdate", verifyToken, bulkUpdate);
  server.put("/v1/order/completeOrder/:id", verifyToken, completeOrder);
  server.get("/v1/order/getDraftCount", verifyToken, getDraftCount);
  server.get("/v1/order/orderCount", verifyToken, orderCount);
  server.post("/v1/order/bulkOrder", verifyToken, bulkOrder);
  server.put("/v1/order/cancel/:id", verifyToken, cancelOrder);
  server.put("/v1/order/sendNotification/:id", verifyToken, sendNotification);

};
