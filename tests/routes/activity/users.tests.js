const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;
const utils = require("../../../lib/utils");

describe("Activity - Users", () => {

	const req = { isAdmin: true };
	const res = {};
	let next;

	const User = { findAll: sinon.stub() };
	const Activity = { sum: sinon.stub() };

	const list = proxyquire("../../../routes/activity/users", {
		"../../db": { models: { User, Activity } }
	});

	req.query = {
		date: "2017-02-01"
	};

	const userData = { id: 1, name: "Test" };

	const returnData = {
		actualHours: 2,
		userId: userData.id,
		userName: userData.name,
		date: utils.formatDate(req.query.date),
		formattedDate: utils.formatDate(req.query.date, "DD MMM, Y")
	};

	it("should return activity list", (done) => {
		User.findAll.resolves([{ get: sinon.stub().returns(userData) }]);
		Activity.sum.resolves(2);

		res.json = (json) => {
			expect(json).to.eql([returnData]);
			done();
		};

		list(req, res, next);
	});

	it("should return Unauthorized Error when the user is not admin", (done) => {
		req.isAdmin = req.isManager = false;

		next = (err) => {
			expect(err.statusCode).to.be.equal(401);
			done();
		};

		list(req, res, next);
	});

	afterEach(() => {
		Activity.sum.reset();
		User.findAll.reset();
	});

});
