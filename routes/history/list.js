// Models
const { History, User:UserModel } = require("../../db").models;

const { BAD_REQUEST, OK } = require("../../helpers/Response");

const DateTime = require("../../lib/dateTime");

const { Op } = require("sequelize");

const Request = require("../../lib/request");
const Permission = require("../../helpers/Permission");
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator")

const dateTime = new DateTime();
const User = require("../../helpers/User");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");

/**
 * system log search route
 */
async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.HISTORY, req);


    let { page, pageSize, search, sort, sortDir, pagination, objectName, objectId, user, date, startDate, endDate } = req.query;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
        return res.json(BAD_REQUEST, { message: "Invalid page", })
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
        return res.json(BAD_REQUEST, { message: "Invalid page size", })
    }
    const companyId = Request.GetCompanyId(req);

    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)


    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        id: "id",
        message: "message",
        user_id: "user_id",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        object_name: "object_name",
        object_id: "objectId"
    };

    const sortParam = sort || "createdAt";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(BAD_REQUEST, { message: `Unable to sort product by ${sortParam}`, })
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(BAD_REQUEST, { message: "Invalid sort order", })
    }

    const where = {};

    if (objectName) {
        where.object_name = objectName;
    }
    if (objectId) {
        where.object_id = objectId;
    }

    if (user) {
        where.user_id = user;
    }

    if (date) {
        where.createdAt = date;
    }
    
    where.company_id = companyId;


    if (startDate && !endDate) {
        where.createdAt = {
            [Op.and]: {
                [Op.gte]: DateTime.toGMT(start_date,timeZone)
            },
        };
    }
    if (endDate && !startDate) {
        where.createdAt = {
            [Op.and]: {
                [Op.lte]: DateTime.toGMT(end_date,timeZone),
            },
        };
    }

    if (startDate && endDate) {
        where.createdAt = {
            [Op.and]: {
                [Op.gte]: DateTime.toGMT(start_date,timeZone),
                [Op.lte]: DateTime.toGMT(end_date,timeZone),
            },
        };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
        where[Op.or] = [
            {
                message: { [Op.iLike]: `%${searchTerm}%` },
            },
            {
                "$User.name$": {
                    [Op.iLike]: `%${searchTerm}%`,
                }
            }
        ];
    }


    const include = [
        {
            required: false,
            model: UserModel,
            as: "User",
            where: { status: User.STATUS_ACTIVE },
        },
    ];

    const query = {
        order: [[sortParam, sortDirParam]],
        include,
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

    try {
        // Get systen list and count
        const historys = await History.findAndCountAll(query);

        // Return system log is null
        if (historys.count === 0) {
            return res.json({});
        }

        const data = [];
        historys.rows.forEach(historys => {
            const {
                id,
                user_id,
                message,
                company_id,
                createdAt,
                updatedAt,
                object_name,
                object_id,
                User
            } = historys.get();
        
            let value={}
            value.id=id,
            value.first_name= User?.name,
            value.last_name= User?.last_name,
            value.media_url=User?.media_url,
            value.message=message.split(","),
            value.company_id=company_id,
            value.object_name=object_name,
            value.objectId= object_id,
            value.createdAt= DateTime.getDateTimeByUserProfileTimezone(createdAt,timeZone),
            value.updatedAt= DateTime.getDateTimeByUserProfileTimezone(updatedAt,timeZone),
            data.push(value)
        });
        res.json(OK, {
            totalCount: historys.count,
            currentPage: page,
            pageSize,
            data,
            search,
            sort,
            sortDir,
        })
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
};

module.exports = search;
