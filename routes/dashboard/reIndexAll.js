const errors = require("restify-errors");
const dashoboardIndexService = require("../../services/dashboardIndex");

function reIndexAll(req, res, next) {


  res.json({ message: "Ticket Dashboard reIndexed" });

  res.on("finish", () => dashoboardIndexService.reIndexAll());
}

module.exports = reIndexAll;
