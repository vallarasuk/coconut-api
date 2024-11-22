const ObjectName = require("../helpers/ObjectName");
const Request = require("../lib/request");
const History = require("./HistoryService");
const Date = require("../lib/dateTime");
const { BAD_REQUEST, UPDATE_SUCCESS, OK } = require("../helpers/Response");
const Projects = require("../helpers/Project.js")
const statusService = require("./StatusService");
const Users = require('../helpers/User');
const Number = require("../lib/Number");
const ProjectUserHelper = require("../helpers/ProjectUser");

// Models
const { Op, Sequelize } = require("sequelize");
const project = require("../routes/project");
const Response = require("../helpers/Response");
// Models
const { ProjectUser,Project,User } = require("../db").models;

const create = async (params, res) => {
  try {

    let { user_id, project_id, status, company_id }=params

    const projectUserExist = await ProjectUser.findOne({
      where: { user_id: user_id, project_id: project_id, company_id: company_id },
    });

    if (projectUserExist) {
      return res.json(BAD_REQUEST, { message: "Project User already exist" });
    }

    let projectUserCreateData = {
      company_id: company_id,
      project_id: project_id,
      user_id: user_id,
      status: status === Projects.STATUS_ACTIVE ? Projects.STATUS_ACTIVE_VALUE : Projects.STATUS_INACTIVE_VALUES,
    };

    let projectDetails = await ProjectUser.create(projectUserCreateData);

    return projectDetails
  
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const del = async (req, res) => {
  try {
    // Get company Id from request
    let projectUserId = req.params.id;

    // Get company Id from request
    const companyId = Request.GetCompanyId(req);

    // Validate sprint Id exist or not
    if (!projectUserId) {
      return res.json(400, { message: "Project User id is required" });
    }

    // Delete sprint
    await ProjectUser.destroy({ where: { id: projectUserId, company_id: companyId } });

    res.json(200, { message: "Project User Deleted" });

    // History On Finish Function
    res.on("finish", async () => {
      History.create(
        "Project User Deleted",
        req,
        ObjectName.PROJECT_USER,

        projectUserId
      );
    });
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

const search = async (req, res, next) => {
  try {
    let { page, pageSize, search, sort, sortDir, pagination, projectId } = req.query;

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
      projectName: "projectName",
      status: "status",
      sort: "sort",
      created_at: "created_at",
      updated_at: "updated_at",
      deleted_at: "deleted_at",
      project_id:"project_id",
      user_id:"user_id",
    };

    const sortParam = sort || "user_id";
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

    if (projectId) {
      where.project_id = projectId;
    }

    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          '$user.name$': {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },

        {
          '$user.last_name$': {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          [Op.and]: [Sequelize.literal(`CONCAT("user"."name", "user"."last_name" ) iLIKE '%${searchTerm}%'`)],
        },
      ];
    }

    const query = {
      order: sortParam !== 'user_id' ? [[sortParam, sortDirParam]] : [[{ model: User, as: 'user' }, 'name', sortDirParam]],
      where,
      include: [
        {
          required: true,
          model: Project,
          as: "projectDetail",
        },
        {
          required: true,
          model: User,
          as: "user",
          where: { status: Users.STATUS_ACTIVE },
        },
      ],
    };

    if (pagination) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    // Get sprint list and count
    const projectUserDetails = await ProjectUser.findAndCountAll(query);

    // Return sprint is null
    if (projectUserDetails.count === 0) {
      return res.json({});
    }

    const projectData = [];

    projectUserDetails.rows.forEach((projectUser) => {
      projectData.push({
        id: projectUser.id,
        status: projectUser.status == Projects.STATUS_ACTIVE_VALUE ? Projects.STATUS_ACTIVE : Projects.STATUS_INACTIVE,
        projectName: projectUser?.projectDetail?.name,
        userFirstName: projectUser?.user?.name,
        userLastName: projectUser?.user?.last_name,
        userMediaUrl: projectUser?.user?.media_url,
        userName: projectUser?.user?.name + " " + projectUser?.user?.last_name,
      });
    });

    res.json(OK, {
      totalCount: projectUserDetails.count,
      currentPage: page,
      pageSize,
      data: projectData,
      search,
    });
  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};


const updateStatus = async (req, res, next) => {
  const data = req.body;
  const { id } = req.params;
  let companyId = Request.GetCompanyId(req)

  if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "Project User id is Required" });
  }

  const projectUserDetails = await ProjectUser.findOne({ where: { id: id, company_id: companyId } });

  const updateData = {
      status: data.status
  };

  try {
      const save = await ProjectUser.update(updateData, { where: { id: id, company_id: companyId } });

      const getStatus=(status)=>{
           return status == true ? Projects.STATUS_ACTIVE :Projects.STATUS_INACTIVE
      }

      res.json(Response.UPDATE_SUCCESS, {
          message: "Project User Updated",
      });
      res.on("finish", async () => {
          History.create(`Project User Updated from ${getStatus(projectUserDetails?.status)} to ${getStatus(data.status)}"`, req, ObjectName.PROJECT_USER, save.id);
      })

  } catch (err) {
      console.log(err);
      res.json(Response.BAD_REQUEST, {
          message: err.message
      });
  }
}

const bulkCreate = async (params, company_id, res) => {
  try {
    const existingProjectUsers = await ProjectUser.findAll({
      where: {
        user_id: params?.userId,
      },
      attributes: ['user_id'],
    });

    const existingUserIds = existingProjectUsers.map(user => user?.user_id);

    const newUserIds = params?.userId.filter(id => !existingUserIds?.includes(id));

    if (newUserIds?.length === 0) {
      throw { message: "All Users already exist" }
    }

    const usersData = newUserIds?.map((id) => ({
      user_id: id,
      project_id: params?.projectId,
      status: params?.status === Projects.STATUS_ACTIVE ? Projects.STATUS_ACTIVE_VALUE : Projects.STATUS_INACTIVE_VALUES,
      company_id: company_id,
    }));

    const createResponse = await ProjectUser.bulkCreate(usersData);
    return createResponse;
  } catch (err) {
    console.log(err);
    return res.json(400, { message: err.message });
  }
};

module.exports = {
  create,
  // update,
  del,
  // Get,
  search,
  updateStatus,
  bulkCreate
};
