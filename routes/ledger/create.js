const Request = require("../../lib/request");
const { Ledger } = require("../../db").models;

async function create(req, res, next) {
  try {
    let companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(200, { message: "Company id Not found" });
    }

    const newEntry = await Ledger.create(req.body);
  } catch (error) {
    console.log(error);
    res.json(400, { message: error.message });
  }
}

module.exports = create;
