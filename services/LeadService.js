const { Op } = require("sequelize");
const ObjectName = require("../helpers/ObjectName");
const Response = require("../helpers/Response");
const Request = require("../lib/request");
const History = require("./HistoryService");
const { Lead, status:statusModel, User :user } = require("../db").models;
const validator = require("../lib/validator");
const Boolean = require("../lib/Boolean");
const  statusService  = require("./StatusService");
const Permission = require("../helpers/Permission");
const Number = require("../lib/Number");

class LeadService {
  static async create(req, res, next) {
    const companyId = Request.GetCompanyId(req);
    const userId = Request.getUserId(req);


    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Id Not Found" });
    }
    let data = req.body;

    let createData = {
      name: data?.name ? data?.name : "",
      date: data?.date ? data?.date : "",
      notes: data?.notes ? data?.notes : "",
      mobile: data?.mobile ? data?.mobile : "",
      designation : data ?.designation ? data?.designation : "",
      company_id: companyId,
      owner_id : userId,
      status: await statusService.getFirstStatus(ObjectName.LEAD,companyId)
    };

    Lead.create(createData).then((leadDetail) => {
      res.on("finish", async () => {
        History.create("Lead added", req, ObjectName.LEAD, leadDetail.id);
      });
      res.json(Response.OK, { message: "Lead added", id: leadDetail?.id, status : leadDetail?.status });
    });
  }

  static async search(req, res, next) {
    let { page, pageSize, search, sort, sortDir, pagination } = req.query;

    const leadMangeOthers = await Permission.Has(Permission.LEADS_MANAGE_OTHERS, req);


    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }

    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }

    const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(Response.BAD_REQUEST, "Company Not Found");
    }

   
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      date: "date",
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      mobile: "mobile",
      notes: "notes",
      id: "id",
    };

    const sortParam = sort || "createdAt";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(Response.BAD_REQUEST, { message: `Unable to sort payments by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const where = {};

    where.company_id = companyId;
    if (!leadMangeOthers) {
      where.owner_id = req.user.id;
  }


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
      order: [[sortParam, sortDirParam]],
        include: [
          {
            required: false,
            model: statusModel,
            as: "statusDetail",
          },
          {
            required: false,
            model: user,
            as: "userDetails",
          },
        ],
      where,
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

    const leadDetails = await Lead.findAndCountAll(query);

    if (leadDetails.count === 0) {
      return res.json({ message: "Lead not found" });
    }

    const data = [];

    for (let i in leadDetails.rows) {
      let { id, name, mobile, date, status, notes ,owner_id,designation, statusDetail ,userDetails} = leadDetails.rows[i];

      let list = {
        id,
        name,
        mobile_number: mobile,
        date,
        status,
        designation,
        owner_id,
        first_name : userDetails && userDetails?.name,
        last_name : userDetails && userDetails?.last_name,
        image_Url : userDetails && userDetails?.media_url,
        status_name:statusDetail && statusDetail?.name,
        status : statusDetail && statusDetail?.id,
        color_code: statusDetail && statusDetail?.color_code,
        notes,
      };

      data.push(list);
    }
    res.json(Response.OK, {
      totalCount: leadDetails.count,
      currentPage: page,
      pageSize,
      data,
      search,
      sort,
      sortDir,
    });
  }

  static async update(req, res, next) {
    try{
    const { id } = req.params;
    const companyId = Request.GetCompanyId(req);
    let data = req.body;

    if (!id) {
      return res.json(Response.BAD_REQUEST, { message: "Lead id is required" });
    }


    const leadDetail = await Lead.findOne({
      where: { id: id, company_id: companyId },
    });
   

    if (!leadDetail) {
      return res.json(Response.BAD_REQUEST, { message: "Lead Not Found" });
    }

    let updateData = {
      name: data?.name ? data?.name : "",
      date: data?.date ? data?.date : null,
      notes: data?.notes ? data?.notes : "",
      mobile: data?.mobile ? data?.mobile : "",
      designation : data ?.designation ? data?.designation : "",
      owner_id : Number.Get(data ?.owner_id),
      status: data?.status?.value ? Number.Get(data?.status?.value) : Number.Get(data?.status)
    };

    Lead.update(updateData, { where: { id: id, company_id: companyId } }).then((response) => {
      res.json({ message: "Lead Updated" });
      res.on("finish", async () => {
        this.createAuditLog(data, leadDetail, req, id);
      });
    });
  } catch (err) {
    req.log.error(err);
    console.log(err);
    return next(err);
  }
}

  static async createAuditLog(updatedData, olddata, req, id) {
    let auditLogMessage = new Array();

    if (updatedData?.name && updatedData?.name !== olddata.name) {
      auditLogMessage.push(`Name Changed to ${updatedData?.name}\n`);
    }
    if (updatedData?.date && updatedData?.date !== olddata.date) {
      auditLogMessage.push(`Date Changed to ${updatedData?.date}\n`);
    }
    if (updatedData?.notes && updatedData?.notes !== olddata.notes) {
      auditLogMessage.push(`Notes Changed to ${updatedData?.notes}\n`);
    }
    if (updatedData?.mobile && updatedData?.mobile !== olddata.mobile) {
      auditLogMessage.push(`Mobile Changed to ${updatedData?.mobile}\n`);
    }
    if (auditLogMessage && auditLogMessage.length > 0) {
      let message = auditLogMessage.join();
      History.create(message, req, ObjectName.LEAD, id);
    } else {
      History.create("Lead Updated", req, ObjectName.LEAD, id);
    }
  }

  static async get(req, res, next) {
    try {
      const { id } = req.params;

      let companyId = Request.GetCompanyId(req);

      if (!id) {
        return res.json(Response.BAD_REQUEST, { message: "Lead id is required" });
      }

      const leadDetail = await Lead.findOne({
        where: { id:id,company_id:companyId },
        include: [
            {
              required: false,
              model: statusModel,
              as: "statusDetail",
            },
          ],
      });
 
    
      if (!leadDetail) {
        return res.json(BAD_REQUEST, { message: "Lead not found" });
      }

      const data = {
        id:leadDetail?.id,
        name:leadDetail?.name ,
        mobile:leadDetail?.mobile ,
        date: leadDetail?.date,
        status: leadDetail && leadDetail?.statusDetail && leadDetail?.statusDetail?.id,
        status_name: leadDetail && leadDetail?.statusDetail && leadDetail?.statusDetail?.name,
        notes: leadDetail?.notes,
      };
      return res.json(Response.OK, { data: data });
    } catch (err) {
      console.log(err);
      return res.json(400, { message: err.message });
    }
  }

  static async statusUpdate(req, res, next) {
    let id = req?.params?.id;
    let data = req?.body?.status;

    const companyId = Request.GetCompanyId(req);

    
    const leadDetail = await Lead.findOne({ where: { id: id, company_id: companyId } });
    const statusData = await statusService.getData(leadDetail?.status, companyId);

    let nextStatusId = null;
    
    if (statusData && statusData.next_status_id) {
      const nextStatusIds = statusData.next_status_id.split(',');
      if (nextStatusIds.length > 0) {
        nextStatusId = nextStatusIds[0];
      }
    }
    
    let updateData = {
      status: nextStatusId !== null ? nextStatusId : data?.status,
    };
    

    if (!leadDetail) {
      return res.json(Response.BAD_REQUEST, { message: "Lead Details Not Found" });
    }

   
  
    leadDetail.update(updateData).then((response) => {
      res.json(200, { message: "Lead Updated" });
      res.on("finish", async () => {
        History.create(`Status updated to ${statusData.name}`, req, ObjectName.LEAD, id);
      });
    });
  }

  static async del(req, res) {
    try {
   
      const id = req?.params?.id;
      const company_id = Request.GetCompanyId(req);

      await Lead.destroy({ where: { id: id, company_id: company_id } });

      res.json(200, { message: "Lead Deleted" });

      res.on("finish", async () => {
        History.create("Lead Deleted", req, ObjectName.LEAD, id);
      });
    } catch (err) {
      return res.json(400, { message: err.message });
    }
  }
}

module.exports = LeadService;
