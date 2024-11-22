// Utils
/**
 * Module dependencies
 */
const { Op, Sequelize } = require("sequelize");
const { BAD_REQUEST, OK } = require("../../helpers/Response");
const Permission = require("../../helpers/Permission");

const DateTime = require("../../lib/dateTime");
const { getBrandImageUrl } = require("../../lib/Url");
const Boolean = require("../../lib/Boolean");
const validator = require("../../lib/validator");
const DataBaseService = require("../../lib/dataBaseService");

// Models
const { productBrand, product, AccountProductModel, productIndex } = require("../../db").models;
const AccountProduct = new DataBaseService(AccountProductModel);

/**
 * Vendor search route
 */
async function search(req, res, next) {
    const hasPermission = await Permission.Has(Permission.BRAND_VIEW, req);


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
        return res.json(BAD_REQUEST, "Company Not Found");
    }

    const where = { company_id: companyId };

    // If account_id is provided, filter brands based on the associated product_ids
    if (account_id) {
        const productDetails = await AccountProductModel.findAll({
            where: { company_id: companyId, account_id: account_id },
            attributes: ["product_id"]
        });

        const productIds = productDetails.map(detail => detail.product_id);

        if (productIds.length > 0) {
            const productDetails = await productIndex.findAll({
                where: { product_id: { [Op.in]: productIds }, company_id: companyId },
                attributes: ["brand_id"],
                group: ["brand_id"]
            });

            const brandIds = productDetails.map(detail => detail.brand_id);
            where.id = { [Op.in]: brandIds };
        } else {
            return res.json(OK, { message: "No vendors found for the given account_id" });
        }
    }

    if (!account_id) {
        const { name, status } = req.query;

        if (name) {
            where.name = { [Op.iLike]: `%${name}%` };
        }

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
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        productCount: "productCount"
    };

    const sortParam = sort || "name";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
        return res.json(BAD_REQUEST, { message: `Unable to sort vendor by ${sortParam}` });
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

    // Query to get all vendor data without pagination
    const query = {
        attributes: ["id", "name", "image", "status", "createdAt", "updatedAt"],
        where
    };

    try {
        // Get all Vendor list
        const brands = await productBrand.findAll(query);

        // Return Vendor list if null
        if (brands.length === 0) {
            return res.json(OK, { message: "Vendors not found" });
        }

        const brandIds = brands.map(brand => brand.id);

        // Get product counts for each brand
        const productCounts = await product.findAll({
            attributes: ['brand_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'productCount']],
            where: { company_id: companyId, brand_id: brandIds },
            group: ['brand_id']
        });

        const productCountMap = {};
        productCounts.forEach(count => {
            productCountMap[count.brand_id] = count.get('productCount');
        });

        // Add productCount to brands
        const brandsWithCounts = brands.map(brand => ({
            ...brand.get(),
            productCount: productCountMap[brand.id] || 0
        }));

        // Sort brandsWithCounts by productCount or other fields
        if (sortParam === "productCount") {
            brandsWithCounts.sort((a, b) => {
                return sortDirParam === "ASC"
                    ? a.productCount - b.productCount
                    : b.productCount - a.productCount;
            });
        } else {
            brandsWithCounts.sort((a, b) => {
                return sortDirParam === "ASC"
                    ? a[sortParam] > b[sortParam] ? 1 : -1
                    : a[sortParam] < b[sortParam] ? 1 : -1;
            });
        }

        // Apply pagination
        const paginatedBrands = brandsWithCounts.slice((page - 1) * pageSize, page * pageSize);

        res.json(OK, {
            totalCount: brandsWithCounts.length,
            currentPage: page,
            pageSize,
            data: paginatedBrands.map(brand => ({
                id: brand.id,
                name: brand.name || "",
                image: brand.image ? getBrandImageUrl(brand.id, brand.image) : "",
                status: brand.status || "",
                createdAt: DateTime.defaultDateFormat(brand.createdAt),
                updatedAt: DateTime.defaultDateFormat(brand.updatedAt),
                productCount: brand.productCount || 0
            })),
            search,
            sort,
            sortDir
        });

    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message });
    }
}

module.exports = search;
