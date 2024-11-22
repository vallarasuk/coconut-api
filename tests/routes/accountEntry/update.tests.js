const proxyquire = require("proxyquire");
const sinon = require("sinon");
require("sinon-as-promised");
const expect = require("chai").expect;

describe("Account Entry - Update", () => {

	const AccountEntry = { findById: sinon.stub() };
	const req = { isAdmin: true };
	const res = {};
	let next;

	const saveAttachmentsInS3 = sinon.stub().resolves(null);

	const updateAccountEntry = proxyquire("../../../routes/accountEntry/update", {
		"../../db": {
			models: { AccountEntry },
			"./saveAttachmentsInS3": saveAttachmentsInS3
		}
	});

	it("should update a account entry", (done) => {
		req.params = { id: 1 };
		req.body = {
			date: "2017-11-21 12:23:12",
			type: "credit",
			categoryId: 1,
			categoryName: "Dinner",
			payeeId: 1,
			payeeName: "Test",
			paymentMode: "Cash",
			invoiceNumber: "IN000012",
			invoiceDate: "2017-11-21 12:12:12",
			invoiceAmount: 2400,
			sgstAmount: 150,
			cgstAmount: 150,
			tdsAmount: 100,
			payableAmount: 2400,
			notes: "test notes"
		};

		const accountEntryData = {
			id: 1,
			date: req.body.date,
			type: req.body.type,
			category_id: req.body.categoryId,
			category_name: req.body.categoryName,
			payee_id: req.body.payeeId,
			payee_name: req.body.payeeName,
			mode_of_payment: req.body.paymentMode,
			invoice_number: req.body.invoiceNumber,
			invoice_date: req.body.invoiceDate,
			invoice_amount: req.body.invoiceAmount,
			sgst_amount: req.body.sgstAmount,
			cgst_amount: req.body.cgstAmount,
			tds_amount: req.body.tdsAmount,
			payable_amount: req.body.payableAmount,
			notes: req.body.notes
		};

		const mediaData = {
			media_relative_url: null
		};

		const accountEntryStub = {
			save: sinon.stub().resolves({
				get: sinon.stub().returns(Object.assign(accountEntryData, [mediaData]))
			})
		};

		AccountEntry.findById.resolves(accountEntryStub);
		saveAttachmentsInS3.resolves([mediaData]);

		res.json = (statusCode, json) => {
			expect(statusCode).to.be.equal(200);
			expect(json).to.be.eql({
				message: "Account entry updated",
				accountEntry: {
					id: accountEntryData.id,
					date: accountEntryData.date,
					type: accountEntryData.type,
					categoryId: accountEntryData.category_id,
					categoryName: accountEntryData.category_name,
					payeeId: accountEntryData.payee_id,
					payeeName: accountEntryData.payee_name,
					paymentMode: accountEntryData.mode_of_payment,
					invoiceNumber: accountEntryData.invoice_number,
					invoiceDate: accountEntryData.invoice_date,
					invoiceAmount: accountEntryData.invoice_amount,
					sgstAmount: accountEntryData.sgst_amount,
					cgstAmount: accountEntryData.cgst_amount,
					tdsAmount: accountEntryData.tds_amount,
					payableAmount: accountEntryData.payable_amount,
					notes: accountEntryData.notes,
					attachments: accountEntryData.attachments
				}
			});

			expect(accountEntryStub.date).to.be.equal(req.body.date);
			expect(accountEntryStub.type).to.be.equal(req.body.type);
			expect(accountEntryStub.category_id).to.be.equal(req.body.categoryId);
			expect(accountEntryStub.category_name).to.be.equal(req.body.categoryName);
			expect(accountEntryStub.payee_id).to.be.equal(req.body.payeeId);
			expect(accountEntryStub.payee_name).to.be.equal(req.body.payeeName);
			expect(accountEntryStub.mode_of_payment).to.be.equal(req.body.paymentMode);
			expect(accountEntryStub.invoice_number).to.be.equal(req.body.invoiceNumber);
			expect(accountEntryStub.invoice_date).to.be.equal(req.body.invoiceDate);
			expect(accountEntryStub.invoice_amount).to.be.equal(req.body.invoiceAmount);
			expect(accountEntryStub.sgst_amount).to.be.equal(req.body.sgstAmount);
			expect(accountEntryStub.cgst_amount).to.be.equal(req.body.cgstAmount);
			expect(accountEntryStub.tds_amount).to.be.equal(req.body.tdsAmount);
			expect(accountEntryStub.payable_amount).to.be.equal(req.body.payableAmount);
			expect(accountEntryStub.notes).to.be.equal(req.body.notes);

			done();
		};

		updateAccountEntry(req, res, next);
	});

	it("should catch the error and call next when an error occurs saving the account entry", (done) => {
		req.params = { id: 1 };
		req.body = {
			date: "2017-11-21 12:23:12",
			type: "credit",
			categoryId: 1,
			categoryName: "Dinner",
			payeeId: 1,
			payeeName: "Test",
			paymentMode: "Cash",
			invoiceNumber: "IN000012",
			invoiceDate: "2017-11-21 12:12:12",
			invoiceAmount: 2400,
			payableAmount: 2400,
			notes: "test notes"
		};
		AccountEntry.findById.resolves({
			save: sinon.stub().rejects(new Error("Account Entry Update Error"))
		});

		next = (err) => {
			expect(err.message).to.be.equal("Account Entry Update Error");
			done();
		};

		updateAccountEntry(req, res, next);
	});

	it("should return Not found when the account entry id doesn't exist", (done) => {
		req.params = { id: 1 };
		req.body = {
			date: "2017-11-21 12:23:12",
			type: "credit",
			categoryId: 1,
			categoryName: "Dinner",
			payeeId: 1,
			payeeName: "Test",
			paymentMode: "Cash",
			invoiceNumber: "IN000012",
			invoiceDate: "2017-11-21 12:12:12",
			invoiceAmount: 2400,
			payableAmount: 2400,
			notes: "test notes"
		};
		AccountEntry.findById.resolves(null);

		next = (err) => {
			expect(err.statusCode).to.be.equal(404);
			expect(err.message).to.be.equal("Account entry not found");
			done();
		};

		updateAccountEntry(req, res, next);
	});

	it("should return Bad Request Error when the account entry id is empty", (done) => {
		req.params = { id: "" };

		next = (error) => {
			expect(error.message).to.be.equal("Account entry id is required");
			expect(error.statusCode).to.be.equal(400);
			done();
		};

		updateAccountEntry(req, res, next);
	});

	it("should return Bad Request Error when the account entry id is invalid", (done) => {
		req.params = { id: "test" };

		next = (error) => {
			expect(error.message).to.be.equal("Invalid account entry id");
			expect(error.statusCode).to.be.equal(400);
			done();
		};

		updateAccountEntry(req, res, next);
	});

	it("should return Authorization Error when the not admin", (done) => {
		req.isAdmin = false;

		next = (error) => {
			expect(error.statusCode).to.be.equal(401);
			done();
		};

		updateAccountEntry(req, res, next);
	});

	afterEach(() => {
		AccountEntry.findById.reset();
	});

});
