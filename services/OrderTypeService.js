const Request = require('../lib/request');
const History = require('./HistoryService');
const ObjectName = require('../helpers/ObjectName');
const DataBaseService = require('../lib/dataBaseService');
/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require('../helpers/Response');

//Utils
const { defaultDateFormat } = require('../lib/utils');
const { Op } = require('sequelize');

// const TransferTypeHelper = require('../helpers/OrderType');
const Status = require('../helpers/Status');
const Number = require("../lib/Number");
const {  OrderTypeGroup } = require("../helpers/OrderTypeGroup");
const { OrderType, Location } = require('../db').models;
const OrderTypeModal = new DataBaseService(OrderType);

class OrderTypeService {
    static async create(req, res) {
        try {
            const data = req.body;

            let companyId = Request.GetCompanyId(req);

            //Validation
            const isNameExists = await OrderTypeModal.findOne({
                where: { name: data.name, company_id: companyId },
            });

            if (isNameExists) {
                return res.send(400, { message: 'Order type already exist' });
            }

            //update OrderType details
            const detail = {
                name: data.name,
                default_location: Number.Get(data?.default_location),
                company_id: companyId,
                show_customer_selection: data?.show_customer_selection,
                allow_delivery: data?.allow_delivery,
                allow_store_order: data?.allow_store_order,
                delivery_time: Number.isNotNull(data?.delivery_time) ? data?.delivery_time: null
            };

            const orderType = await OrderTypeModal.create(detail);

            res.send(201, {
                message: 'Order Type Created',
            });
            res.on('finish', async () => {
                History.create('Order Type Created', req, ObjectName.ORDER, orderType.id);
            });
        } catch (err) {
            console.log(err);
        }
    }

    static async search(req, res) {
        try {
            let { page, pageSize, search, sort, sortDir, pagination } = req.query;

            // Validate if page is not a number
            page = page ? parseInt(page, 10) : 1;
            if (isNaN(page)) {
                return res.send(400, { message: 'Invalid page' });
            }
            const company_id = Request.GetCompanyId(req);

            // Validate if page size is not a number
            pageSize = pageSize ? parseInt(pageSize, 10) : 25;

            if (isNaN(pageSize)) {
                return res.send(400, { message: 'Invalid page size' });
            }

            const validOrder = ['ASC', 'DESC'];
            const sortableFields = {
                name: 'name',
                createdAt: 'createdAt',
                updatedAt: 'updatedAt',
                id: 'id',
                default_location:"default_location"
            };

            const sortParam = sort || 'name';

            // Validate sortable fields is present in sort param
            if (!Object.keys(sortableFields).includes(sortParam)) {
                return res.send(400, { message: `Unable to sort tag by ${sortParam}` });
            }

            const sortDirParam = sortDir ? sortDir.toUpperCase() : 'ASC';
            // Validate order is present in sortDir param
            if (!validOrder.includes(sortDirParam)) {
                return res.json(400, { message: 'Invalid sort order' });
            }

            const where = {};

            where.company_id = company_id;

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

            const query = {
                order: [[sortParam, sortDirParam]],
                where,
                include: [
                    {
                        required: false,
                        model: Location,
                        as: "locationDetail",
                        attributes: ["name"]

                    }
                ]
            };

            if (pagination) {
                if (pageSize > 0) {
                    query.limit = pageSize;
                    query.offset = (page - 1) * pageSize;
                }
            }

            // Get list and count
            const results = await OrderTypeModal.findAndCount(query);

            const data = [];

            if (results.count === 0) {
                return res.send(200, data);
            }

            for (const orderTypeData of results.rows) {

                let locationDetail = orderTypeData?.locationDetail;

                data.push({
                    id: orderTypeData.id,
                    name: orderTypeData.name,
                    createdAt: defaultDateFormat(orderTypeData.createdAt),
                    updatedAt: defaultDateFormat(orderTypeData.updatedAt),
                    show_customer_selection: orderTypeData?.show_customer_selection == OrderTypeGroup.ENABLE_CUSTOMER_SELECTION ? true : false,
                    allow_store_order: orderTypeData?.allow_store_order == OrderTypeGroup.ENABLE_STORE_ORDER ? true : false,
                    allow_delivery: orderTypeData?.allow_delivery == OrderTypeGroup.ENABLE_DELIVERY_ORDER ? true : false,
                    defaultLocation: locationDetail?.name,
                    delivery_time: orderTypeData?.delivery_time
                });
            }

            res.send({
                totalCount: results.count,
                currentPage: page,
                pageSize,
                data: data,
            });
        } catch (err) {
            console.error(err);
            res.status(500).send({ message: 'Internal server error' });
        }
    }

