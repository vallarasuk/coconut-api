const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Activity - Delete", () => {

	const req = {};
	const res = {};
	let next;

	const Activity = { findOne: sinon.stub() };
	const Attendance = { findOne: sinon.stub().resolves() };

	const del = proxyquire("../../../routes/activity/del", {
		"../../db": {
			models: { Activity, Attendance }
		},
		"../../services/activity": { updateTotalActualHours: sinon.stub().yields(null) },
		"./helpers": { reIndexAttendance: sinon.stub().yields(null) },
	});

	req.user = { id: 1 };
	req.isAdmin = true;
	req.params = { activityId: 1 };

	it("should delete a Activity", (done) => {
		const ActivityStub = {
			get: sinon.stub().returns({
				id: 1,
				ticket_id: "TEST",
				actual_hours: 1
			}),
			destroy: sinon.stub().resolves()
		};

		Activity.findOne.resolves(ActivityStub);
		res.json = (json) => {
			expect(json.message).to.be.equal("Activity deleted");
			done();
		};

		del(req, res, next);
	});

	it("should return Not found when the Activity doesn't exist", (done) => {
		Activity.findOne.resolves(null);

		next = (err) => {
			expect(err.message).to.be.equal("Activity not found");
			expect(err.statusCode).to.be.equal(404);
			done();
		};

		del(req, res, next);
	});

	it("should return Bad Request when the Activity is invalid", (done) => {
		req.params = { activitytId: "TEST" };

		next = (err) => {
			expect(err.message).to.be.equal("Invalid activity");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		del(req, res, next);
	});

	afterEach(() => {
		Activity.findOne.reset();
	});
});
