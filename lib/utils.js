/* eslint-disable no-undef */
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);
const timeZone = require("./config").defaultTimeZone;
const config = require("./config");
const roles = require("../routes/user/roles");
const { passwordSaltKey } = require("../lib/config");
/**
 * Two Digits
 *
 * @param d
 * @returns {*}
 */
function twoDigits(d) {
	if (d >= 0 && d < 10) {
		return `0${d.toString()}`;
	}

	if (d > -10 && d < 0) {
		return `-0${(-1 * d).toString()}`;
	}

	return d.toString();
}

const utils = module.exports = {
	
	/**
	 * Default Date Format
	 */
	 dateFormat: "DD-MM-YYYY",
	 /**
	 * Default Date Format
	 */
	 defaultFormat: "MM/DD/YYYY",
	 /**
	  * MySQL Date Format
	  */
	 mySQLDateFormat: "YYYY-MM-DD",
	 /**
	  * Frontend 12 hours Date Time format
	  */
	 frontendDateTime12HoursFormat: "DD MMM, Y h:mm A",
	 /**
	  * Frontend Date format
	  */
	 frontendDateFormat: "DD-MMM-Y",
	 /**
	  * MySQL Date Time Format
	  */
	 mySQLDateTimeFormat: "YYYY-MM-DD HH:mm:ss",
	 /**
	  * 24Hours Time Format
	  */
	 timeFormat24Hours: "HH:mm:ss",
	 /**
	  *  Frontend Time
	  */
	 frontEndTime: "h:mm A",
	 /**
	  *  DB Time
	  */
	 standard24Hours: "HH:mm",

	/**
	 * Is Undefined
	 *
	 * @param key
	 * @returns {boolean}
	 */
	isUndefined: (key) => {
		if (typeof key === "undefined") {
			return true;
		}
		return false;
	},

	/**
	 * Get Value
	 *
	 * @param key
	 * @param defaultValue
	 * @returns {*}
	 */
	getValue: (key, defaultValue) => {
		if (utils.isUndefined(key) || key) {
			return key;
		}

		return defaultValue;
	},

	/**
	 * Remove Undefined Keys
	 *
	 * @param key
	 * @param defaultValue
	 * @returns {*}
	 */
	removeUndefinedKeys: (object) => {
		const returnObject = {};

		Object.keys(object).forEach((key) => {
			if (!utils.isUndefined(object[key])) {
				returnObject[key] = object[key];
			}
		});

		return returnObject;
	},

	/**
	 * Is Empty
	 *
	 * @param value
	 */
	isEmpty: (value) => {
		if (!utils.isUndefined(value) && value !== null && value !== "") {
			return false;
		}
		return true;
	},

	/**
	 * Is Integer
	 *
	 * @param value
	 */
	isInteger: (value) => {
		if (!utils.isUndefined(value) && !isNaN(value)) {
			return true;
		}
		return false;
	},

	/**
	 * Is Length
	 *
	 * @param value
	 * @param length
	 * @returns {boolean}
	 */
	isLength: (value, length) => {
		if (!utils.isUndefined(value) && value.length < length) {
			return false;
		}
		return true;
	},

	/**
	 * Random String
	 *
	 * @param length
	 * @returns {string}
	 */
	randomString: (length) => {
		if (!length) {
			length = 16;
		}
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		let text = "";
		for (let i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return text;
	},

	/**
	 * SHA256 Encryption
	 *
	 * @param password
	 * @param saltKey
	 * @returns {string}
	 */
	sha256Password: (password, saltKey) => {
		if (!password) {
			return;
		}

		if (!saltKey) {
			saltKey = utils.randomString(32);
		}
		return `${crypto.createHash("sha256").update(saltKey + password).digest("hex")}:${saltKey}`;
	},

	/**
	 * md5 Encryption
	 *
	 * @param password
	 * @returns {string}
	 */
	md5Password: (password) => {
		if (!password) {
			return;
		}

		return `${crypto.createHash("md5").update(password).digest("hex")}`;
	},

	getHashPassword: (password, callback) => {
		try {
			if (!password) {
				return callback();
			}

			// Generate the salt key
			bcrypt.genSalt(8, (err, salt) => {
				if (err) {
					return callback(err);
				}

				let saltKey = "";
				if (passwordSaltKey) {
					saltKey = salt.replace(passwordSaltKey, "");
				}

				// Generate the hash password using password and salt
				bcrypt.hash(password, salt, (err, hash) => {
					if (err) {
						return callback;
					}

					return callback(null, password, hash + saltKey);
				});
			});
		} catch (error) {
			console.log(error);
		}
	},

	hasher: (data, encdata) => {
		try {
			// if encrypted data is passed, check it against input (data)
			if (encdata) {
				if (bcrypt.compareSync(data, encdata.substr(0, 60))) {
					return true;
				}
				return false;
			}
		} catch (error) {
			console.log(error);
		}
	},

	/**
	 * Get Page
	 *
	 * @param req
	 * @returns {number}
	 */
	getPage: (req) => {
		const limit = utils.getLimit(req);
		const page = req.query.page;

		if (!page) {
			return 0;
		}

		return (page - 1) * limit;
	},

	/**
	 * Get Last Page
	 *
	 * @param count
	 * @param pageSize
	 * @returns {Number}
	 */
	getLastPage: (count, pageSize) => {
		let lastPage = parseInt(count / pageSize, 10);
		lastPage += count % pageSize === 0 ? 0 : 1;

		return lastPage;
	},

	/***
	 * Get Page Details
	 *
	 * @param count
	 * @param currentPage
	 * @param pageSize
	 * @param currentPageLength
	 * @returns {{count: *, currentPage: *, lastPage: Number, pageStart: number, pageEnd: *}}
	 */
	getPageDetails: (count, currentPage, pageSize, currentPageLength) => {
		if (typeof count === "object") {
			count = count.length;
		}
		const pageStart = count > 0 ? pageSize * (currentPage - 1) + 1 : 0;
		const pageEnd = count > 0 ? pageStart - 1 + currentPageLength : 0;

		let lastPage = parseInt(count / pageSize, 10);
		lastPage += count % pageSize === 0 ? 0 : 1;

		lastPage = lastPage > 0 ? lastPage : 1;

		return { count, currentPage, lastPage, pageStart, pageEnd };
	},

	/**
	 * Get Page Limit
	 *
	 * @param req
	 * @returns {*}
	 */
	getLimit: (req) => {
		const limit = req.query.pageSize;

		if (!limit) {
			return 10;
		}

		return parseInt(limit, 10);
	},

	/**
	 * MySQL Format Date
	 */
	mySQLFormatDate: () => {
		const currentDate = new Date();

		const year = currentDate.getUTCFullYear();
		const month = twoDigits(1 + currentDate.getUTCMonth());
		const date = twoDigits(currentDate.getUTCDate());
		const hours = twoDigits(currentDate.getUTCHours());
		const minutes = twoDigits(currentDate.getUTCMinutes());
		const seconds = twoDigits(currentDate.getUTCSeconds());

		return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
	},

	/**
	 * Null Replacer
	 */
	nullReplacer: (object) => {
		const data = JSON.stringify(object).replace(/null/g, "\"\"");

		return JSON.parse(data);
	},

	/**
	 * Map Data
	 *
	 * @param data
	 * @param mappings
	 * @returns {{}}
	 */
	mapData: (data, mappings) => {
		const returnObject = {};

		if (!data) {
			return returnObject;
		}

		for (const key in mappings) {
			if (!utils.isUndefined(data[key])) {
				returnObject[mappings[key]] = data[key];
			}
		}

		return returnObject;
	},

	/**
	 * Sort Object
	 *
	 * @param object
	 * @param key
	 * @returns {*}
	 */
	sortObject: (object, key) => {
		if (object.length === 0) {
			return object;
		}

		return object.sort((a, b) => {
			const nameA = a[key].toLowerCase();
			const nameB = b[key].toLowerCase();

			if (nameA < nameB) {
				return -1;
			}

			if (nameA > nameB) {
				return 1;
			}

			return 0;
		});
	},

	/**
	 * Get Date
	 *
	 * @param format
	 */
	getDate: (format = utils.dateFormat) => moment().format(format),

	/**
	* Default Date Format
	*
	* @param date
	* @param format
	* @returns {null|*}
	*/
	defaultDateFormat: (date, format = utils.defaultFormat) => {
		try {
			if (!date) {
				return null;
			}

			return moment(date).format(format);
		} catch (error) {
			console.log(error);
		}
	},

	frontEndDateFormat: (date, format = utils.frontendDateFormat) => {
		
			if (!date) {
				return null;
			}

			return moment(date).format(format);
		
	},
	/**
	 * Format Date
	 *
	 * @param date
	 * @param format
	 */
	formatDate: (date, format = utils.dateFormat) => {
		if (!date) {
			return null;
		}

		return moment(date).format(format);
	},

	/**
	 * Get Time
	 *
	 * @param date
	 * @returns {*}
	 */
	formatDateTime: (date) => {
		if (!date) {
			return null;
		}

		return moment(date).format(utils.frontEndTime);
	},

	/**
	 * Subtract Days
	 *
	 * @param days
	 * @param date
	 * @param format
	 * @returns {*}
	 */
	subtractDays: (days, date = "", format = utils.mySQLDateFormat) => {
		if (!days) {
			return null;
		}

		date = date ? moment(date) : moment();

		return date.subtract(days, "days").format(format);
	},

	/**
	 * Format Local Date
	 *
	 * @param date
	 * @param format
	 */
	formatLocalDate: (date, format = utils.dateFormat) => {
		if (!date) {
			return null;
		}

		return moment(date).tz(timeZone).format(format);
	},

	/**
	 * Custom Date
	 *
	 * @param date
	 * @param format
	 */
	customDate: (date, fromFormat, format = utils.dateFormat) => {
		if (!date) {
			return null;
		}

		return moment(date, fromFormat).format(format);
	},

	/**
	 * Get SQl Current Date Time
	 *
	 * @param date
	 * @param format
	 */
	getSQlCurrentDateTime: () => moment.utc().format(),


	/**
	 * Get SQL Added Date Time
	 */
	getSQLAddedDateTime: (hours = 1, date = "") => {
		if (date) {
			return moment(date).add(hours, "hours").utc().format();
		}

		return moment().add(hours, "hours").utc().format();
	},

	/**
 * Get SQL Added Date Time by minutes
 */
	getSQLAddedMinutes: (mins, date = "", format = utils.mySQLDateTimeFormat) => {
		if (date) {
			return moment(date).add(mins, 'minutes').format(format);
		}

		return moment().add(mins, 'minutes').format(format);
	},


	/**
	 * Get SQL Subtracted Date Time
	 */
	getSQLSubtractedDateTime: (hours = 1, date = "") => {
		if (date) {
			return moment(date).subtract(hours, "hours").utc().format();
		}

		return moment().subtract(hours, "hours").utc().format();
	},

	/**
	 * Get SQl Formatted Date
	 *
	 * @param date
	 * @param format
	 */
	getSQlFormattedDate: (date = "", format = utils.mySQLDateFormat) => {
		if (date) {
			return moment(date).format(format);
		}

		return moment().format(format);
	},

	getStartOfDay: () => {
		return moment.utc().startOf('day');
	},

	getEndOfDay: () => {
		return moment.utc().endOf('day');

	},
	/**
	 * Get Start Date and End Date
	 *
	 * @param date
	 * @param includeSaturday
	 * @param format
	 * @returns {{startDate: *, endDate: *}}
	 */
	getStartAndEndDateOfWeek: (date, includeSaturday = false, format = utils.mySQLDateFormat) => {
		date = moment(date).startOf("isoweek");

		return {
			startDate: date.format(format),
			endDate: date.add(includeSaturday ? 5 : 4, "days").format(format)
		};
	},

	/**
	 * Get Yesterday Date
	 *
	 * @param format
	 */
	getYesterdayDate: (format = utils.dateFormat) => moment().subtract(1, "day").format(format),

	/**
	 * Get Future Date
	 *
	 * @param format
	 */
	getFutureDate: (format = utils.dateFormat) => moment().add(1, "day").format(format),

	/**
	 * Get Future Date By Date and Day
	 *
	 * @param format
	 */
	getFutureDateByDateDay: (date, day = 1, format = utils.dateFormat) => moment(date).add(day, "day").format(format),

	/**
	 * Get Next Working Date By Date and Day
	 *
	 * @param format
	 */
	getNextWorkingDate: (date, day) => {

		if (day !== "Friday" && day !== "Saturday") {
			return (utils.getFutureDateByDateDay(date, 1, "YYYY-MM-DD"));
		} else if (day === "Friday") {
			return (utils.getFutureDateByDateDay(date, 3, "YYYY-MM-DD"));
		} else if (day === "Saturday") {
			return (utils.getFutureDateByDateDay(date, 2, "YYYY-MM-DD"));
		}
	},
	/**
	 * Get Ago
	 *
	 * @param date
	 * @param format
	 */
	ago: (date) => moment(date).fromNow(),

	/**
	 * Hours Diff
	 *
	 * @param date
	 */
	hoursDiff: (date) => Math.abs(new Date() - new Date(date)) / 36e5,

	/**
	 * Raw URL Decode
	 *
	 * @param str
	 * @returns {*}
	 */
	rawURLDecode: (str) => {
		if (!str) {
			return null;
		}

		try {
			return decodeURIComponent(str.replace(/%(?![\da-f]{2})/gi, () => "%25"));
		} catch (e) {
			return null;
		}
	},

	rawURLEncode: (str) => {
		if (!str) {
			return null;
		}

		try {
			return encodeURIComponent(str)
				.replace(/!/g, "%21")
				.replace(/'/g, "%27")
				.replace(/\(/g, "%28")
				.replace(/\)/g, "%29")
				.replace(/\*/g, "%2A");
		} catch (e) {
			return null;
		}
	},

	/**
	 * Get Date Filter
	 *
	 * @param date
	 * @param dateStart
	 * @param dateTo
	 * @param dateOnly
	 * @returns {*}
	 */
	getDateFilter: (date, dateStart, dateTo, dateOnly = false) => {
		if (!date && !dateStart && !dateTo) {
			return;
		}

		if (date) {
			dateStart = date;
			dateTo = date;
		}

		if (dateStart && !dateOnly) {
			dateStart = `${dateStart}T00:00:00.000Z`;
		}

		if (dateTo && !dateOnly) {
			dateTo = `${dateTo}T23:59:59.000Z`;
		}

		if (dateStart && dateTo) {
			return { $gte: dateStart, $lte: dateTo };
		}

		if (dateStart) {
			return { $gte: dateStart };
		}

		if (dateTo) {
			return { $lte: dateTo };
		}
	},

	/**
	 * Get Group Filter
	 *
	 * @param groupIds
	 * @returns {*}
	 */
	getGroupFilter: (groupIds) => {
		if (!groupIds) {
			return "";
		}

		if (typeof groupIds === "number") {
			groupIds = [groupIds];
		}

		if (typeof groupIds === "string") {
			groupIds = groupIds.split(",");
		}

		const groupSql = [];
		groupIds.forEach((groupId) => {
			groupSql.push(`FIND_IN_SET(${groupId}, group_id)`);
		});

		if (groupSql.length === 0) {
			return "";
		}

		return groupSql.join(" OR ");
	},

	addTimes: (loginTime, DiffTime) => {
		let times = [0, 0, 0]
		let max = times.length
		let startTime = (loginTime || '').split(':')
		let endTime = (DiffTime || '').split(':')
		// normalize time values
		for (let i = 0; i < max; i++) {
			startTime[i] = isNaN(parseInt(startTime[i])) ? 0 : parseInt(startTime[i])
			endTime[i] = isNaN(parseInt(endTime[i])) ? 0 : parseInt(endTime[i])
		}

		// store time values
		for (let i = 0; i < max; i++) {
			times[i] = startTime[i] + endTime[i]
		}

		let hours = times[0]
		let minutes = times[1]
		let seconds = times[2]

		if (seconds >= 60) {
			let m = (seconds / 60) << 0
			minutes += m
			seconds -= 60 * m
		}

		if (minutes >= 60) {
			let h = (minutes / 60) << 0
			hours += h
			minutes -= 60 * h
		}

		return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2)
	},

	getDiffTime: () => {
		let seconds = 3600;
		seconds = parseInt(seconds);
		let format = Math.floor(moment.duration(seconds, 'seconds').asHours()) + ':' + moment.duration(seconds, 'seconds').minutes() + ':' + moment.duration(seconds, 'seconds').seconds();
		return (format);
	},
	/**
	 * Get Day
	 *
	 * @param date
	 */
	getDay: (date) => {
		if (!date) {
			return null;
		}

		return moment(date).format("dddd");
	},

	/**
	 * Get Between Days
	 *
	 * @param startDate
	 * @param endDate
	 * @returns {Array}
	 */
	getBetweenDays: (startDate, endDate) => {
		const range = moment.range(moment(startDate), moment(endDate));

		return Array.from(range.by("day", { exclusive: true }));
	},

	/**
	 * Get Time Diff
	 *
	 * @param startDate
	 * @param endDate
	 */
	getTimeDiff: (startDate, endDate) => moment(startDate).diff(moment(endDate)) / 1000,

	/**
	 * Get Time Stamp
	 */
	getTimeStamp: () => moment().format("X"),

	/**
	 * Convert to hours only
	 *
	 * @param seconds
	 * @returns {*}
	 */
	convertToHoursOnly: (seconds) => {
		if (!seconds) {
			return "";
		}

		const hours = seconds / 60 / 60;

		return `${Math.round(hours) !== hours ? hours.toFixed(2) : hours}`;
	},

	/**
	 * Convert to minutes only
	 *
	 * @param seconds
	 * @returns {*}
	 */
	convertToMinutesOnly: (seconds) => {
		if (!seconds) {
			return "";
		}
		const minutes = seconds / 60;
		return `${Math.round(minutes) !== minutes ? minutes.toFixed(2) : minutes}`;
	},

	/**
	 * To Fixed
	 *
	 * @param number
	 * @param decimals
	 * @returns {*}
	 */
	toFixed: (number, decimals = 2) => {
		const regExp = new RegExp(`^-?\\d+(?:\.\\d{0,${decimals}})?`);
		return number.toString().match(regExp)[0];
	},

	/**
	 * Convert to hours
	 *
	 * @param seconds
	 * @param showDate
	 * @returns {*}
	 */
	convertToHours: (seconds, showDate = false) => {
		if (!seconds) {
			return "";
		}

		const hours = seconds / 60 / 60;
		const days = hours / 10;

		let text = `${Math.round(hours) !== hours ? utils.toFixed(hours) : hours} hr${hours > 1 ? "s" : ""}`;
		if (showDate && days > 0) {
			text += ` (${Math.round(days) !== days ? days.toFixed(2) : days} day${days > 1 ? "s" : ""})`;
		}

		return text;
	},

	/**
	 * Convert to hours and minutes with days
	 *
	 * @param milliseconds
	 * @param showDate
	 * @returns {string}
	 */
	covertToHoursAndMinutesWithDays: (milliseconds, showDate = false) => {
		if (!milliseconds) {
			return "";
		}

		const hours = milliseconds / 3600;
		const hoursString = Math.floor(hours);
		let minutes = hours - hoursString;
		minutes = minutes > 0 ? minutes * 60 : 0;

		let hoursText = "";
		if (hoursString > 0) {
			hoursText = hoursString;
			hoursText = `${hoursText}hr${hoursString > 1 ? "s" : ""}`;
		}

		if (minutes >= 1) {
			hoursText = `${hoursText} ${Math.floor(minutes)}`;
			hoursText = `${hoursText}min${minutes > 1 ? "s" : ""}`;
		}

		const days = hours / 10;

		if (showDate && days > 0) {
			hoursText += ` (${Math.round(days) !== days ? days.toFixed(2) : days} day${days > 1 ? "s" : ""})`;
		}

		return hoursText;
	},

	/**
	 * Convert to milliseconds
	 *
	 * @param hours
	 * @returns {number}
	 */
	convertToMs: (hours) => hours * 60 * 60,

	/**
	 * Convert milliseconds to Hours
	 *
	 * @param milliseconds
	 * @returns {number}
	 */
	convertMsToHours: (milliseconds) => milliseconds / 3600,

	/**
	 * Get User Profile Url
	 *
	 * @param slug
	 * @returns {*}
	 */
	getUserMediaUrl: (slug) => {
		if (!slug) {
			return null;
		}
		const parts = slug.split("/");
		const image = parts[parts.length - 1];

		return `${config.baseUrl}/user/v1/avatar/${image}`;
	},


	/**
	 * Get Candidate Profile Url
	 *
	 * @param slug
	 * @returns {*}
	 */
	getCandidateMediaUrl: (slug) => {
		if (!slug) {
			return null;
		}
		const parts = slug.split("/");
		const image = parts[parts.length - 1];

		return `${config.baseUrl}/candidateProfile/v1/avatar/${image}`;
	},

	/**
	 * Get file path
	 *
	 * @param slug
	 * @returns {*}
	 */
	getFileUrl: (slug) => {
		if (!slug) {
			return null;
		}
		const parts = slug.split("/");
		const file = parts[parts.length - 1];

		return `${config.baseUrl}/candidateProfile/v1/getFile/${file}`;
	},

	/**
	 * Get Extension By Type
	 *
	 * @param fileType
	 * @returns {*}
	 */
	getExtensionByType: (fileType) => {
		switch (fileType) {
			case "image/png":
				return "png";
			case "image/jpeg":
			case "image/jpg":
				return "jpg";
			case "image/gif":
				return "gif";
			case "image/bmp":
				return "bmp";
			default:
				return "";
		}
	},

	/**
	 * Uppercase First Letter
	 *
	 * @param string
	 */
	ucFirst: (string) => string.charAt(0).toUpperCase() + string.slice(1),

	/**
	 * Remove Key in Object
	 *
	 * @param array
	 * @param key
	 * @returns {*}
	 */
	removeKeyInObjectArray: (array, key) => {
		array.forEach((detail, index) => {
			array[index][key] = undefined;
		});

		return array;
	},

	/**
	 * Replace All
	 *
	 * @param string
	 * @param search
	 * @param replacement
	 */
	replaceAll: (string, search, replacement) => string.split(search).join(replacement),

	/**
	 * Get Jira Host Url
	 *
	 * @param jiraHost
	 * @param ticketId
	 * @returns {*}
	 */
	getJiraHostUrl: (jiraHost, ticketId = "") => {
		if (!jiraHost) {
			return null;
		}

		return `https://${jiraHost}/browse/${ticketId}`;
	},

	/**
	 * Get Month Name
	 *
	 * @param month
	 * @param format
	 */
	getMonthName: (month, format = "MMMM") => moment().month(month - 1).format(format),


	/**
	 * Get Candidate Age
	 *
	 * @param from
	 * @param to
	 * @returns {*}
	 */
	getAge: (from, to) => {
		if (!from) {
			return null;
		}
		return moment(to).diff(moment(from), "years");
	},

	/**
	 * Get Documents file path
	 *
	 * @param slug
	 * @returns {*}
	 */
	getDocumentUrl: (slug) => {
		if (!slug) {
			return null;
		}
		const parts = slug.split("/");
		const file = parts[parts.length - 1];

		return `${config.baseUrl}/drives/v1/getFile/${file}`;
	},

	/**
	 * Is Price
	 *
	 * @param price
	 * @returns {boolean}
	 */
	isPrice: (price) => {
		const priceRegEx = /^[1-9]\d{0,7}(?:\.\d{1,4})?|\.\d{1,4}$/; // must be a positive number not starting with a zero and can have decimal point values
		if (!priceRegEx.test(price)) {
			return false;
		}

		return true;
	},

	/**
	 * Get Timesheet Hours Difference
	 * @param StatusChangedAt
	 * @param format
	 * @returns {number}
	 */
	getTimeSheetHoursDiff: (StatusChangedAt = "", format = utils.mySQLDateTimeFormat) => {
		if (!StatusChangedAt) {
			return null;
		}

		const currentDate = moment().format(format);
		StatusChangedAt = moment(StatusChangedAt).format(format);

		return moment(currentDate).diff(moment(StatusChangedAt)) / 36e5;
	},


	/**
	 * Get Round The Value
	 *
	 * @param value
	 */
	roundValue: (value) => Number(`${Math.round(`${value}e2`)}e-2`),

	/**
	 * Give Permission To Project Manager and Lead User
	 *
	 * @param req
	 * @param projectId
	 * @returns {boolean}
	 */
	hasPermission: (req, projectId) => {
		if (req.isAdmin || [roles.MANAGER, roles.LEAD].indexOf(req.projectRoles[parseInt(projectId, 10)]) >= 0) {
			return true;
		}

		return false;
	},

	/**
	 * Get Capitalize First Letter
	 * @param str
	 * @returns {*}
	 */
	capitalizeFirstLetter: (str) => {
		if (!str) {
			return null;
		}

		return str.charAt(0).toUpperCase() + str.slice(1);
	},


	/**
	 * Get Test Attachment Url
	 *
	 * @param ticketId
	 * @param image
	 * @returns {*}
	 */
	getTestAttachmentUrl: (ticketId, image) => {
		if (!image) {
			return null;
		}

		return `${config.baseUrl}/ticketAttachment/v1/${ticketId}/${image}`;
	},

	/**
 * Get User Document Url
 *
 * @param userId
 * @param image
 * @returns {*}
 */
	getUserDocumenttUrl: (userId, image) => {
		if (!image) {
			return null;
		}

		return `${config.baseUrl}/userDocument/v1/${userId}/${image}`;
	},

	/**
 * Get User Document Url
 *
 * @param billNumber
 * @returns {*}
 */
	// eslint-disable-next-line arrow-body-style
	getAccountBillUrl: (billNumber) => {
		return `${config.baseUrl}/accounts/bill/v1/${billNumber}`;
	},

	/**
	 * Get User Temperature Url
	 *
	 * @param userId
	 * @param image
	 * @returns {*}
	 */
	getUserTemperatureUrl: (userId, image) => {
		if (!image) {
			return null;
		}

		return `${config.baseUrl}/user/temperature/v1/${userId}/${image}`;
	},

	/**
	 * Strip HTML Tags
	 * @param value
	 */
	stripHtmlTags: (value) => {
		if (value) {
			return value.replace(/(<([^>]+)>)/ig, "").length > 0 ? value : null;
		}
		return null;
	},


	/**
	 * Validate Project Permission
	 *
	 * @param req
	 * @param manageRoles
	 * @param projectId
	 * @returns {boolean}
	 */
	validateProjectPermission: (req, manageRoles, projectId) => {
		const projectRoles = req.projectRoles[parseInt(projectId, 10)];
		if (req.isAdmin) {
			return true;
		}

		return projectRoles ? manageRoles.split(",").indexOf(projectRoles.toString()) >= 0 : "";
	},

  	/**
	 * Convert to hours and minutes
	 *
	 * @param milliseconds
	 * @returns {string}
	 */
	covertToHoursAndMinutes(milliseconds){
		if (!milliseconds) {
			return "";
		}

		if (!milliseconds) {
			return "";
		}
		let minutes;
		let hoursString = "";
		let hours;
		if (milliseconds > 3600) {
			minutes = milliseconds / 60;
			hours = Math.floor(minutes / 60);
			minutes = Math.floor(minutes % 60);
			if (minutes > 0) {
				hoursString = `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${minutes > 1 ? "s" : ""}`;
			} else {
				hoursString = `${hours} hr${hours > 1 ? "s" : ""}`;
			}
		} else {
			minutes = Math.floor(milliseconds / 60);
			hoursString = `${minutes} min${minutes > 1 ? "s" : ""}`;
		}
		return hoursString;

	},

	/**
* Get product image URL
*
* @param productId
* @param mediaName
*/

	getMediaUrl: (mediaName, mediaId) => {
		return `${config.baseUrl}/v1/media/${mediaId}?mediaName=${mediaName}`;
	},

	 generateOTP:(length=6) =>{
		const charset = '0123456789'; 
		let otp = '';
		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			otp += charset[randomIndex];
		}
		return otp;
	}
	
};