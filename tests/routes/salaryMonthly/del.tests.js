const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("SalaryMonthly - Delete", () => {
	const req = { params: {} };
	const res = {};
	let next;

	const SalaryMonthly = { findOne: sinon.stub() };

	const del = proxyquire("../../../routes/salaryMonthly/del", {
		"../../db": {
			models: { SalaryMonthly }
		}
	});

	req.isAdmin = true;
	req.params.salaryId = 1;

	it("should delete a attendance", (done) => {
		SalaryMonthly.findOne.resolves({ get: sinon.stub().resolves(1), destroy: sinon.stub().resolves() });

		res.json = (json) => {
			expect(json.message).to.be.equal("Salary deleted");
			done();
		};

		del(req, res, next);
	});

	it("should return Not Found Error when attendance not found", (done) => {
		SalaryMonthly.findOne.resolves(null);

		next = (err) => {
			expect(err.message).to.be.equal("Salary not found");
			expect(err.statusCode).to.be.equal(404);
			done();
		};

		del(req, res, next);
	});

	it("should return Bad Request Error attendance id is invalid", (done) => {
		req.params.salaryId = "TEST";

		next = (err) => {
			expect(err.message).to.be.equal("Invalid salary id");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		del(req, res, next);
	});

	it("should return permission issue if its not admin", (done) => {
		req.isAdmin = req.isManager = false;

		next = (err) => {
			expect(err.statusCode).to.be.equal(401);
			done();
		};

		del(req, res, next);
	});

	afterEach(() => {
		SalaryMonthly.findOne.reset();
	});
});
