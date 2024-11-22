const verifyToken = require("../../middleware/verifyToken");
const create = require("./create");
// const del = require("./delete");
// const search = require("./search");
// const updateStatus = require("./updateStatus");
// const get = require("./get");

module.exports = (server) => {
                          
	server.post("/v1/ledger/create", verifyToken, create);
	// server.get("/v1/locationAllocation/search", verifyToken, search);
	// server.del("/v1/locationAllocation/delete/:id", verifyToken, del);
	// server.put("/v1/locationAllocation/status/:id", verifyToken, updateStatus);
	// server.get("/v1/locationAllocation/:id", verifyToken, get);

};
