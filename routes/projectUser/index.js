const verifyToken = require("../../middleware/verifyToken");
const create = require("./create");
const search = require("./search");
const del = require("./delete");
const updateStatus = require("./updateStstus");
const userList = require("./userList");
module.exports = (server) => {
	server.get("/v1/project/users/search", verifyToken, search);
	server.post("/v1/project/users", verifyToken, create);
	server.del("/v1/project/users/:id", verifyToken, del);
	server.put("/v1/project/users/updateStatus/:id", verifyToken, updateStatus);
	server.get("/v1/project/users/userList", verifyToken, userList);
};
