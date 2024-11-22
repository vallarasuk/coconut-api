const verifyToken = require("../../middleware/verifyToken");

const saveRoute = require("./save");
const getRoute = require("./get");
const createRoute = require("./create");
const searchRoute = require("./search");
const getThemelist = require("./getThemeList");
const getMenulist = require("./getMenuList");
const generateOauthtoken = require("./oauthToken");

module.exports = (server) => {
    server.put("/v1/setting/company", verifyToken, saveRoute);
    server.get("/v1/setting", verifyToken, getRoute);
    server.put("/v1/setting/system", verifyToken, createRoute);
    server.get("/v1/setting/system", verifyToken, searchRoute);
    server.get("/v1/setting/themeList", verifyToken, getThemelist);
    server.get("/v1/setting/menuList", verifyToken, getMenulist);
    server.post("/v1/oauthToken/generateOauthToken", verifyToken, generateOauthtoken);
}