    static async update(req, res, next) {
        const { id } = req.params;

        try {
            const data = req.body;
            const name = data.name;
            const orderTypeExist = await OrderType.findOne({
                where: { id },
            });

            //update OrderType details
            const detail = {
                name: name,
                default_location: Number.Get(data?.default_location),
                show_customer_selection: data?.show_customer_selection,
                allow_delivery: data?.allow_delivery,
                allow_store_order: data?.allow_store_order,
                delivery_time: Number.isNotNull(data?.delivery_time) ? data?.delivery_time: null

            };

            const save = await orderTypeExist.update(detail);

            // API response
            res.json(UPDATE_SUCCESS, { message: 'OrderType Updated', data: save.get() });

            // History On Finish Function
            res.on('finish', async () => {
                History.create('OrderType Updated', req, ObjectName.ORDER, id);
            });

        } catch (err) {
            console.log(err);
            res.json(BAD_REQUEST, { message: err.message });
        }
    }

    static async delete(req, res, next) {
        let id = req.params.id;

        try {
            //get company Id from request
            const companyId = Request.GetCompanyId(req);

            //validate Order Id exist or not
            if (!id) {
                return res.json(400, { message: 'OrderType Not Found' });
            }

            //delete Order
            await OrderType.destroy({ where: { id: id, company_id: companyId } });

            res.json(200, { message: 'OrderType Deleted' });

            // History On Finish Function
            res.on('finish', async () => {
                History.create('OrderType Deleted', req, ObjectName.ORDER, id);
            });

        } catch (err) {
            console.log(err);
        }
    }

    static async get(id,company_id) {
        try {

            if (!id) {
                throw { message: "Invalid Id" };
            }

            const OrderTypeData = await OrderType.findOne({
                where: {
                    id: id,
                    company_id: company_id,
                },
            });

            if (!OrderTypeData)  throw { message: "No Records Found" };;

            let { name, show_customer_selection, default_location,allow_store_order,allow_delivery, delivery_time} = OrderTypeData.get();

            let data = {
                name,
                id,
                default_location,
                allow_store_order: allow_store_order == OrderTypeGroup.ENABLE_STORE_ORDER ? true : false,
                allow_delivery: allow_delivery == OrderTypeGroup.ENABLE_DELIVERY_ORDER ? true : false,
                show_customer_selection: show_customer_selection == OrderTypeGroup.ENABLE_CUSTOMER_SELECTION ? true : false,
                delivery_time: delivery_time
            };
            return data

        } catch (err) {
            console.log(err);
        }
    }


    static async list(params, companyId,condition) {
        try {
            let where = {};

            where.company_id = companyId;
            
           
            if(Number.isNotNull(params?.id)){
                where.id = params?.id
            }
            
            if (condition) {
                where = { ...where, ...condition };
              }

            const query = {
                order: [["allow_store_order", "DESC"]],
                where,
            };

            const results = await OrderTypeModal.find(query);

            const data = [];

            for (const OrderTypeData of results) {
                data.push({
                    value: OrderTypeData?.id,
                    label: OrderTypeData?.name,
                    name: OrderTypeData?.name,
                    id: OrderTypeData?.id,
                    companyId: OrderTypeData?.company_id,
                    show_customer_selection: OrderTypeData?.show_customer_selection,
                    allow_store_order: OrderTypeData?.allow_store_order,
                    allow_delivery: OrderTypeData?.allow_delivery,
                    delivery_time: OrderTypeData?.delivery_time

                });
            }

            return data;
        } catch (err) {
            console.log(err);
            throw { err: err };
        }
    }
    static async getOrderTypeId(companyId) {

        try {
            const where = {};

            where.company_id = companyId;


            const OrderTypeQuery = {
                order: [["name", "ASC"]],
                where,
            };

            const results = await OrderType.findAll(OrderTypeQuery);

            const Ids = [];

            if (results && results.length > 0) {

                for (const OrderTypeData of results) {
                    Ids.push(OrderTypeData?.id);
                }
            }

            return Ids
        } catch (err) {
            console.log(err);
            throw { err: err };
        }
    }

}

module.exports = OrderTypeService;
