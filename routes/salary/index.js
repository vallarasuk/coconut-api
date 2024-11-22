const verifyToken = require("../../middleware/verifyToken");
const create = require("./create");
const list = require("./list");
const update = require("./update");
const filterRoute = require("./filterRoute");
const get = require("./get");
const updateStatus = require("./updateStatus");
const bulkUpdate = require("./bulkUpdate");
const del = require("./del")
const projectionReport = require("./projectionReport");
const exportList = require("./exportList");
const bulkDelete = require("./bulkDelete");
const search = require("./search");
const generateOtp = require("./generateOtp");
const verifyOtp = require("./verifyOtp");

module.exports = (server) => {
    server.post("/v1/salary", verifyToken, create);
    server.get("/v1/salary/search", verifyToken, list);
    server.put("/v1/salary/:id", verifyToken, update);
    server.post("/v1/salary/filterRoute", verifyToken, filterRoute);
    server.get("/v1/salary/:id", verifyToken, get);
    server.put("/v1/salary/status", verifyToken, updateStatus);
    server.put("/v1/salary/bulk/update", verifyToken, bulkUpdate);
    server.del("/v1/salary/delete/:id", verifyToken, del);
    server.get("/v1/salary/projectionReport", verifyToken, projectionReport);
    server.put("/v1/salary/bulk/exportList", verifyToken, exportList);
    server.del("/v1/salary/bulkDelete", verifyToken, bulkDelete);
    server.get("/v1/salary", verifyToken, search);
    server.post("/v1/salary/generateOtp", verifyToken, generateOtp);
    server.post("/v1/salary/verifyOtp", verifyToken, verifyOtp);
};