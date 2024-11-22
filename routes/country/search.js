

// Sequelize
const { Op } = require("sequelize");
const Permission = require("../../helpers/Permission");
const CountryService = require("../../services/CountryService");

// Country search route
module.exports = async (req, res, next) => {
    const hasPermission = await Permission.Has(Permission.COUNTRY_VIEW, req);


   await CountryService.search(req, res,next) 
};
