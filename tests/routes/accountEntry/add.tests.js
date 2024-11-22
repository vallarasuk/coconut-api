const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Account Entry - Add", () => {
	const req = {};
	const res = {};
	let next;

	const AccountEntry = { create: sinon.stub() };

	const saveAttachmentsInS3 = sinon.stub().resolves(null);

	const add = proxyquire("../../../routes/accountEntry/add", {
		"../../db": {
			models: { AccountEntry },
			"./saveAttachmentsInS3": saveAttachmentsInS3
		}
	});

	req.isAdmin = true;

	const body = {
		date: "2017-11-21 12:32:12",
		type: "debit",
		categoryId: "2",
		categoryName: "Sports",
		payeeName: "Fun Play",
		paymentMode: "Cash",
		payableAmount: "3500",
		notes: "Fun World"
	};

	it("should add a account entry", (done) => {
		req.body = body;

		const mediaData = {
			media_relative_url: null
		};

		AccountEntry.create.resolves({ get: sinon.stub().resolves({ id: 1 }) });
		saveAttachmentsInS3.resolves([mediaData]);

		res.json = (status, json) => {
			expect(status).to.be.equal(201);
			expect(json.message).to.be.equal("Account entry added");
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

	it("should return Bad Request Error when type is empty", (done) => {
		req.body = Object.assign({}, body, { type: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Type is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when category id is empty", (done) => {
		req.body = Object.assign({}, body, { categoryId: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Category id is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when category name is empty", (done) => {
		req.body = Object.assign({}, body, { categoryName: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Category name is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when payee name is empty", (done) => {
		req.body = Object.assign({}, body, { payeeName: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Payee name is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when payment mode is empty", (done) => {
		req.body = Object.assign({}, body, { paymentMode: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Payment Mode is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when payable amount is empty", (done) => {
		req.body = Object.assign({}, body, { payableAmount: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Payable amount is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when Notes is empty", (done) => {
		req.body = Object.assign({}, body, { notes: "" });

		next = (err) => {
			expect(err.message).to.be.equal("Notes is required");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when invalid payable amount", (done) => {
		req.body = Object.assign({}, body, { payableAmount: "test" });

		next = (err) => {
			expect(err.message).to.be.equal("Invalid payable amount");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	it("should return Bad Request Error when invalid date format", (done) => {
		req.body = Object.assign({}, body, { date: "test" });

		next = (err) => {
			expect(err.message).to.be.equal("Invalid date format");
			expect(err.statusCode).to.be.equal(400);
			done();
		};

		add(req, res, next);
	});

	afterEach(() => {
		AccountEntry.create.reset();
	});
});
