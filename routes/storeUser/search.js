// Utils
/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const DateTime = require("../../lib/dateTime");

// Models
const { User , Shift ,StoreUser } = require("../../db").models;

// Sequelize
const { Op } = require("sequelize");

// Lib
const Request = require("../../lib/request");
const Permission = require("../../helpers/Permission");
const StoreUserStatus = require("../../helpers/StoreUserStatus");
const Number = require("../../lib/Number");

/**
 * tag search route
 */
async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.TAG_VIEW, req);


    let { page, pageSize, search, sort, sortDir, pagination, status , shift, store, location  } = req.query;
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
        return res.json(BAD_REQUEST, { message: "Invalid page", })
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 10;
    if (isNaN(pageSize)) {
        return res.json(BAD_REQUEST, { message: "Invalid page size", })
    }

    const companyId = Request.GetCompanyId(req);

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        id: "id",
        name: "name",
        status: "status",
        shift: "shift",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    };

    const sortParam = sort || "createdAt";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(BAD_REQUEST, { message: `Unable to sort product by ${sortParam}`, })
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(BAD_REQUEST, { message: "Invalid sort order", })
    }

    const data = req.query;

    const where = {};

    where.company_id = companyId;

    // Search by name
    const name = data.name;
    if (name) {
        where.name = {
            $like: `%${name}%`,
        };
    }


    // Search by status
   
    if (status) {
        where.status = status === StoreUserStatus.STATUS_ACTIVE_TEXT ? StoreUserStatus.ACTIVE : StoreUserStatus.INACTIVE;
    }
    if (shift) {
        where.shift_id = shift;
    }
    if (Number.isNotNull(store) || Number.isNotNull(location)) {
        where.store_id = Number.isNotNull(store) ?  store : location;
    }
    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
        where[Op.or] = [
            {
                "$userDetail.name$": {
                    [Op.iLike]: `%${searchTerm}%`,
                  }
                },
                
                {
                  "$userDetail.last_name$": {
                    [Op.iLike]: `%${searchTerm}%`,
                  },
            },
        ];
    }

    // Include
    const include = [
        {
            required: true,
            model: User,
            as: "userDetail",
            attributes: ["id", "name", "last_name", "media_url"],
        },
        {
            required: true,
            model: Shift,
            as: "shiftDetail",
            attributes: ["id", "name"], 
        }

    ];
    const query = {
        order: sortParam !== ("name")? [[sortableFields[sortParam], sortDirParam]] : [[{ model: User, as: "userDetail" }, 'name', sortDirParam]],
        where,
        include
    };

    if (pagination) {
        if (pageSize > 0) {
            query.limit = pageSize;
            query.offset = (page - 1) * pageSize;
        }
    }

    try {
        // Get tag list and count
        const StoreUserList = await StoreUser.findAndCountAll(query);

        // Return tag is null
        if (StoreUserList.count === 0) {
            return res.json({});
        }

        const data = [];

        StoreUserList.rows.forEach(storeUsers => {
            data.push({
                id : storeUsers.id,
                userName : storeUsers?.userDetail?.name,
                lastName : storeUsers?.userDetail?.last_name,
                mediaUrl : storeUsers?.userDetail?.media_url,
                shiftName:storeUsers?.shiftDetail?.name,
                userId:storeUsers?.userDetail?.id,
                status: storeUsers.status === StoreUserStatus.ACTIVE ? StoreUserStatus.STATUS_ACTIVE_TEXT : StoreUserStatus.STATUS_INACTIVE_TEXT,
                
            });
        });

        res.json(OK, {
            totalCount: StoreUserList.count,
            currentPage: page,
            pageSize,
            data,
            status,
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
