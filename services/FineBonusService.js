
const { Op, Sequelize, QueryTypes } = require("sequelize");

// Helpers
const ObjectName = require("../helpers/ObjectName");
const Response = require("../helpers/Response");
const Permission = require("../helpers/Permission");
const Status = require("../helpers/Status");
const Setting = require("../helpers/Setting");
const { OK, BAD_REQUEST, UPDATE_SUCCESS } = require("../helpers/Response");

// Lib
const Currency = require("../lib/currency");
const DateTime = require("../lib/dateTime");
const Request = require("../lib/request");
const Number = require("../lib/Number");
const String = require("../lib/string");
const Boolean = require("../lib/Boolean");
const validator = require("../lib/validator");

// Services
const History = require("./HistoryService");
const statusService = require("./StatusService");

// Models
const { User,FineBonus,status :statusModal,Tag ,Message, Attendance } = require("../db").models;
const db = require("../db");

const mediaService = require("./MediaService");
const TagService = require("./TagService");
const { getUserDetailById } = require("./UserService");
const { getSettingValue } = require("./SettingService");
const ArrayList = require("../lib/ArrayList");
const ObjectHelper = require("../helpers/ObjectHelper");
const Where = require("../lib/Where");
const fineType = require("../helpers/FineType");

class fineService {
    // Create a new paymentService
    static async create(req, res,next) {
        try {
          let data = req.body;
            if((req && req?.user && !data?.company_id)){
            const hasPermission = await Permission.Has(Permission.FINE_ADD, req);

            }

            let companyId;
            if(req && req?.user){
                companyId  = Request.GetCompanyId(req);
            }

            let objectName = data && data?.objectName ? data?.objectName : "";

            const statusData = await statusService.getFirstStatusDetail(objectName ? objectName : ObjectName.FINE,data?.company_id ? data?.company_id :  companyId);
            if(data && data.amount > 0){
            const createData = {
                date:data.date ? DateTime.UTCtoLocalTime(data.date) : DateTime.getSQlFormattedDate(new Date()),
                user:Number.Get(data.user),
                company_id: data?.company_id ? data?.company_id : companyId,
                type: Number.Get(data.type),
                amount: Number.GetFloat(data.amount),
                status: data?.status ? data?.status :statusData?.id,
                notes: data?.notes ? data.notes : null,
                due_date: data?.due_date ? data?.due_date:DateTime.getSQlFormattedDate(new Date()),
                reviewer: data?.reviewer ? data?.reviewer :statusData?.default_reviewer || null,
                object_name:data?.object_name?data?.object_name:null,
                object_id:data?.object_id?data?.object_id:null,
            }

            if(data?.createdAt){
              createData.createdAt = data?.createdAt
            }
            
            const detail = await FineBonus.create(createData);
            if(res){
              res.on('finish', async () => {
                  History.create("FineBonus added", req, ObjectName.FINE, detail.id);
              });
  
              res.json(OK, { message: "FineBonus added", id:detail.id });
            }else{
              History.create("FineBonus added", req, ObjectName.FINE, detail.id);
              return detail
            }
        }
        } catch (err) {
            console.log(err);
        }
    }

    // delete

    static async del(req, res) {
        try {
            const hasPermission = await Permission.Has(Permission.FINE_DELETE, req);

            const id = req.params.id;
            const company_id = Request.GetCompanyId(req);

            await FineBonus.destroy({ where: { id: id, company_id: company_id } });

            res.json(200, { message: 'FineBonus Deleted' });

            res.on('finish', async () => {
                History.create("FineBonus Deleted", req, ObjectName.FINE, id);
            });
        } catch (err) {
            console.log(err);
            return res.json(400, { message: err.message });
        }
    }

    //get

