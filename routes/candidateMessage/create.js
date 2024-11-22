const errors = require("restify-errors");
const validator = require("../../lib/validator");
const projectStatus = require("./projectStatus");
const { CandidateMessage } = require("../../db").models;
const projectService = require("../../services/project");

function create(req, res, next) {

  const data = req.body;

  const validations = [
    { value: data.name, label: "name" },
    { value: data.code, label: "code" },
    { value: data.slug, label: "slug" },
  ];

  validator.validateFields(validations, (err) => {
    if (err) {
      return next(err);
    }

    CandidateMessage.create({
      name: data.name,
      allow_manual_id: data.allowManualId || 0,
      code: data.code,
      slug: data.slug,
      sort: data.sort || 0,
      status: projectStatus.ACTIVE,
      status_text: projectStatus.getProjectStatusText(projectStatus.ACTIVE),
      component: "",
    })
      .then((project) => {
        projectService.updateIndex(project.get().id, () => {
          res.json(201, {
            message: "Project Added",
            projectId: project.id,
          });
        });
      })
      .catch((err) => {
        req.log.error(err);
        return next(err);
      });
  });
}

module.exports = create;
