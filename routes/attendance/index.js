const verifyToken = require("../../middleware/verifyToken");
const isAdmin = require("../../middleware/isAdmin");
const list = require("./list");
const add = require("./add");
const update = require("./update");
const updateCost = require("./updateCost");
const del = require("./del");
const login = require("./login");
const leave = require("./leave");
const users = require("./users");
const bulkUpdate = require("./bulkUpdate");
const bulkDelete = require("./bulkDelete");
const updateLogout = require("./updateLogout");
const getById = require("./get");
const search = require("./search");
const checkOut = require("./CheckOut");
const earlyCheckout = require("./earlyCheckout");
const checkIn = require("./checkIn")
const CheckOutValidation = require("./CheckOutValidation")
const GetDasboardData = require("./getDasboardData")
const AttendanceAttachment = require("./attendanceAttachment");
const GoalMissing = require("./goalMissing");
const ApproveLateCheckIn = require("./approveLateCheckIn");
const monthRecord = require("./monthRecord");
const leaveValidation = require("./leaveValidation");

module.exports = (server) => {
	server.get("/attendance/v1/list", verifyToken, list);
	server.get("/attendance/v1/users", verifyToken, users);
	server.post("/attendance/v1", verifyToken, add);
	server.put("/attendance/v1/bulkUpdate", verifyToken, bulkUpdate);
	server.del("/attendance/v1/bulkDelete", verifyToken, bulkDelete);
	server.put("/attendance/v1/:attendanceId", verifyToken, update);
	server.put("/attendance/v1/updateCost/:attendanceId", verifyToken, updateCost);
	server.del("/attendance/v1/delete/:id", verifyToken, del);
	server.post("/attendance/v1/leave", verifyToken, leave);
	server.post("/attendance/v1/login", verifyToken, login);
	server.post("/attendance/v1/updateLogout", verifyToken, isAdmin, updateLogout);
	server.get("/attendance/v1/:id", verifyToken, getById);
	server.get("/attendance/v1/search", verifyToken, search);
	server.post("/attendance/v1/checkOut", verifyToken, checkOut);
	server.post("/attendance/v1/earlyCheckout", verifyToken, earlyCheckout);
	server.post("/attendance/v1/attachment", verifyToken, AttendanceAttachment);
	server.post("/attendance/v1/checkIn", verifyToken, checkIn);
	server.post("/attendance/v1/checkInAttachment", verifyToken, checkIn);
	server.put("/attendance/v1/checkOut/Validation/:id", verifyToken, CheckOutValidation);
	server.get("/attendance/v1/dashboard", verifyToken, GetDasboardData);
	server.post("/attendance/v1/goalMissing", verifyToken, GoalMissing);
	server.post("/attendance/v1/lateCheckIn", verifyToken, ApproveLateCheckIn);
	server.get("/attendance/v1/monthRecord", verifyToken, monthRecord);
	server.post("/attendance/v1/leaveValidation", verifyToken, leaveValidation);


};