    static async get(req, res, next) {
        try {
            const { id } = req.params;
            const companyId = Request.GetCompanyId(req);
            if (!id) {
                return res.json(BAD_REQUEST, { message: "FineBonus Id is required" });
            }

            const fineDetail = await FineBonus.findOne({
                where: { id ,company_id:companyId},

            });

            if (!fineDetail) {
                return res.json(BAD_REQUEST, { message: "FineBonus Not found" });
            }
            const statusData = await statusService.getData(fineDetail?.status, companyId);

            let mediaDetail = await mediaService.getMediaURLByObjectId(id, ObjectName.FINE, companyId);

            const data = {
                id,
                date: fineDetail.date,
                statusName: statusData?.name,
                statusValue: statusData?.id,
                type: fineDetail?.type,
                user: fineDetail?.user,
                reviewer: fineDetail?.reviewer,
                amount: fineDetail?.amount,
                notes: fineDetail?.notes,
                media_url: mediaDetail && mediaDetail.media_url,
                mediaName:  mediaDetail && mediaDetail.detail && mediaDetail.detail.name,
                mediaId: mediaDetail && mediaDetail.detail && mediaDetail.detail.id,
                due_date:fineDetail?.due_date,
                object_id:fineDetail?.object_id,
                object_name:fineDetail?.object_name,


            }
            res.json(OK, { data: data })
        } catch (err) {
            console.log(err);
            return res.json(400, { message: err.message });
        }
    }

    // Update 
    static async update(req, res) {
        try {
            const hasPermission = await Permission.Has(Permission.FINE_EDIT, req);

            const companyId = Request.GetCompanyId(req);
            const { id } = req.params;
            const data = req.body;
            if (!id) {
                return res.json(BAD_REQUEST, { message: "FineBonus id is required" });
            }


            const finesDetail = await FineBonus.findOne({
                where: { id: id, company_id: companyId },
            });

            if (!finesDetail) {
                return res.json(BAD_REQUEST, { message: "Invalid fine id" });
            }
            const updateData = {
                id: id,
            };

            if (data?.date) {
                updateData.date = DateTime.getSQlFormattedDate(data?.date);
              }

              if (data?.type) {
                updateData.type = data?.type;
              }

              if (data?.amount ) {
                updateData.amount = data?.amount;
              }

              if (validator.isNotEmpty(data.notes)) {
                updateData.notes = data?.notes ? data?.notes : null;
              }

              if (data?.due_date || data?.due_date ==="") {
                updateData.due_date = DateTime.getSQlFormattedDate(data?.due_date) ? DateTime.getSQlFormattedDate(data?.due_date) : null;
              }
              
            if(data.user){
                updateData.user = Number.Get(data.user)
            }
            if(data.reviewer !== null){
                updateData.reviewer = Number.Get(data.reviewer)
            }

            if (data?.status) {
              updateData.status = Number.Get(data.status);
            }

             await FineBonus.update(updateData, { where: { id } });

            res.on("finish", async () => {
                this.createAuditLog (finesDetail, updateData,req,id);
            });

            return res.json(UPDATE_SUCCESS, {
                message: "FineBonus Updated",
                data: id
            });

        } catch (err) {
            console.log(err);
        }


    }

    //search
    static async search(req, res, next) {

        let { page, pageSize, search, sort, sortDir, pagination, status, user ,type ,startDate ,endDate, isBonusType, isFineType, showTotalAmount, orderDate} = req.query;

        let timeZone = Request.getTimeZone(req);
        
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
            return res.json(400, "Company Not Found")
        }

        
        // Sortable Fields
        const validOrder = ["ASC", "DESC"];
        const sortableFields = {
            id: "id",
            date: "date",
            type: "type",
            user_id: "user_id",
            reviewer: "reviewer",
            amount: "amount",
            status: "status",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        };

        const sortParam = sort || "updatedAt";

        // Validate sortable fields is present in sort param
        if (!Object.keys(sortableFields).includes(sortParam)) {
            return res.json(BAD_REQUEST, { message: `Unable to sort FineBonus by ${sortParam}` });
        }

        const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
        // Validate order is present in sortDir param
        if (!validOrder.includes(sortDirParam)) {
            return res.json(BAD_REQUEST, { message: "Invalid sort order" });
        }

        const data = req.query;

        const where = {};
        const statusWhere={};
        const hasFineManageOthersPermission = await Permission.Has(Permission.FINE_MANAGE_OTHERS, req);
        if (!hasFineManageOthersPermission) {
          let userId = req && req.user && req.user.id;

    
        where.user = userId;
        }

        if(Number.isNotNull(user)){
            where.user=user
        }
     
        if(Number.isNotNull(type)){
          Where.id(where,"type",type)
        }
        
