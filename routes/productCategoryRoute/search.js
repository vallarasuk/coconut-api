// Utils
/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");

const DateTime = require("../../lib/dateTime");
const { Op, Sequelize } = require("sequelize");
const Permission = require("../../helpers/Permission");
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator");
const DataBaseService = require("../../lib/dataBaseService");

// Models
const { productCategory, productIndex, AccountProductModel } = require("../../db").models;
const AccountProduct = new DataBaseService(AccountProductModel);

/**
 * Project category search route
 */
async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.PRODUCT_CATEGORY_VIEW, req);



    let { page, pageSize, search, sort, sortDir, pagination, account_id } = req.query;

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
        return res.json(BAD_REQUEST, { message: "Company Not Found" });
    }

    const where = { company_id: companyId };

    if (account_id) {
        // If account_id is provided, filter categories based on the associated product_ids
        const productDetails = await AccountProductModel.findAll({
            where: { company_id: companyId, account_id: account_id },
            attributes: ["product_id"]
        });

        const productIds = productDetails.map(detail => detail.product_id);

        if (productIds.length > 0) {
            const categoryDetails = await productIndex.findAll({
                where: { product_id: { [Op.in]: productIds }, company_id: companyId },
                attributes: ["category_id"],
                group: ["category_id"]
            });

            const categoryIds = categoryDetails.map(detail => detail.category_id);
            where.id = { [Op.in]: categoryIds };
        } else {
            return res.json(OK, { message: "No categories found for the given account_id" });
        }
    } else {
        const name = req.query.name;
        if (name) {
            where.name = { [Op.iLike]: `%${name}%` };
        }

        const status = req.query.status;
        if (status) {
            where.status = status;
        }
    }

    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
        id: "id",
        name: "name",
        status: "status",
        productCount: "productCount",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    };

    const sortParam = sort || "name";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(BAD_REQUEST, { message: `Unable to sort category by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
        return res.json(BAD_REQUEST, { message: "Invalid sort order" });
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${searchTerm}%` } }
        ];
    }

    const query = {
        attributes: [
            "id",
            "name",
            "status",
            "createdAt",
            "updatedAt",
            [
              Sequelize.literal('(SELECT COUNT(*) FROM product_index WHERE product_category.id = product_index.category_id)'),
              'productCount'
            ]
        ],
        order: [
            sort === "productCount" ? [Sequelize.literal('(SELECT COUNT(*) FROM product_index WHERE product_category.id = product_index.category_id)'), sortDirParam] :
            [sortParam, sortDirParam]
        ],
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

    try {
        // Get Product category list and count
        const productCategories = await productCategory.findAndCountAll(query);

        // Return products category if null
        if (productCategories.count === 0) {
            return res.json(OK, { message: "No categories found" });
        }

        const data = productCategories.rows.map(category => {
            const {
                id,
                name,
                status,
                createdAt,
                updatedAt,
                productCount
            } = category.get();

            return {
                id,
                name,
                status,
                productCount: productCount ? productCount : "",
                createdAt: DateTime.defaultDateFormat(createdAt),
                updatedAt: DateTime.defaultDateFormat(updatedAt),
            };
        });

        res.json(OK, {
            totalCount: productCategories.count,
            currentPage: page,
            pageSize,
            data,
            search,
            sort,
            sortDir,
            status: req.query.status || "",
        });

    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
}

module.exports = search;
