const errors = require("restify-errors");

// Models
const { UserDocumentType } = require("../../db").models;

function list(req, res, next) {
  if (!req.isAdmin) {
    return next(new errors.UnauthorizedError("Permission Denied"));
  }
  UserDocumentType.findAll({
    attributes: ["document_type"],
    order: [["document_type", "ASC"]],
  }).then((results) => {
    const userDocumentType = [];
    results.forEach((documentType) => {
      userDocumentType.push({
        documentType: documentType.document_type,
      });
    });

    res.json(userDocumentType);
  });
}

module.exports = list;