        if (Number.isNotNull(req.query.object_name)) {
          where.object_name = req.query.object_name
        }

        if (Number.isNotNull(req.query.object_id)) {
          where.object_id = req.query.object_id
        }

   
      if (!hasFineManageOthersPermission) {
       
          if (Number.isNotNull(status)) {
            Where.id(where, "status", status)
          } else {
            if(isBonusType) {
              let completedStatusDetail = await statusService.getAllStatusByGroupId(ObjectName.BONUS, Status.GROUP_COMPLETED, companyId);

              let statusId = ArrayList.isArray(completedStatusDetail)? completedStatusDetail.map((value) =>value?.id):[]
   
              where.status = statusId ;

            }else{
              let completedStatusDetail = await statusService.getAllStatusByGroupId(ObjectName.FINE, Status.GROUP_COMPLETED, companyId);

              let statusId = ArrayList.isArray(completedStatusDetail)? completedStatusDetail.map((value) =>value?.id):[]

              where.status =  statusId;
            }
          }
      } else {
        Where.id(where, "status", status)
      }

        where.company_id = companyId;

        const searchTerm = search ? search.trim() : null;
        if (searchTerm) {
            where[Op.or] = [
                {
                    "$userDetails.name$": {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
                {
                    "$userDetails.last_name$": {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
                { 
                    [Op.and]: [
                      Sequelize.literal(`CONCAT("userDetails"."name", "userDetails"."last_name" ) iLIKE '%${searchTerm}%'`)
                    ]
                  }
            ];
        }

    let date = DateTime.getCustomDateTime(orderDate || req?.query?.date,timeZone)

      if (date && Number.isNotNull(orderDate || req?.query?.date)) {
      where.date = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
      }

        if (startDate && !endDate) {
            where.date = {
              [Op.and]: {
                [Op.gte]: startDate,
              },
            };
          }
      
          if (endDate && !startDate) {
            where.date = {
              [Op.and]: {
                [Op.lte]: endDate
              },
            };
          }
      
          if (startDate && endDate) {
            where.date = {
              [Op.and]: {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
              },
            };
          }

      
        const query = {
            attributes: { exclude: ["deletedAt"] },
            order: sortParam !== "user_id" ? [[sortParam, sortDirParam]] : [[{ model: User, as: "userDetails" }, 'name', sortDirParam]],
            include: [
                {
                    required: false,
                    model: User,
                    as: "userDetails",

                },
                {
                    required: false,
                    model: User,
                    as: "userData",

                },
                {
                    required: true,
                    model: statusModal,
                    as: "statusData",
                    where: statusWhere

                },

                {
                    required: false,
                    model: Tag,
                    as: "typeData",

                },
            ],
            where,
        };

        let params={
          company_id: companyId,
          user: hasFineManageOthersPermission ? Number.isNotNull(user) ? user : null : req.user.id ,
          type: Number.isNotNull(type) ? type : null,
          status:where.status,
          startDate: date?.startDate ? date?.startDate: startDate,
          endDate: date?.endDate ? date?.endDate: endDate,
          searchTerm,
          objectName: Number.isNotNull(req.query.object_name) ? req.query.object_name : null,
          objectId: Number.isNotNull(req.query.object_id) ? req.query.object_id : null
      } 

    // Ensure isBonusType is interpreted as a boolean
    if (!type && (isBonusType || isFineType)) {
      const tagList = await Tag.findAll({
        where: {
          company_id: companyId,
          type: isBonusType ? fineType.BONUS : fineType.FINE,
        },
      });

      if (!type && ArrayList.isArray(tagList)) {
        const tagIds = tagList.map((tag) => tag.dataValues.id);

        if (tagIds.length > 0) {
          params.type = tagIds
          where.type = { [Op.in]: tagIds };
        }
      }else if(!type){
        where.type=null
      }
    }


        if (validator.isEmpty(pagination)) {
            pagination = true;
        }
        if (Boolean.isTrue(pagination)) {
            if (pageSize > 0) {
                query.limit = pageSize;
                query.offset = (page - 1) * pageSize;
            }
        }

        try {
          
          let totalAmount = await this.getTotalAmount(params);
            const details = await FineBonus.findAndCountAll(query);
            if (details.count === 0) {
                return res.json({ message: "FineBonus not found" });
            }

            const data = [];
         
            details.rows.forEach((fineValue) => {
                const {
                    id,
                    date,
                    type,
                    userDetails,
                    userData,
                    amount,
                    notes,
                    typeData,
                    statusData,
                    totalAmount,
                    due_date,
                    object_name,
                    object_id,
                    createdAt
                } = fineValue.get();
                data.push({
                    id,
                    date,
                    type: typeData?.name,
                
                    firstName:userDetails?.name,
                    lastName:userDetails?.last_name,
                    user:String.concatName(userDetails ?.name,userDetails?.last_name),
                    media_url:userDetails?.media_url,
                    userId: userDetails?.id,
                    typeId:typeData?.id,
                    reviewerFirstName: userData?.name,
                    reviewerLastName: userData?.last_name,
                    reviewer:String.concatName(userData?.name,userData?.last_name) ,
                    reviewerMediaUrl:userData?.media_url,
                    reviewerId: userData?.id,
                    amount: amount,
                    notes:notes,
                    status: statusData?.name,
                    statusId : statusData?.id,
                    allow_edit: statusData?.allow_edit,
                    totalAmount:totalAmount,
                    statusColor : statusData.color_code,
                    due_date:due_date,
                    object_name:object_name,
                    object_id:object_id,
                    next_status_id: statusData?.next_status_id,
                    createdAt: DateTime.getDateTimeByUserProfileTimezone(createdAt,timeZone),
                    hasFineManageOthersPermission: hasFineManageOthersPermission
                  });
            });

            if(showTotalAmount){
              let lastReCord = ObjectHelper.createEmptyRecord(data[0]) 
              lastReCord.amount = totalAmount || "";
              data .push(lastReCord);
            }

            res.json(OK, {
                totalCount: details.count,
                currentPage: page,
                pageSize,
                data,
                search,
                sort,
                sortDir,
                totalAmount
            });

        } catch (err) {
            console.log(err);
            res.json(OK, { message: err.message });
        }
    }

  static async bulkupdate(req, res) {
    try {
      const hasPermission = await Permission.Has(Permission.FINE_EDIT, req);

      const companyId = Request.GetCompanyId(req);
      const data = req.body;

      let fineIds = data && data.fineIds.split(",");

      if (!fineIds || fineIds.length === 0) {
        return res.json(Response.BAD_REQUEST, {
          message: "FineBonus ids are required",
        });
      }

      for (const id of fineIds) {
        const finesDetail = await FineBonus.findOne({
          where: { id: id, company_id: companyId },
        });

        if (!finesDetail) {
          return res.json(Response.BAD_REQUEST, {
            message: `Invalid fine id: ${id}`,
          });
        }

        const updateData = {};

        if (data?.date) {
          updateData.date = data?.date;
        }

        if (data?.type) {
          updateData.type = data?.type;
        }

        if (data?.amount) {
          updateData.amount = data?.amount;
        }

        if (validator.isNotEmpty(data.notes)) {
          updateData.notes = data?.notes ? data?.notes : null;
        }

        if (data?.due_date || data?.due_date === "") {
          updateData.due_date = data?.due_date ? data?.due_date : null;
        }

        if (data.user) {
          updateData.user = Number.Get(data.user);
        }
        if (data.reviewer !== null) {
          updateData.reviewer = Number.Get(data.reviewer);
        }

        if (data?.status) {
          updateData.status = Number.Get(data.status);
        }

        await FineBonus.update(updateData, { where: { id } });

        res.on("finish", async () => {
          this.createAuditLog(finesDetail, updateData, req, id);
        });
      }

      return res.json(UPDATE_SUCCESS, {
        message: "Fines Updated",
        data: fineIds,
      });
    } catch (err) {
      console.log(err);
      return res.json(Response.BAD_REQUEST, {
        message: "An error occurred",
      });
    }
  }

    static updateStatus = async (req, res, next) => {
        const data = req.body;
        const { id } = req.params;
        let companyId = Request.GetCompanyId(req)

        // Validate Vendor id
        if (!id) {
            return res.json(Response.BAD_REQUEST, { message: "FineBonus id is required" });
        }
       
        // Update Vendor status
        const updateFine = {
            status: data.status,
        };
        let dueDate = await statusService.getDueDate(data.status,companyId);
        if(dueDate){
            updateFine.due_date = dueDate
        }

        try {
             await FineBonus.update(updateFine, { where: { id: id } });

             let statusData = await statusService.getData(data.status, companyId)

             if(statusData.group == Status.GROUP_APPROVED){
                const query = {
                    include: [
                        {
                            required: false,
                            model: Tag,
                            as: "typeData",
        
                        },
                    ],
                    where:{id:id, company_id:companyId}
                };
                const fineDetail = await FineBonus.findOne(query);

                const createData = {
                    user_id:req.user.id,
                    message: `New fine has been added. ${fineDetail?.typeData.name} - ${Currency.IndianFormat(fineDetail.amount)}`,
                    company_id: companyId,
                    object_name: ObjectName.MESSAGE,
                    reciever_user_id: fineDetail?.user
                  };
            await Message.create(createData);    
             }

            res.json(Response.UPDATE_SUCCESS, {
                message: "FineBonus Status Updated",
            });

            res.on("finish", async () => {
                History.create(`FineBonus Status Updated to ${statusData && statusData.name}`, req, ObjectName.FINE,id);


            })

            // API response

        } catch (err) {
            console.log(err);
            res.json(Response.BAD_REQUEST, {
                message: err.message
            });
        }
    }

    static async createAuditLog(olddata, updatedData, req, id) {
      let companyId = Request.GetCompanyId(req);
      let auditLogMessage = new Array();
  
      const oldTypeValue = await TagService.getName(olddata?.type, companyId);
      const newTypeValue = await TagService.getName(updatedData?.type, companyId);
  
      if (updatedData?.date && olddata?.date !== updatedData.date) {
        if (olddata?.date !== updatedData.date) {
          auditLogMessage.push(`Date Changed to ${DateTime.shortMonthDate(updatedData?.date)}\n`);
        }
      }
  
      if (oldTypeValue !== newTypeValue) {
        auditLogMessage.push(`Type Changed  ${newTypeValue}\n`);
      }
  
      if (updatedData?.amount && updatedData?.amount !== olddata.amount) {
        if (olddata?.amount !== updatedData?.amount) {
          auditLogMessage.push(`Amount Changed  ${updatedData?.amount}\n`);
        }
      }
  
      if (updatedData?.notes && olddata?.notes !== updatedData?.notes) {
        if (olddata?.notes !== updatedData?.notes) {
          auditLogMessage.push(`Notes Changed  ${updatedData?.notes}\n`);
        }
      }
  
      if (updatedData?.due_date && updatedData?.due_date !== olddata.due_date) {
        if (olddata?.due_date !== updatedData?.due_date) {
          auditLogMessage.push(`Due Date Changed  ${updatedData?.due_date}\n`);
        }
      }

      if (updatedData?.user && olddata.user !== updatedData?.user) {
        if (olddata.user !== updatedData?.user) {
          let user = await getUserDetailById(updatedData?.user, companyId);
          auditLogMessage.push(
            `User Changed  ${String.concatName(user?.name, user?.last_name)}\n`
          );
        }
      }
  
      if (updatedData?.reviewer && olddata.reviewer !== updatedData?.reviewer) {
        if (olddata.reviewer !== updatedData?.reviewer) {
          let reviewer = await getUserDetailById(
            updatedData?.reviewer,
            companyId
          );
          auditLogMessage.push(
            `Reviewer Changed  ${String.concatName(
              reviewer?.name,
              reviewer?.last_name
            )}\n`
          );
        }
      }
  
      if (updatedData?.status && olddata.status !== updatedData?.status) {
        if (olddata.status !== updatedData?.status) {
          let statusData = await statusService.getData(
            updatedData?.status,
            companyId
          );
          auditLogMessage.push(`Status Updated to  ${statusData?.name}\n`);
        }
      }
  
      if (auditLogMessage && auditLogMessage.length > 0) {
        let message = auditLogMessage.join();
        History.create(message, req, ObjectName.FINE, id);
      } else {
        History.create("FineBonus Updated", req, ObjectName.FINE, id);
      }
    }

    static async addFineForLateCheckIn   (req, res, next)  {
        let companyId = Request.GetCompanyId(req);
    
        let userDefaultTimeZone = Request.getTimeZone(req);

        let todayDate = DateTime.getSQlFormattedDate(DateTime.getTodayDate(userDefaultTimeZone));
        let start_date = DateTime.toGetISOStringWithDayStartTime(new Date())
        let end_date = DateTime.toGetISOStringWithDayEndTime(new Date())
    
        let attendanceList = await Attendance.findAll({
            where: {
                company_id: companyId,
                date: todayDate,
                late_hours: {
                    [Op.gt]: 10
                }
            },
            attributes: ["user_id", "late_hours"],
        });
    
    
        if (attendanceList && attendanceList.length > 0) {
            for (let i = 0; i < attendanceList.length; i++) {
                const { user_id, late_hours } = attendanceList[i];
                let type = await getSettingValue(Setting.ATTENDANCE_LATE_CHECK_IN_FINE_TYPE, companyId);
                if (Number.isNotNull(type)) {
    
                    const isFineExites = await FineBonus.findOne({
                        where: {
                            user: user_id ,
                             type: type,
                              company_id:companyId,
                              createdAt: {
                                [Op.and]: {
                                  [Op.gte]: DateTime.toGMT(start_date,userDefaultTimeZone),
                                  [Op.lte]: DateTime.toGMT(end_date,userDefaultTimeZone),
                                },
                              },
                            },
                    });
    
                    if(!isFineExites){
                        const tagDetail = await Tag.findOne({
                            where: { id: type,  company_id: companyId },
                        });
                        if (Number.isNotNull(tagDetail)) {
                            let default_amount = Number.isNotNull(tagDetail?.default_amount) ? tagDetail?.default_amount : late_hours ;
                            let createData = {
                                user: user_id,
                                type: type,
                                amount: default_amount,
                                company_id: companyId,
                            };
                            await fineService.create({ body: createData }, null, null);
                        }
                    }
                }
            }
        }
    };

  static async bulkDelete(req, res) {
    try {
      const ids = req?.body?.selectedId;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid IDs provided" });
      }
  
      const company_id = Request.GetCompanyId(req);
  
      for (const id of ids) {
        await FineBonus.destroy({ where: { id: id, company_id: company_id } });

        await History.create("FineBonus Deleted", req, ObjectName.FINE, id);
      }
  
      res.json(200, { message: 'FineBonus Deleted' });
  
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }
  
    static async getTotalAmount (params){

      let whereCondition=""
      
      params?.status ? whereCondition += ` AND "fine_bonus".status IN (${params?.status})` :""
      params?.user ? whereCondition +=  ` AND "fine_bonus"."user" = ${params?.user}` :""
      params?.type ? whereCondition += ` AND "fine_bonus"."type" IN (${params?.type})` :""
      params?.startDate ? whereCondition += ` AND "fine_bonus"."date" >= '${params?.startDate}'` : ""
      params?.endDate ? whereCondition += ` AND "fine_bonus"."date" <= '${params?.endDate}'` : ""
      params?.objectName ? whereCondition += ` AND "fine_bonus"."object_name" = '${params?.objectName}'` : ""
      params?.objectId ? whereCondition += ` AND "fine_bonus"."object_id" = ${params?.objectId}` : ""
      params?.searchTerm && isNaN(Number.Get(params?.searchTerm)) ? 
      whereCondition += ` AND CONCAT("user"."name", ' ', "user"."last_name") ILIKE '%${params?.searchTerm}%'` : ""      
        const rawQuery = `
        SELECT COALESCE(SUM("fine_bonus"."amount"),0) AS "totalAmount"
        FROM "fine_bonus"
        LEFT JOIN "user" ON "fine_bonus"."user" = "user"."id"
        WHERE "fine_bonus"."company_id"=${params?.company_id}
        AND "fine_bonus"."deletedAt" IS NULL
        ${whereCondition}
        `;
      
        const totalAmountResult = await db.connection.query(rawQuery, {
          type: QueryTypes.SELECT,
        });
      
        const totalAmount1 = totalAmountResult && totalAmountResult[0].totalAmount;
        return totalAmount1
      }

}

module.exports = {
    fineService
};
