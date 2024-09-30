const verifyToken = require("../../middleware/verifyToken");
const create = require("./create");

module.exports = (server) => {
  server.post("/v1/messageChannelUser/create", verifyToken, create);
};