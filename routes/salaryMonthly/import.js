const errors = require("restify-errors");
const async = require("async");
const csv = require("fast-csv");

// Models
const { SalaryMonthly } = require("../../db").models;

function importList(req, res, next) {
  

  const file = req.files.file;

  if (!file || !file.name) {
    return next(new errors.BadRequestError("File is required"));
  }

  const salaryMonthlyList = [];
  csv
    .fromPath(file.path, { headers: true })
    .on("data", (data) => {
      if (data.user_id) {
        salaryMonthlyList.push(data);
      }
    })
    .on("end", () => {
      if (salaryMonthlyList.length === 0) {
        return next(new errors.BadRequestError("No data found"));
      }

      async.eachSeries(
        salaryMonthlyList,
        (salaryMonth, cb) => {
          SalaryMonthly.create(salaryMonth)
            .then(() => cb())
            .catch((err) => {
              req.log.error(err);
              return cb(err);
            });
        },
        () => {
          res.json({ message: "Salary imported" });
        }
      );
    });
}

module.exports = importList;
