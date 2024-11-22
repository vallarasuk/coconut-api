const list = require("./list");

module.exports = (server) => {
	server.get("/public/jobs/v1/list",  list);
};
