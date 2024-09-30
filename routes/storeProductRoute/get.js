/**
 * Module dependencies
 */
const { BAD_REQUEST, OK } = require("../../helpers/Response");

// Services
const locationProductService = require("../../services/locationProductService");

/**
 * Store product get route
 */
async function get (req, res, next) {
    const { id } = req.params;

    try {
        const locationDetails = await locationProductService.getStoreProductDetails(id);
        // API response
        res.json(OK, { data: locationDetails ,})
    } catch (err) {
        console.log(err);
        res.json(BAD_REQUEST, { message: err.message ,})
    }
};
module.exports = get;
