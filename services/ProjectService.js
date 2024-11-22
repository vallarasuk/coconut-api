const ObjectName = require("../helpers/ObjectName");
const Request = require("../lib/request");
const History = require("../services/HistoryService");
const Date = require("../lib/dateTime");
const { BAD_REQUEST, UPDATE_SUCCESS, OK } = require("../helpers/Response");
const Projects = require("../helpers/Project.js")
const ProjectUserService = require("./ProjectUserService");

const Number = require("../lib/Number");
// Models
const { Op, Sequelize } = require("sequelize");
const Status = require("../helpers/Status.js");
const Setting = require("../helpers/Setting.js");
const ArrayList = require("../lib/ArrayList.js");
// Models
const { Project, status, Slack, ProjectUser, ProjectSettingModel } = require("../db").models;

const create = async (req, res) => {

  try {
    //get company Id from request
    let data = req.body;
    let userId = Request.getUserId(req);

    const company_id = Request.GetCompanyId(req);

    let query = {
      order: [["createdAt", "DESC"]],
      where: { company_id },
    };

    const projectExist = await Project.findOne({
      where: { name: data.name, company_id: company_id },
    });

    if (projectExist) {
      return res.json(BAD_REQUEST, { message: "Project already exist" });
    }

    let projectCreateData = {
      company_id: company_id,
      name: data.name,
      code: data.code,
      slug: data.slug,
      component: data?.component ? data?.component : "",
      status: Projects.STATUS_ACTIVE_VALUE

    };

    let projectDetails = await Project.create(projectCreateData);

    res.json(200, {
      message: "Project Added",
      projectDetails: projectDetails,
    });

    res.on("finish", async () => {

  let params = {
    company_id: company_id,
    project_id: projectDetails.id,
    user_id: userId,
    status: Projects.STATUS_ACTIVE
  }

  await ProjectUserService.create(params,res);
      // Create system log for sprint creation
      History.create("Project Added", req, ObjectName.PROJECT, projectDetails.id);
    });

  }
  catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};




const update = async (req, res, next) => {
  const data = req.body;
  const { id } = req.params;
  const companyId = Request.GetCompanyId(req)
  const name = data.name;
  try {
    const projectData = await Project.findOne({
      where: { id, company_id: companyId },
    });

    if (!projectData) {
      return res.json(400, { message: "Project Not Found" });
    }
    //update sprint details
    const projectDetails = {
      name: name,
      sort: Number.Get(data.sort),
      code: data ? data?.code : "",
      slug: data ? data.slug : "",
      allow_manual_id: data.allow_manual_ticket == Projects.YES ? Projects.YES_VALUE : Projects.NO_VALUE,
      last_ticket_id: data?.lastTicket ? data.lastTicket : null,
      status: data?.status ? data?.status : null,
      last_ticket_number: data?.last_ticket_number ? data.last_ticket_number : null,
    };


    if (data && data?.slack_channel_id) {
      let slackDetail = await Slack.findOne({
        where: {
          object_id: id,
          company_id: companyId
        }
      })

      let createData = {
        object_id: id,
        object_name: data?.name,
        slack_id: data?.slack_channel_id,
        slack_name: data?.slack_channel_name,
        company_id: companyId
      }

      if (slackDetail) {
        await Slack.update(createData, {
          where: {
            id: slackDetail && slackDetail?.id,
            object_id: id,
            company_id: companyId
          }
        })
      } else {
        await Slack.create(createData)
      }

    }


    const save = await Project.update(projectDetails, {
      where: { id: id, company_id: companyId },
    });


    // API response
    res.json(UPDATE_SUCCESS, { message: "Project Updated" })

    // History On Finish Function
    res.on(("finish"), async () => {
      History.create("Project Updated", req, ObjectName.PROJECT, id);
    })

  } catch (err) {
    //create a log
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message, })
  }
};



// Models

const del = async (req, res) => {

  try {

    // Get company Id from request
    let projectId = req.params.id;

    // Get company Id from request
    const companyId = Request.GetCompanyId(req);

    // Validate sprint Id exist or not
    if (!projectId) {
      return res.json(400, { message: "Project id is required" });
    }

    // Delete sprint
    await Project.destroy({ where: { id: projectId, company_id: companyId } });

    res.json(200, { message: "Project Deleted" });

    // History On Finish Function
    res.on(("finish"), async () => {
      History.create("Project Deleted", req, ObjectName.PROJECT, pid);
    })

  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
}

const Get = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Get the company Id
    const company_id = Request.GetCompanyId(req);

    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }

    const projectData = await Project.findOne({
      where: {
        id: id,
        company_id: company_id,
      },
    });

    const getSlackDetail = await Slack.findOne({
      where: {
        object_id: id,
        company_id: company_id,
      },
    });
    if (!projectData) return res.json(200, { message: "No Records Found" });

    const { allow_manual_id } = projectData
    projectData.allow_manual_id = (allow_manual_id == Projects.YES_VALUE) ? Projects.YES : Projects.NO
    projectData.slack_channel_id = getSlackDetail?.slack_id
    let data = {
      projectData,
      slack_channel_id: getSlackDetail?.slack_id
    };

    res.json(200, data);
  } catch (err) {
    next(err);
    console.log(err);
  }
}



