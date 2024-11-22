const create = require("./create");

module.exports = (server) => {
	server.post("/v1/public/candidateProfileSubmit", create);
};
