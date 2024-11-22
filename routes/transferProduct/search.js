const { Op } = require("sequelize");

// Models
const { TransferProduct, productTag, productIndex, Transfer, Location, TransferType, TransferTypeReason, status: statusModel, User } = require("../../db").models;

// Util
const { shortDateAndTime, shortDateTimeAndMonthMmmFormat } = require("../../lib/dateTime");

const Request = require("../../lib/request");

const productConstants = require("../../helpers/Product");
const TransferProductStatus = require("../../helpers/TransferProduct")
const { getMediaUrl } = require("../../lib/utils");
const { DRAFT, PENDING, COMPLETED } = require("../../helpers/TransferProduct");
const DateTime = require("../../lib/dateTime");

const Permission = require("../../helpers/Permission");
const Boolean = require("../../lib/Boolean");
const DataBaseService = require("../../lib/dataBaseService");
const productTagService = new DataBaseService(productTag);
const validator = require("../../lib/validator");
const ProductPriceService =  require("../../services/ProductPriceService");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const Response = require("../../helpers/Response");
const Numbers = require("../../lib/Number");




const search = async (req, res) => {
    try {
        //get req params
        let params = req.query;

        //destructure the params
        let { page, pageSize, search, sort, sortDir, pagination, transferId, fromLocation, brand, category, startDate, endDate, toLocation, type, tag, reason, user, productId } = params;

        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        if (!companyId) {
          return res.json(Response.BAD_REQUEST, { message: "Company Not Found" });
        }
      
        let rolePermission = Request.getRolePermission(req);
      
        // order add permission check
        const hasPermission = await Permission.GetValueByName(Permission.TRANSFER_VIEW, rolePermission);
      

        // manage other permission check
        const manageOthers = await Permission.GetValueByName(
          Permission.TRANSFER_MANAGE_OTHERS,
          rolePermission
        );
      

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
        let timeZone = Request.getTimeZone(req);
        let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
        let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)
        let date = DateTime.getCustomDateTime(params?.date, timeZone)
        //cretae where object
        let where = new Object();

        //get product details object
        let productDetailWhere = new Object();

        let transferDetailWhere = new Object();

        //append the company id
        where.company_id = companyId;

        if (productId) {
            where.product_id = productId
        }
        //validate stock entry Id exist or not
        if (transferId) {
            where.transfer_id = transferId;
        }

        if (fromLocation) {
            transferDetailWhere.from_store_id = fromLocation;
        }

        if (toLocation) {
            transferDetailWhere.to_store_id = toLocation;
        }


        if (type) {
            transferDetailWhere.type = type;
        }

        if (brand) {
            productDetailWhere.brand_id = brand;
        }

        if (category) {
            productDetailWhere.category_id = category;
        }

        if (reason) {
            where.reason_id = reason;
        }
        if (user) {
            where.created_by = user;
        }
        const productIds = [];
        if (tag) {
            let tagData = await productTagService.find({ where: { tag_id: tag, company_id: companyId } });
            for (let i = 0; i < tagData.length; i++) {
                productIds.push(tagData[i].product_id);
            }
        }


        if (tag) {
            productDetailWhere.product_id = { [Op.in]: productIds };
        }

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

        if (date && Numbers.isNotNull(params?.date)) {
            where.createdAt = {
              [Op.and]: {
                [Op.gte]: date?.startDate,
                [Op.lte]: date?.endDate,
              },
            };
          }

        // Search term
        const searchTerm = search ? search.trim() : null;

        let filteredProductIds = await ProductPriceService.getProductIds(searchTerm, companyId)
        if(filteredProductIds && filteredProductIds.length>0){
          productDetailWhere.product_id = filteredProductIds
        }

        //validate search term 
        if (searchTerm && filteredProductIds.length == 0) {
            productDetailWhere[Op.or] = [
                {
                    product_name: {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
                {
                    brand_name: {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
               
            ];
        }

        // Sortable Fields
        const validOrder = ["ASC", "DESC"];
        const sortableFields = {
            id: "id",
            product_name: "product_name",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
            status: "status",
            reason_for_transfer: "reason_for_transfer",
            from_location_name: "from_location_name",
            to_location_name: "to_location_name",
            quantity: "quantity",
            createdBy: "createdBy",
            createdAt: "createdAt"
        };
        const sortParam = sort || "id";
        // Validate sortable fields is present in sort param
        if (!Object.keys(sortableFields).includes(sortParam)) {
            throw { message: `Unable to sort inventory by ${sortParam}` };
        }

        const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
        // Validate order is present in sortDir param
        if (!validOrder.includes(sortDirParam)) {
            throw { message: "Invalid sort order" };
        }
        let order = [];

       
        if(sort === "from_location_name") {
            order.push([{ model: Location, as: 'from_location' }, 'name', sortDir])
        }
        else if(sort === "to_location_name") {
            order.push([{ model: Location, as: 'to_location' }, 'name', sortDir])
        }
        else if (sort === "transfer_type") {
            order.push([{ model: TransferType, as: 'Type' }, 'name', sortDirParam])
        }
        else if (sort === '') {
            order.push([sortParam, 'DESC']);
        }
        else if (sort === "product_name") {
            order.push([{ model: productIndex, as: 'productIndex' }, 'product_name', sortDir])
        }
        else if (sort === "createdBy") {
            order.push([{ model: User, as: 'userDetail' }, 'name', sortDir])
        }
        else if (sort && sort == '' && sort == 'product_name' && sort == 'from_location' && sort == 'to_location' && sort == 'Type') {
            order.push([sortParam, sortDirParam]);
        }
        else if (sort === "updatedAt") {
            order.push([sortParam, sortDirParam])
        }
        else if (sort === "createdAt") {
            order.push([sortParam, sortDirParam])
        }
       else if (sort === "quantity") {
            order.push([sortParam, sortDirParam])
        }       
        else{
            order.push([sortParam, sortDirParam])
        }
       

        //create query object
        const query = {
            order,
            where,
        };

        //append the include
        query.include = [{
            required: true,
            distinct: true,
            model: productIndex,
            as: "productIndex",
            where: productDetailWhere
        },
        {
            required: true,
            distinct: true,
            model: Transfer,
            as: "transfer",
            where: transferDetailWhere

        }, {
            required: true,
            model: Location,
            as: 'from_location',
            attributes: ['id', 'name'],
        },
        {
            required: true,
            model: Location,
            as: 'to_location',
            attributes: ['id', 'name'],
        },
        {
            required: true,
            model: TransferType,
            as: 'Type',
            attributes: ['id', 'name'],
        },
        {
            required: false,
            model: TransferTypeReason,
            as: 'transferReasonDetail',
        },
        {
            required: false,
            model: statusModel,
            as: 'statusDetail'
        },
        {
            required: false,
            model: User,
            as: 'userDetail'
        },
        ];

        if (validator.isEmpty(pagination)) {
            pagination = true;
        }
        if (Boolean.isTrue(pagination)) {
            if (pageSize > 0) {
                query.limit = pageSize;
                query.offset = (page - 1) * pageSize;
            }
        }

        const TransferProductdata = await TransferProduct.findAndCountAll(query);

        const TransferProductList = TransferProductdata && TransferProductdata.rows;
        const transferProduct = [];

        if (TransferProductList && TransferProductList.length > 0) {

            for (let i = 0; i < TransferProductList.length; i++) {
                const { id,
                    transfer_id,
                    quantity,
                    productIndex,
                    createdAt,
                    updatedAt,
                    product_id,
                    from_location,
                    to_location,
                    status,
                    company_id,
                    transfer,
                    statusDetail,
                    transferReasonDetail,
                    created_by,
                    userDetail,
                    Type } = TransferProductList[i];


                let Transfer = { ...transfer.get() };

                //get product details
                let product_index = { ...productIndex.get() };

                const locationDetail = await Location.findAndCountAll({ where: { id: Transfer?.to_store_id, company_id: companyId } });
                const detail = locationDetail && locationDetail.rows;
                let locationName = []
                for (let i = 0; i < detail.length; i++) {
                    locationName = detail[i].name;
                }

                //create date object
                const data = {
                    id,
                    transferId: transfer_id,
                    product_id: product_id,
                    product_name: product_index.product_name,
                    product_display_name: product_index.product_display_name,
                    quantity: quantity,
                    brand_name: product_index.brand_name,
                    sale_price: product_index.sale_price,
                    size: product_index.size,
                    status: statusDetail?.name,
                    statusColor: statusDetail?.color_code,
                    currentStatusId: statusDetail && statusDetail.id,
                    mrp: product_index.mrp,
                    unit: product_index.unit,
                    image: product_index.featured_media_url,
                    amount: Number(product_index.sale_price) * quantity,
                    statusValue: status,
                    companyId: company_id,
                    location_name: locationName,
                    date: DateTime.Format(createdAt),
                    from_location_name: from_location.name,
                    to_location_name: to_location.name,
                    transfer_type: Type.name,
                    brand_id: product_index.brand_id,
                    reasonForTransfer: transferReasonDetail && transferReasonDetail.name,
                    from_store_id: transfer.from_store_id,
                    to_store_id: transfer.to_store_id,
                    transfer_number: transfer.transfer_number,
                    createdByName: userDetail?.name,
                    createdByLastName: userDetail?.last_name,
                    avatarUrl: userDetail?.media_url,
                    transfer_id: transfer.id
                };

                // formate object property
                data.createdAt =  DateTime.getDateTimeByUserProfileTimezone(createdAt,timeZone);
                data.updatedAt = shortDateTimeAndMonthMmmFormat(updatedAt);



                //push the transferProduct
                transferProduct.push(data);

            }
        }

        //return response 
        return res.json(200, {
            currentPage: page,
            totalCount: TransferProductdata.count,
            pageSize,
            data: transferProduct,
            sort,
            sortDir,
        });

    } catch (err) {
        return res.json(400, { message: err.message });

    }
};
module.exports = search;