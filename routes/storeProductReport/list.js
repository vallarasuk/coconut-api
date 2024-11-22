// Status
const Permission = require("../../helpers/Permission");
const { storeProduct, productIndex, Location, order } = require("../../db").models;;
const { Op } = require("sequelize");
const ReportType = require("../../helpers/StockReport");
const DateTime = require("../../lib/dateTime");
const validator = require("../../lib/validator");
const Boolean = require("../../lib/Boolean");
const { sequelize } = require("../../db");



async function list(req, res, next) {

    try {
        const hasPermission = await Permission.Has(Permission.STORE_PRODUCT_STORE_PRODUCT_REPORT_VIEW, req);

    
        const params = req.query;

        let companyId = req.user && req.user.company_id;

        let { page, pageSize, search, sort, sortDir, pagination, product, location } = params;
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
            product_name: "product_name",
            location: "location",
            quantity: "quantity",
            max_quantity: "max_quantity",
            min_quantity: "min_quantity",
            createdAt: "createdAt",
            unit_price:"unit_price",
            last_order_date:"last_order_date",
            last_stock_entry_date:"last_stock_entry_date",
            order_quantity:"order_quantity"
        };

        const sortParam = sort || "product_name";
        // Validate sortable fields is present in sort param
        if (!Object.keys(sortableFields).includes(sortParam)) {
            throw { message: `Unable to sort Location by ${sortParam}` };
        }

        const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
        // Validate order is present in sortDir param
        if (!validOrder.includes(sortDirParam)) {
            throw { message: "Invalid sort order" };
        }

        let where = {};

        let whereProductIndex = new Object();

        //get product details object
        where.company_id = companyId;

        // Apply filters if there is one
        if (location && parseInt(location)) {
            where.store_id = Number(location);
        }

        if (params.brand) {
            whereProductIndex.brand_id = params.brand.split(",")
        }

        if (params.category) {
            whereProductIndex.category_id = params.category.split(",")
        }

        if (product && parseInt(product)) {
            where.product_id = product;
        };

        if (params?.type == ReportType.LOW_STOCK) {
           where.quantity= {
                [Op.lt]: sequelize.literal("store_product.min_quantity"),
              }
        }
        if (params?.type == ReportType.HIGH_STOCK) {
            where.quantity= {
                [Op.gt]: sequelize.literal("store_product.max_quantity"),
              }
        }
        // Search term
        const searchTerm = search ? search.trim() : null;
        if (searchTerm) {
            whereProductIndex[Op.or] = [
                {
                    product_display_name: {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
            ];
        }

        let order = [];

        if (sort === "location") {
            order.push([{ model: Location, as: 'location' }, 'name', sortDir])
        }
        if (sort === "unit_price") {
            order.push([{ model: productIndex, as: 'productIndex' }, 'sale_price', sortDir])
        }

        if (sort === "product_name" ) {
            order.push([{ model: productIndex, as: 'productIndex' }, 'brand_name', sortDirParam], [{ model: productIndex, as: 'productIndex' }, 'product_name', sortDirParam], [{ model: productIndex, as: 'productIndex' }, 'mrp', sortDirParam])
        }

        if (sort === "" ) {
            order.push([{ model: productIndex, as: 'productIndex' }, 'brand_name', "ASC"], [{ model: productIndex, as: 'productIndex' }, 'product_name', "ASC"], [{ model: productIndex, as: 'productIndex' }, 'mrp', "ASC"])
        }

        if (sort && sort !== "product_name" && sort !== "location" && sort !== ""&& sort !== "unit_price") {
            order.push([sortableFields[sortParam], sortDirParam])
        }

        const query = {
            attributes: { exclude: ["deletedAt"] },
            include: [
                {
                    required: true,
                    model: productIndex,
                    as: "productIndex",
                    where: whereProductIndex

                },
                {
                    required: true,
                    model: Location,
                    as: "location",
                },
            ],
            order,
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



        let storeProductList = [];

        let productIds = [];

        const storeProductDetail = await storeProduct.findAndCountAll(query);
        for (let index = 0; index < storeProductDetail.rows.length; index++) {
            const value = storeProductDetail.rows[index];
            const { location, productIndex } = { ...value.get() };

            const data = {
                size: productIndex?.size ? productIndex?.size : "",
                brand: productIndex?.brand_name ? productIndex?.brand_name : "",
                brand_id: productIndex?.brand_id ? productIndex?.brand_id : "",
                product: productIndex?.product_name ? productIndex?.product_name : "",
                image: productIndex?.featured_media_url ? productIndex?.featured_media_url : "",
                id: value?.id,
                unit: value?.unit_price ? value.unit_price : "",
                product_id: value?.product_id,
                location: location?.name ? location?.name : "",
                amount: value?.price ? value.price : "",
                quantity: value?.quantity,
                min_quantity: value?.min_quantity,
                max_quantity: value?.max_quantity,
                last_order_date: value?.last_order_date ? DateTime.Format(value?.last_order_date) : "",
                last_stock_entry_date: value?.last_stock_entry_date ? DateTime.Format(value?.last_stock_entry_date) : "",
                unit_price: productIndex?.sale_price ? productIndex?.sale_price : "",
                price: productIndex?.sale_price * value?.quantity,
                order_quantity:value?.order_quantity?value?.order_quantity:"",
                mrp:productIndex?.mrp ?productIndex?.mrp:"",
                sale_price:productIndex?.sale_price?productIndex?.sale_price:""
            }
            storeProductList.push(data)
            productIds.push(value.product_id);
        }

        // //return response 
        return res.json(200, {
            totalCount: storeProductDetail.count,
            currentPage: page,
            pageSize,
            data: storeProductList,
        });

    } catch (err) {
        console.log(err);
    }
};
module.exports = list;
