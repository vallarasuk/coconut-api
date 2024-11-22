const Request = require("../lib/request");
const DateTime = require("../lib/dateTime");
// Models
const {
    StockEntry,
    Tag,
    productTag,
    StockEntryProduct,
    storeProduct,
    status: statusModel,
    Location,
    User,
    Shift
} = require("../db").models;

const Permission = require("../helpers/Permission");
const TagStatus = require("../helpers/TagStatus");
const Tags = require("../helpers/Tag");
const ObjectName = require("../helpers/ObjectName");
const stockEntry = require("../helpers/StockEntry");
const History = require("./HistoryService");
const Response = require("../helpers/Response");
const { Op } = require("sequelize");
const StoreProductService = require('../service/storeProductService')
const StatusService = require("./StatusService");
const Boolean = require("../lib/Boolean");
const DataBaseService = require("../lib/dataBaseService");
const stockEntryService = new DataBaseService(StockEntry);
const productTagService = new DataBaseService(productTag);
const tagService = new DataBaseService(Tag);
const stockEntryProductService = new DataBaseService(StockEntryProduct);
const storeProductService = new DataBaseService(storeProduct);
const statusService = new DataBaseService(statusModel);
const validator = require(".././lib/validator")

const Status = require('../helpers/Status');
const TeamMemberService = require("./TeamMemberService");
const Number = require("../lib/Number");
const { getUserDetailById } = require("./UserService");
const String = require("../lib/string");

const createDefaultTagProduct = async (companyId, stockEntryDetail, storeId) => {
    try {

        if (companyId && stockEntryDetail && storeId) {

            let defaultTag = await tagService.findOne({
                where: {
                    company_id: companyId,
                    name: Tags.DEFAULT,
                    status: TagStatus.ACTIVE
                }
            })

            if (defaultTag) {

                const { id } = defaultTag;

                let productList = await productTagService.find({
                    where: {
                        tag_id: id,
                        company_id: companyId
                    }
                })

                if (productList && productList.length > 0) {
                    for (let i = 0; i < productList.length; i++) {

                        let isStoreProductExist = await storeProductService.findOne({
                            where: {
                                store_id: storeId,
                                product_id: productList[i].product_id,
                                company_id: companyId
                            }
                        })

                        if (isStoreProductExist) {
                            let stockProductEntryObject = {
                                stock_entry_id: stockEntryDetail.id,
                                company_id: companyId,
                                product_id: isStoreProductExist.id
                            }
                            await stockEntryProductService.create(stockProductEntryObject);
                        }
                    }
                }
            }
        }

    } catch (err) {
        console.log(err);
    }
}

const create = async (params) => {
  try {
    let { storeId, date, companyId, owner_id, shiftId } = params;

    let query = {
      order: [["createdAt", "DESC"]],
      where: {
        company_id: companyId,
      },
      attributes: ["stock_entry_number"],
    };
    let lastStockEntryData = await stockEntryService.findOne(query);

    let stock_entry_number;
    let stockEntryNumberData = lastStockEntryData && lastStockEntryData.get('stock_entry_number');

    if (!stockEntryNumberData) {
      stock_entry_number = 1;
    } else {
      stock_entry_number = stockEntryNumberData + 1;
    }

    const status = await statusService.findOne({
      where: {
        company_id: companyId,
        name: stockEntry.STATUS_DRAFT_TEXT,
        object_name: ObjectName.STOCK_ENTRY,
      },
    });
    // create stock entry create object
    let stockCreateData = {
      company_id: companyId,
      store_id: storeId,
      owner_id: owner_id,
      date: date ? date : DateTime.UTCtoLocalTime(new Date()),
      stock_entry_number: stock_entry_number,
      status: status.id,
      shift_id: shiftId ? shiftId :null
    };

    // create stock entry
    let stockDetails = await stockEntryService.create(stockCreateData);
    return stockDetails;
  } catch (err) {
    console.log(err);
  }
};

