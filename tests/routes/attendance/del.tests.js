const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Attendance - Delete", () => {
	const req = { params: {} };
	const res = {};
	let next;

	const Attendance = { findOne: sinon.stub() };

	const del = proxyquire("../../../routes/attendance/del", {
		"../../db": {
			models: { Attendance }
		}
	});

	req.isAdmin = true;
	req.params.attendanceId = 1;

	it("should delete a attendance", (done) => {
		Attendance.findOne.resolves({ get: sinon.stub().resolves(1), destroy: sinon.stub().resolves() });

		res.json = (json) => {
			expect(json.message).to.be.equal("Attendance deleted");
			done();
		};

		del(req, res, next);
	});

	it("should return Not Found Error when attendance not found", (done) => {
		Attendance.findOne.resolves(null);

		next = (err) => {
			expect(err.message).to.be.equal("Attendance not found");
			expect(err.statusCode).to.be.equal(404);
			done();
		};

		del(req, res, next);
	});

	it("should return Bad Request Error attendance id is invalid", (done) => {
		req.params.attendanceId = "TEST";

		next = (err) => {
			expect(err.message).to.be.equal("Invalid Attendance Id");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		del(req, res, next);
	});

	afterEach(() => {
		Attendance.findOne.reset();
	});
});
