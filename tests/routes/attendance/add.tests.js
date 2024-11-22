const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Attendance - Add", () => {
	const req = {};
	const res = {};
	let next;

	const Attendance = { findOne: sinon.stub(), create: sinon.stub() };

	const add = proxyquire("../../../routes/attendance/add", {
		"../../db": {
			models: { Attendance }
		}
	});

	req.isAdmin = true;
	req.connection = { remoteAddress: "127.0.0.1" };

	const body = {
		userId: 1,
		date: "21-02-2017",
		notes: "Test Summary",
		type: 1
	};

	it("should add a attendance", (done) => {
		req.body = body;

		Attendance.findOne.resolves(null);
		Attendance.create.resolves({ get: sinon.stub().resolves({ id: 1 }) });

		res.json = (status, json) => {
			expect(status).to.be.equal(201);
			expect(json.message).to.be.equal("Attendance added");
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when attendance already exist", (done) => {
		req.body = body;

		Attendance.findOne.resolves(1);

		next = (err) => {
			expect(err.message).to.be.equal("Attendance already added");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when date is empty", (done) => {
		req.body = Object.assign({}, body, { date: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Date is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when user id is empty", (done) => {
		req.body = Object.assign({}, body, { userId: "" });

		next = (err) => {
			expect(err.message).to.be.equal("User Id is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});
	afterEach(() => {
		Attendance.findOne.reset();
		Attendance.create.reset();
	});
});