const createAuditLog = async (oldData, updatedData, req, id) => {
    let companyId = Request.GetCompanyId(req);
    let auditLogMessage = [];

    if (Number.Get(updatedData?.store_id) !== Number.Get(oldData?.store_id)) {
        let locationName = await Location.findOne({
          where: { id: updatedData.store_id },
        });
        auditLogMessage.push(`Store Updated To ${locationName.name}\n`);
      }

    if (updatedData?.due_date && updatedData?.due_date !== oldData.due_date) {
        if (oldData?.due_date !== updatedData?.due_date) {
          auditLogMessage.push(`Due Date Changed To ${DateTime.shortMonthDate(updatedData?.due_date)}\n`);
        }
      }

    if (updatedData?.date && updatedData?.date !== oldData.date) {
        if (oldData?.date !== updatedData?.date) {
          auditLogMessage.push(`Date Changed To ${DateTime.shortMonthDate(updatedData?.date)}\n`);
        }
    }

    if (Number.Get(updatedData?.owner_id) && Number.Get(oldData.owner_id) !== Number.Get(updatedData?.owner_id)) {
        if (Number.Get(oldData.owner_id) !== Number.Get(updatedData?.owner_id)) {
          let owner_id = await getUserDetailById(updatedData?.owner_id, companyId);
          auditLogMessage.push(
            `Owner Changed To ${String.concatName(owner_id?.name, owner_id?.last_name)}\n`
          );
        }
    }

    if (updatedData?.status && oldData.status !== updatedData?.status) {
        if (oldData.status !== updatedData?.status) {
          let statusData = await StatusService.getData(
            updatedData?.status,
            companyId
          );
          auditLogMessage.push(`Status Updated to  ${statusData?.name}\n`);
        }
      }
  
    if (auditLogMessage.length > 0) {
        let message = auditLogMessage.join('');
        History.create(message, req, ObjectName.STOCK_ENTRY, id);
    } else {
        History.create("Stock Entry Updated", req, ObjectName.STOCK_ENTRY, id);
    }
};


  const update = async (req, res) => {
    const Id = req.params.id;

    try {
        // get company Id from request
        let body = req.body;

        const company_id = Request.GetCompanyId(req);

        let stockEntryExist = await stockEntryService.findOne({
            where: {
                id: Id,
                company_id: company_id
            }
        });
        
        if (!stockEntryExist) {
            return res.json(Response.BAD_REQUEST, { message: "Stock Entry Not Found" });
        }

        // create stock entry create object
        let stockEntryUpdateData = new Object();

        if (body.status) {
            stockEntryUpdateData.status = body.status;
            let dueDate = await StatusService.getDueDate(body.status,company_id);
            if(dueDate){
                stockEntryUpdateData.due_date = dueDate
            }
        }

        if (body.storeId) {
            stockEntryUpdateData.store_id = Number.isNotNull(body.storeId) ? body.storeId:null;

        }
        if (body.shift) {
            stockEntryUpdateData.shift_id = Number.isNotNull(body.shift) ? body.shift:null;
        }

        if (body.date) {
            stockEntryUpdateData.date = body.date;
        }
        if (body.owner) {
            stockEntryUpdateData.owner_id = Number.isNotNull(body.owner) ? body.owner:null;
        }

        if(body.due_date){
            stockEntryUpdateData.due_date = DateTime.isValidDate(body.due_date)? body.due_date:null ;
        }

        // create stock entry
        await stockEntryService.update(stockEntryUpdateData, {
            where: {
                id: Id,
                company_id: company_id
            }
        });

        let updateData={}

        if(Number.isNotNull(body.owner)){
            updateData.owner_id = body.owner
        }

        if(Number.isNotNull(body.storeId)){
            updateData.store_id = body.storeId
        }


        // create stock entry
        await stockEntryProductService.update(updateData, {
            where: {
                stock_entry_id: Id,
                company_id: company_id
            }
        });
        // return response
        res.json(Response.UPDATE_SUCCESS, { message: "Stock Entry Updated" });

        // res on finish
        res.on("finish", async () => {
            await createAuditLog(stockEntryExist, { ...stockEntryExist.dataValues, ...stockEntryUpdateData }, req, Id);
        });
    } catch (err) {
        console.log(err);
        return res.json(Response.BAD_REQUEST, { message: err.message });
    }
};