const search = async (req, res, next) => {
  try {

    let { page, pageSize, search, sort, sortDir, pagination } = req.query;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
      return res.json(400, { message: "Company Not Found" });
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      name: "name",
      status: "status",
      sort: "sort",
      created_at: "created_at",
      updated_at: "updated_at",
      deleted_at: "deleted_at",

    };

    const sortParam = sort || "name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(BAD_REQUEST, {
        message: `Unable to sort by ${sortParam}`,
      });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    const data = req.query;

    const where = {};

    where.company_id = companyId;
    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    const query = {
      order: [[sortableFields[sortParam], sortDirParam]],
      include: {
        required: false,
        model: status,
        as: "statusData",
      },
      where,
    };

    if (pagination) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    // Get sprint list and count
    const projectDetails = await Project.findAndCountAll(query);

    // Return sprint is null
    if (projectDetails.count === 0) {
      return res.json({});
    }

    const projectData = [];

    projectDetails.rows.forEach((projectDetail) => {

      projectData.push({
        id: projectDetail.id,
        status: projectDetail?.statusData?.name,
        name: projectDetail.name,
        status: projectDetail.status == Projects.STATUS_ACTIVE_VALUE ? Projects.STATUS_ACTIVE : projectDetail.status == Projects.STATUS_INACTIVE_VALUE ? Projects.STATUS_INACTIVE : "",
        sort: parseFloat(projectDetail.sort),
      });
    });

    res.json(OK, {
      totalCount: projectDetails.count,
      currentPage: page,
      pageSize,
      data: projectData,
      search,
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}


const list = async (req, res, next) => {
  try {
    const companyId = req.user && req.user.company_id;
    const userId = req.user && req.user.id;

    if (!companyId) {
      return res.json({ message: "Company Not Found" });
    }

    const UserRolePermission = async (name, project_id) => {
      let selectedRole = await ProjectSettingModel.findOne({
        where: { project_id: project_id, name: name, company_id: companyId },
      });

      let selectedRoleArray = selectedRole && selectedRole.value.split(",");
      let rolePermission = selectedRoleArray && selectedRoleArray.includes(req.user.role.toString());
      return rolePermission;
    };

    const where = {
      company_id: companyId,
      status: Status.ACTIVE,
    };

    const userProjects = await ProjectUser.findAll({ where: { user_id: userId , status : true} });

    const projectIds = userProjects.map((projectUser) => projectUser.project_id);    

    if (projectIds.length > 0) {
      where.id = projectIds;
    } else {
      return res.json({ data: [], search: null });
    }

    const query = {
      order: [["name", "ASC"]],
      where,
    };

    let data=[]
    const projectDetails = await Project.findAndCountAll(query);

    if(ArrayList.isArray(projectDetails.rows)){
      for (let i = 0; i < projectDetails.rows.length; i++) {
        const projectDetail = projectDetails.rows[i];
        data.push({
          id: projectDetail.id,
          status: projectDetail?.statusData?.name,
          name: projectDetail.name,
          allow_for_assignee_change_permission: await UserRolePermission(Setting.PROJECT_SETTING_ALLOWED_ROLES_FOR_ASSIGNEE_CHANGE, projectDetail.id),
        })
        
      }
    }

    res.json({
      data: data,
    });
  } catch (err) {
    console.log(err);
    res.json({ message: err.message });
  }
};

const updateByStatus = async (req, res, next) => {
  let companyId = Request.GetCompanyId(req);

  let data = req.body;

  let { id } = req.params;
  const ProjectStatus = await Project.findOne({ where: { company_id: companyId, id: id } });

  const { status } = ProjectStatus;

  let company_id = Request.GetCompanyId(req);
  try {
    if (!id) {
      return res.json(400, {
        message: 'Invalid Id',
      });
    }

    let updateData = {};
    if (data.status) {
      updateData.status = data.status
    }

    await Project.update(updateData, {
      where: {
        id,
        company_id,
      },
    });

    // systemLog
    res.json(200, {
      message: 'Project Status Updated',
    });
    res.on('finish', async () => {
      //create system log for sale updation
      History.create(
        `Project Status Changed From ${status == ProjectStatus.ACTIVE_STATUS
          ? ProjectStatus.ACTIVE
          : status == ProjectStatus.IN_ACTIVE_STATUS
            ? ProjectStatus.IN_ACTIVE
            : ' '
        } to ${data.status == ProjectStatus.ACTIVE_STATUS
          ? ProjectStatus.ACTIVE
          : status == ProjectStatus.IN_ACTIVE_STATUS
            ? ProjectStatus.IN_ACTIVE
            : ' '
        } `,
        req,
        ObjectName.PROJECT,
        id
      );
    });
  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, {
      message: err.message,
    });
  }
}
module.exports = {
  create,
  update,
  list,
  del,
  Get,
  search,
  updateByStatus
};

