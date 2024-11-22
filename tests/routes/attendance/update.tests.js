const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Attendance - Update", () => {
  const req = { params: {} };
  const res = {};
  let next;

  const Attendance = { findOne: sinon.stub(), count: sinon.stub() };

  const update = proxyquire("../../../routes/attendance/update", {
    "../../db": {
      models: { Attendance },
    },
  });

  const body = {
    userId: 1,
    date: "21-02-2017",
    notes: "Test Summary",
    type: 1,
    status: 1,
    lateHoursStatus: 1,
  };

  req.isAdmin = true;
  req.connection = { remoteAddress: "127.0.0.1" };

  req.params.attendanceId = 1;

  it("should update a attendance", (done) => {
    req.body = body;

    Attendance.count.resolves(null);
    Attendance.findOne.resolves({
      update: sinon.stub().resolves({
        get: sinon.stub().resolves({ id: 1 }),
      }),
    });

    res.json = (json) => {
      expect(json.message).to.be.equal("Attendance Updated");
      done();
    };

    update(req, res, next);
  });

  it("should return Not Found Error when attendance not found", (done) => {
    req.body = body;

    Attendance.findOne.resolves(null);

    next = (err) => {
      expect(err.message).to.be.equal("Attendance not found");
      expect(err.statusCode).to.be.equal(404);
      done();
    };

    update(req, res, next);
  });

  it("should return Bad Request Error when date is empty", (done) => {
    req.body = Object.assign({}, body, { date: "" });

    next = (err) => {
      expect(err.message).to.be.equal("Date is required");
      expect(err.statusCode).to.be.equal(400);
      done();
    };

    update(req, res, next);
  });

  it("should return Bad Request Error when user id is empty", (done) => {
    req.body = Object.assign({}, body, { userId: "" });

    next = (err) => {
      expect(err.message).to.be.equal("User Id is required");
      expect(err.statusCode).to.be.equal(400);
      done();
    };

    update(req, res, next);
  });

  it("should return Bad Request Error attendance id is invalid", (done) => {
    req.params.attendanceId = "TEST";

    next = (err) => {
      expect(err.message).to.be.equal("Invalid Attendance Id");
      expect(err.statusCode).to.be.equal(400);
      done();
    };

    update(req, res, next);
  });

  afterEach(() => {
    Attendance.findOne.reset();
    Attendance.count.reset();
  });
});
