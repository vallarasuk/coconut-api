/**
 * Module dependencies
 */
const { BAD_REQUEST, UPDATE_SUCCESS } = require("../../helpers/Response");

// Models
const { Shift } = require("../../db").models;
//Utils
const utils = require("../../lib/utils");
//systemLog
const History = require("../../services/HistoryService");
const Date = require("../../lib/dateTime");
const ObjectName = require("../../helpers/ObjectName");
const saleSettlement = require("../../helpers/SaleSettlement");
const Request = require("../../lib/request");
const { isKeyAvailable } = require("../../lib/validator");
const Number = require("../../lib/Number");

/**
 * UserRole update route
 */
async function update(req, res, next) {
    const data = req.body;
    const { id } = req.params;
    const name = data.name;
    let company_id = Request.GetCompanyId(req);
    try {
        const useDetail = await Shift.findOne({
            where: { id, company_id },
        });
        //update shift details
        const shiftDetails = {
            name: name,
            status: data && data.status ? data.status : data,
            ...(isKeyAvailable(data,"start_time") ? {start_time: data.start_time ? Date.GetGmtDate(data.start_time) :null}:{}),
            ...(isKeyAvailable(data,"end_time") ? {end_time: data.end_time ? Date.GetGmtDate(data.end_time) :null}:{}),
            ...(isKeyAvailable(data,"checkin_allowed_from") ? {checkin_allowed_from: data.checkin_allowed_from ? Date.GetGmtDate(data.checkin_allowed_from) :null}:{}),
            ...(isKeyAvailable(data,"checkin_allowed_till") ? {checkin_allowed_till: data.checkin_allowed_till ? Date.GetGmtDate(data.checkin_allowed_till) :null}:{}),
            ...(isKeyAvailable(data,"grace_period") ? {grace_period: Number.Get(data?.grace_period)}:{}),
            ...(isKeyAvailable(data,"cutoff_time") ? {cutoff_time: Number.Get(data?.cutoff_time)}:{}),
        };

        const save = await useDetail.update(shiftDetails);


        // API response
        res.json(UPDATE_SUCCESS, { message: "shift Updated", data: save.get(), })

        // History On Finish Function
        res.on(("finish"), async () => {
            History.create("Shift Updated", req, ObjectName.SHIFT, id);
        })
    } catch (err) {
        //create a log
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message, })
    }
};

module.exports = update;
