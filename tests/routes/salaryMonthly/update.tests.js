const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("SalaryMonthly - Update", () => {
  const req = { params: {} };
  const res = {};
  let next;

  const SalaryMonthly = { findOne: sinon.stub() };

  const update = proxyquire("../../../routes/salaryMonthly/update", {
    "../../db": {
      models: { SalaryMonthly },
    },
    "./validate": sinon.stub().yields(null),
  });

  req.isAdmin = true;
  req.params.salaryId = 1;

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
    grossSalary: 21000,
  };

  it("should update a salary", (done) => {
    SalaryMonthly.findOne.resolves({
      update: sinon.stub().resolves({
        get: sinon.stub().resolves({ id: 1 }),
      }),
    });

    res.json = (json) => {
      expect(json.message).to.be.equal("Salary updated");
      done();
    };

    update(req, res, next);
  });

  it("should return Not Found Error when attendance not found", (done) => {
    SalaryMonthly.findOne.resolves(null);

    next = (err) => {
      expect(err.message).to.be.equal("Salary not found");
      expect(err.statusCode).to.be.equal(404);
      done();
    };

    update(req, res, next);
  });

  it("should return permission issue if its not admin", (done) => {
    req.isAdmin = req.isManager = false;

    next = (err) => {
      expect(err.statusCode).to.be.equal(401);
      done();
    };

    update(req, res, next);
  });

  afterEach(() => {
    SalaryMonthly.findOne.reset();
  });
});
