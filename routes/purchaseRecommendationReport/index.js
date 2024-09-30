const verifyToken = require("../../middleware/verifyToken");

// Route dependencies

const search = require("./search")

module.exports = (server) => {
    server.get("/v1/purchaseRecommendationReport/search", verifyToken, search);

};