const search = async (req, res) => {
    try {
        
  const companyId = Request.GetCompanyId(req);

    if (!companyId) {
      return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
    }


    
        // get params
        const params = req.query;
        // destrcuture the params
        let {
            page,
            pageSize,
            search,
            sort,
            sortDir,
            pagination,
            location,
            startDate,
            endDate,
            owner,
            user,
            status,
            shift_id,
            shift
        } = params;

        let timeZone = Request.getTimeZone(req);

        const stockEntryManageOthersPermission = await Permission.Has(Permission.STOCK_ENTRY_MANAGE_OTHERS, req);
        // get company Id from request
        // Validate if page is not a number
        page = page ? parseInt(page, 10) : 1;
        if (isNaN(page)) {
            throw {
                message: "Invalid page"
            };
        }
        // Validate if page size is not a number
        pageSize = pageSize ? parseInt(pageSize, 10) : 25;
        if (isNaN(pageSize)) {
            throw {
                message: "Invalid page size"
            };
        }
        const validOrder = ["ASC", "DESC"];
        const sortableFields = {
            id: "id",
            date: "date",
            stock_entry_number: "stock_entry_number",
            location: "location",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
            owner : "owner",
            shift_id: "shift_id"
        };
        
        const sortParam = sort  ? sort : "createdAt";
        if (!Object.keys(sortableFields).includes(sortParam)) {
            throw {
                message: `Unable to sort Location by ${sortParam}`
            };
        }
        const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
        // Validate order is present in sortDir param
        if (!validOrder.includes(sortDirParam)) {
            throw {
                message: "Invalid sort order"
            };
        }
        // crete where objecr
        let where = new Object();
        // create location detail where object
        let storeDetailsWhere = new Object();
        // update company Id in where
        where.company_id = companyId;

        if (!stockEntryManageOthersPermission) {
            let teamMemberList = await TeamMemberService.getListByUserId(req?.user?.id,companyId);
            let teamMemberIds = teamMemberList && teamMemberList.length > 0 && teamMemberList.map((data)=> data?.team_user_id);
            if(teamMemberIds && teamMemberIds.length >0){
                where.owner_id = {
                    [Op.in]:[req.user.id,...teamMemberIds]
                };
            }else{
                where.owner_id = req.user.id;
            }
        }

        if (location) {
            where.store_id = location;
        }

        if (owner) {
            where.owner_id = owner;
        }

        if (shift) {
            where.shift_id = shift;
        }

        if (status) {
            where.status = status;
        }

        let date = DateTime.getCustomDateTime(req?.query?.date, timeZone)

        if (date && Number.isNotNull(req?.query?.date)) {
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
                    [Op.lte]: endDate,
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
        if(user){
            where.owner_id = user;
        }

        let order = []
        if (sort === "owner") {
            order.push(
                [{ model: User, as: 'user' }, 'name', sortDirParam]
            )
        }
         if (sort === "location") {

            order.push(
                [{ model: Location, as: 'locationDetails' }, 'name', sortDirParam]
            )
        }
        if (sort !== "owner" && sort!=="location" && sort) {
            order.push([sortParam, sortDirParam])
        }
        const query = {
            attributes: {
                exclude: ["deletedAt"]
            },
            order,
            where
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
        // Search term
        const searchTerm = search ? search.trim() : null;
        // validate search term exist or not
        if (searchTerm) {
            storeDetailsWhere[Op.or] = [{
                name: {
                    [Op.iLike]: `%${searchTerm}%`
                }
            },];
        }
        // append the include
        query.include = [
            {
                required: true,
                model: Location,
                where: storeDetailsWhere,
                as: "locationDetails"
            }, {
                required: false,
                model: User,
                as: "user",
                attributes: ["name","media_url","last_name"]

            }, {
                required: false,
                model: statusModel,
                as: 'statusDetail'
            },
            {
                required: true,
                model: Shift,
                as: "shiftDetail",
            },
        ];

        const dateTime = new DateTime();

        // Get stock entry list and count
        const stockEntryList = await stockEntryService.findAndCount(query);
        // create stock entry data
        const stockEntryData = [];
        // get stocke ntry list
        let stockEntryListData = stockEntryList && stockEntryList.rows;
        // validate stock entry list exist or noit
        if (stockEntryListData && stockEntryListData.length > 0) {
            // loop the stock entry list
            for (let i = 0; i < stockEntryListData.length; i++) {
                // destructure the stock entry list
                const {
                    id,
                    date,
                    createdAt,
                    updatedAt,
                    locationDetails,
                    stock_entry_number,
                    user,
                    statusDetail,
                    due_date,
                    shiftDetail
                } = stockEntryListData[i];

                // get product count

                const data = {
                    id,
                    store_id: locationDetails ? locationDetails.id : null,
                    stock_entry_number: stock_entry_number,
                    location: locationDetails?.name,
                    status: statusDetail?.name,
                    statusId: statusDetail && statusDetail.id,
                    statusColor:statusDetail?.color_code,
                    date: date,
                    owner_first_name: user?.name,
                    owner_last_name:user?.last_name,
                    media_url : user ?.media_url,
                    company_id: companyId,
                    due_date: due_date,
                    shift: shiftDetail?.name,
                    shiftId: shiftDetail?.id,
                };

                // Formate Object Property
                data.createdAt = createdAt,
                    dateTime.formats.shortMonthDateAndTime
                data.updatedAt = updatedAt,
                    dateTime.formats.shortMonthDateAndTime

                // pusht eh stock entry data
                stockEntryData.push(data);
            }
        }
        // return response
        return res.json(Response.OK, {
            totalCount: stockEntryList.count,
            currentPage: page,
            pageSize,
            data: stockEntryData,
            sort,
            sortDir
        });
    } catch (err) {
        console.log(err);
        return res.json(Response.BAD_REQUEST, { message: err.message });
    }
};


async function get(req, res, next) {

    const { id } = req.params;

    try {
        const company_id = Request.GetCompanyId(req);

        if (!id) {
            return res.json(Response.BAD_REQUEST, { message: "Invalid Id" });
        }

        const StockEntryData = await stockEntryService.findOne({
            where: {
                id: id,
                company_id: company_id
            }
        });

        if (!StockEntryData)
            return res.json(Response.OK, { message: "No Records Found" });

        let {
            store_id,
            date,
            stock_entry_number,
            status,
            owner_id,
            due_date,
            shift_id
        } = StockEntryData.get();

        const statusData = await statusService.findOne({
            where: {
                company_id: company_id,
                id: status
            }
        });

        let data = {
            stock_entry_number,
            store_id,
            date,
            status: statusData?.name,
            statusId: statusData && statusData.id,
            owner_id,
            due_date: DateTime.isValidDate(due_date) ? due_date : "",
            shift_id
        };
        res.json(Response.OK, data);
    } catch (err) {
        console.log(err);
    }
}

const del = async (req, res) => {
    // validate permission exiist or not
    const hasPermission = await Permission.GetValueByName(Permission.STOCK_ENTRY_DELETE, req.role_permission);

 
    let stockEntryId = req.params.id;

    try {
        // get company Id from request

        // get company Id from request
        const companyId = Request.GetCompanyId(req);

        // validate stock entry Id exist or not
        if (!stockEntryId) {
            return res.json(Response.BAD_REQUEST, { message: "Stock Entry Id is required" });
        }

        // delete stock entry
        await stockEntryService.delete({
            where: {
                id: stockEntryId,
                company_id: companyId
            }
        });

        res.json(Response.DELETE_SUCCESS, { message: "Stock Entry Deleted" });

        res.on("finish", async () => {
            // create system log for product updation
            History.create("StockEntry deleted", req, ObjectName.STOCK_ENTRY, stockEntryId);
        });

    } catch (err) {
        console.log(err);
        return res.json(Response.BAD_REQUEST, { message: err.message });
    }
}

const updateStatus = async (req, res, next) => {
    const hasPermission = await Permission.GetValueByName(Permission.STOCK_ENTRY_STATUS_UPDATE, req.role_permission);

   

    const data = req.body;
    const { id } = req.params;

    let company_id = Request.GetCompanyId(req)

    try {
        const save = await stockEntryService.update(data, {
            where: {
                id,
                company_id
            }
        });

        // API response
        res.json(Response.UPDATE_SUCCESS, {
            message: "StockEntry Updated",
            data: save
        });

        res.on("finish", async () => {
            History.create("Stock Entry Updated", req, ObjectName.STOCK_ENTRY, id);
        });

    } catch (err) {
     console.log(err);
        History.create(`StockEntry Updation error - ${err.message
            }`, req, ObjectName.STOCK_ENTRY, id);

        res.json(Response.BAD_REQUEST, { message: err.message })
    }
};

const updateStoreProductQuantity = async (stockEntryId, companyId) => {
    try {

        let stockEntryDetail = await StockEntry.findOne({
            where: { company_id: companyId, id: stockEntryId }
        })

        if (stockEntryDetail && stockEntryDetail.store_id) {

            let stockEntryProductList = await StockEntryProduct.findAll({
                where: { company_id: companyId, stock_entry_id: stockEntryId }
            })

            if (stockEntryProductList && stockEntryProductList.length > 0) {

                for (let i = 0; i < stockEntryProductList.length; i++) {

                    const { product_id, quantity } = stockEntryProductList[i];

                    let storeProductExist = await storeProduct.findOne({
                        where: { product_id: product_id, store_id: stockEntryDetail.store_id }
                    })

                    if (storeProductExist && quantity >= 0) {
                        StoreProductService.update(quantity, product_id, companyId, stockEntryDetail.store_id)
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
}

const getStockEntryById = async (id, status, locationId, companyId) => {
    try{

        let where={}
        where.company_id = companyId

        if(id){
            where.id = id
        }

        if(locationId){
            where.store_id = locationId
        }

        if(status){
            where.status = status
        }
   
    let stockEntryDetail = await StockEntry.findOne({
        where: where,
        order: [["createdAt", "DESC"]],
    })

    return stockEntryDetail;
}catch(err){
    console.log(err);
}

}

module.exports = {
    search,
    create,
    get,
    update,
    updateStatus,
    del,
    getStockEntryById
};
