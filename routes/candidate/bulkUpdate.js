const errors = require("restify-errors");
const { Candidate } = require("../../db").models;
const utils = require("../../lib/utils");

const DateTime = require("../../lib/dateTime");

const dateTime = new DateTime();

function bulkUpdate(req, res, next) {
  const data = req.body;

  const candidateId = data.ids.split(",");

  const candidateData = {};

  if (data.status) {
    candidateData.status = data.status;
  }

  if (data.interviewDate) {
    candidateData.interview_date = utils.customDate(
      data.interviewDate,
      dateTime.formats.dateFormat,
      dateTime.formats.mySQLDateFormat
    );
  }

 

  if (!candidateId) {
    return next(new errors.BadRequestError("Candidate id is required"));
  }

  Candidate.update(candidateData, {
    where: { id: { $in: [candidateId] } },
  })
    .then(() => {
      res.json({ message: "Candidate  updated" });
    })
    .catch((err) => {
      req.log.error(err);
      return next(err);
    });
}

module.exports = bulkUpdate;
