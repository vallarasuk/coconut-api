// Model
const { Media: MediaModel, Tag } = require("../../db").models;
const { Op } = require("sequelize");
// Lib
const Request = require("../../lib/request");
const { Media } = require("../../helpers/Media");
const { getMediaUrl, defaultDateFormat } = require("../../lib/utils");
//  Constants
const Permission = require("../../helpers/Permission");
const MediaStatusConstants = require("../../helpers/MediaStatus");
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator")
const MediaService = require("../../services/MediaService");
const Number = require("../../lib/Number");
const { BAD_REQUEST } = require("../../helpers/Response");

async function search(req, res, next) {
  const hasPermission = await Permission.Has(Permission.MEDIA_VIEW, req);

 
  try {
    let {
      page,
      pageSize,
      search,
      sort,
      sortDir,
      pagination,
      visibility,
      status,
      objectName,
      object_id,
      storeId
    } = req.query;
    const company_id = Request.GetCompanyId(req);

    if (Object.keys(req.query).includes("object_id") && !Number.isNotNull(object_id)) {
      return res.json(BAD_REQUEST, { message: "Object Id is Required" })
    }

    // if (!object_id) return res.send(404, { message: "Media Id required" });
    object_id = parseInt(object_id) ? object_id : null
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      throw { message: "Invalid page" };
    }
    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      throw { message: "Invalid page size" };
    }
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id: "id",
      name: "file_name",
      status: "status",
      object_name: "object_name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    };
    const sortParam = sort || "name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      throw { message: `Unable to sort product by ${sortParam}` };
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      throw { message: "Invalid sort order" };
    }
    let where = {};
    where.company_id = company_id;
    if (storeId) {
      where.store_id = storeId;
    }

    if (object_id) {
      where.object_id = object_id
    }
    if (objectName) {
      where.object_name = objectName;
    }


    if (visibility == Media.VISIBILITY_PUBLIC) {
      where.visibility = 1;
    } else if (visibility == Media.VISIBILITY_PRIVATE) {
      where.visibility = 2;
    } else if (visibility == Media.VISIBILITY_ARCHIEVE) {
      where.visibility = 3;
    }

    let query = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      where,
      order: [[sortableFields[sortParam], sortDirParam]],
      include: [
        {
          model: Tag,
          as: "tagDetail",
          required: false,
        },
      ],
    };
    if (validator.isEmpty(pagination)) {
      pagination = true;
    }
    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    page = page ? parseInt(page, 10) : 1;

    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    // Search by term
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

    let mediaDetail = await MediaModel.findAndCountAll(query);

    if (!mediaDetail) return res.send(204, { message: "Data Not Found" });

    if (mediaDetail && mediaDetail.count === 0) return res.json(204, null);

    let data = [];

    let mediaList = mediaDetail.rows;

    for (let i = 0; i < mediaList.length; i++) {

      const values = mediaList[i];

      const { feature, file_name, id, status, visibility, object_name, object_id, name, tag_id, tagDetail } = values;


      data.push({
        visibility: visibility,
        url: await MediaService.getMediaURL(id, company_id),
        object_name: object_name,
        tag_id: tag_id,
        typeName: tagDetail ? tagDetail?.name : "",
        name: name,
        file_name: file_name,
        feature: feature,
        object_id: object_id,
        createdAt: defaultDateFormat(values.createdAt),
        id: id,
        status: status == Media.STATUS_ACTIVE ? Media.STATUS_ACTIVE_TEXT : status == Media.STATUS_INACTIVE ? Media.STATUS_INACTIVE_TEXT : ""
      });
    }

    res.send(200, {
      totalCount: mediaDetail.count,
      currentPage: page,
      pageSize,
      data: data,
      sort,
      sortDir,
      search,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
}

module.exports = search;
