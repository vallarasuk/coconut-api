const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("SalaryMonthly - Create", () => {
	const req = {};
	const res = {};
	let next;

	const SalaryMonthly = { create: sinon.stub() };

	const create = proxyquire("../../../routes/salaryMonthly/create", {
		"../../db": {
			models: { SalaryMonthly }
		},
		"./validate": sinon.stub().yields(null)
	});

	req.isAdmin = true;

	req.body = {
		userId: 1,
		month: 3,
		year: 2017,
		workingDays: 1,
		workedDays: 2,
		additionalDays: 3,
		paidLeaves: 4,
		unpaidLeaves: 5,
		storyPoints: 6,
		basicSalary: 10000,
		nightShiftAllowance: 2000,
		lunchAllowance: 1000,
		travelAllowance: 1000,
		houseRentAllowance: 2000,
		additionalDaysBonus: 2000,
		dinnerAllowance: 1000,
		specialAllowance: 1000,
		reimbursement: 1500,
		storyPointsBonus: 500,
		lossOfPayAmount: 1000,
		loanDeduction: 1000,
		netSalary: 20000,
		grossSalary: 21000
	};

	it("should add a salary", (done) => {
		SalaryMonthly.create.resolves({ id: 1 });

		res.json = (status, json) => {
			expect(status).to.be.equal(201);
			expect(json.message).to.be.equal("Salary added");
			done();
		};

		create(req, res, next);
	});

	it("should return permission issue if its not admin", (done) => {
		req.isAdmin = req.isManager = false;

		next = (err) => {
			expect(err.statusCode).to.be.equal(401);
			done();
		};

		create(req, res, next);
	});

	afterEach(() => {
		SalaryMonthly.create.reset();
	});
});
