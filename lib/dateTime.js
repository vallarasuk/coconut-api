const { parse, isBefore } = require("date-fns");
const moment = require("moment");
const moments = require('moment-timezone');
const timeZone = require("./config").defaultTimeZone;
const { DateTime: DateTimes } = require('luxon');
const { CUSTOM_VALUE } = require("../helpers/Date");

class DateTime {
  constructor() {
    this.formats = {
      /**
       * Date Format
       */
      dateFormat: "DD-MM-YYYY",

      /**
       *  Frontend Time
       */
      frontEndTime: "h:mm A",

      /**
       * Default Date Format
       */
      defaultFormat: "MM/DD/YYYY",

      /**
       * Formatted Date Format
       */
      formattedDateFormat: "MMM DD, YYYY",

      /**
       * Frontend Date Format
       */
      frontendDateFormat: "DD-MMM-Y",
      /**
       * MySQL Date Format
       */

      mySQLDateFormat: "YYYY-MM-DD",

      /**
       *
       */
      FrontEndDateTimeFormat: "DD-MM-YYYY hh:mm:ss A",

      /**
       * Frontend 12 hours Date Time format
       */
      frontendDateTime12HoursFormat: "DD MMM, Y h:mm A",

      /**
       * Format date by day, month name and year
       */
      shortDate: "DD-MM-YY",

      /**
       * Format date by day, month name, year and time
       */
      shortDateAndTime: "DD-MM-YY hh:mm A",
      /**
       * Format date by day, month name, year and time
       */
      shortMonthDateAndTime: "DD-MMM-YY hh:mm A",

      /**
      *  DB Time
      */
      standard24Hours: "HH:mm",

      mySQLDateTimeFormat: "YYYY-MM-DD HH:mm:ss",

      shortMonthDate: "DD-MMM-YYYY",

      iSOStartOfDayFormat: "YYYY-MM-DDT00:00:00.000Z"
    };
  }

  /**
   * Format Date
   *
   * @param date
   * @param format
   * @returns {string|null}
   */
  static formatDate(date, format = dateTime.formats.dateFormat) {
    if (!date) {
      return null;
    }

    return moment(date).format(format);
  }

  static Format(date, format = dateTime.formats.frontendDateFormat) {
    if (!date) {
      return null;
    }

    return moment(date).format(format);
  }

  static shortMonthDate(date, format = dateTime.formats.shortMonthDate) {
    if (!date) {
      return null;
    }

    return moment(date).format(format);
  }
  /**
   * Default Date Format
   *
   * @param date
   * @param format
   * @returns {null|*}
   */
  static defaultDateFormat(date, format = dateTime.formats.defaultFormat) {
    if (!date) {
      return null;
    }

    return moment(date).format(format);
  }
  /**
   * Formatted Date
   *
   * @param date
   * @param format
   * @returns {string|null}
   */
  static formattedDate(
    date,
    format = dateTime.formats.frontendDateTime12HoursFormat
  ) {
    if (!date) {
      return null;
    }

    return moment(date).format(format);
  }

  /**
   * Get SQl Formatted Date
   *
   * @param date
   * @param format
   */
  static getSQlFormattedDate(
    date = "",
    format = dateTime.formats.mySQLDateFormat
  ) {
    if (date) {
      return moment(date).format(format);
    }
    return moment().format(format);
  }

  /**
   * Format Local Date
   *
   * @param date
   * @param format
   */
  static formatLocalDate(date, format = dateTime.formats.dateFormat) {
    if (!date) {
      return null;
    }

    return moment(date).tz(timeZone).format(format);
  }

  /**
   * Formatted date time
   *
   * @param date
   * @returns {null|*}
   */
  static formatDateTime(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.frontEndTime);
  }
  /**
   * Format date by day, month name, year and time
   *
   * @param date
   * @returns {null|*}
   */
  static formateDateAndTime(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.shortMonthDateAndTime);
  }

  /**
   * Format date by day-monthName-year
   *
   * @param date
   * @returns {null|*}
   */
  static shortDate(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.shortDate);
  }

  /**
   * Format date by day, month name, year and time
   *
   * @param date
   * @returns {null|*}
   */
  static shortDateAndTime(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.shortDateAndTime);
  }

  /**
 * Format Date By Day, Month Name In Mmm Format, Year and Time
 * @param date
 * @returns {null|*}
 */
  static shortDateTimeAndMonthMmmFormat(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.shortMonthDateAndTime);
  }

  static toGetISOStringWithDayEndTime(date) {
    if(date){
    return moment(date).format("YYYY-MM-DDT23:59:59.000") + "Z";
    }else{
      return null
    }
  }
  static toGMT(date, timezone) {
    let localTime = new Date(date)
    const timezoneList = moments.tz.names();
    const timezonesWithOffsets = timezoneList.map((tz) => ({
        timezone: tz,
        offset: moments.tz(localTime, tz).utcOffset(),
    }));

    let data = timezonesWithOffsets.find((time) => time.timezone == timezone);

    if (!data) {
        throw new Error("Invalid timezone: " + timezone);
    }
    const adjustedTime = new Date(localTime.getTime() - (data.offset * 60000));
    return adjustedTime.toISOString();
}
 

  static getCurrentTimeStamp(format) {
    let currentDate = new Date();
    let timestampFormat = format ? format : "YYYY-MM-DD HH:mm:ss";
    return moment(currentDate).format(timestampFormat);
  }

  static toGetISOStringWithDayStartTime(date) {
    if(date){
    return moment(date).format("YYYY-MM-DDT00:00:00.000") + "Z";
    }else{
      return null
    }
  }

  static startDate(date) {
    return moment(date).startOf('day').format()
  }

  static endDate(date) {
    return moment(date).endOf('day').format()
  }
  /**
   * convert UTC time to local time
   *
   * @param date
   * @returns {null|*}
   */
  static UTCtoLocalTime(date, format) {
    if (!date) {
      return null;
    }
    let gmtDateTime = moment.utc(date, format);

    return gmtDateTime.local().format(format);
  }

  /**

/**
 * Format date by day-monthName-year
 *
 * @param date
 * @returns {null|*}
 */
  static FrontEndDateTimeFormat(date) {
    if (!date) {
      return null;
    }

    return moment(date).format(dateTime.formats.FrontEndDateTimeFormat);
  }
  /**
   * Get Ago
   *
   * @param date
   */
  static ago(date) {
    moment(date).fromNow();
  }

  /**
   * Get SQl Current Date Time
   */
  static getSQlCurrentDateTime() {
    moment.utc().format();
  }

  //get My Sql Time Zone
  static getMysqlTimeZone(date) {
    if (!date) {
      return null;
    }
    let mysqlTimeFormat = moment(date).format("YYYY-MM-DD HH:mm:ss");
    return mysqlTimeFormat;
  }


  static DateAndHours(date) {
    if (!date) {
      return null
    }
    const timestamp = new Date(date);
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const formattedTimestamp = timestamp.toLocaleString("en-IN", options);
    return formattedTimestamp
  }
  /**
 * Get Time Zone added Date Time value
 *
 * @param dateTime
 * @param format
 * @returns {string}
 */
  static getTimeZoneTime(dateTime, format = dateTime.formats.dateFormat) {
    if (!dateTime) {
      return null;
    }

    return moment(dateTime).add(moment.duration(this.getTimeZoneValue())).format(format);
  }

  /**
 * Convert to UTC time
 *
 * @param dateTime
 * @returns {string}
 */
  static convertToUTC(dateTimes) {
    return moment(dateTimes).utc().format(dateTime.formats.frontendDateFormat)
  }

  /**
 * Get Time Zone
 */
  static getTimeZoneValue() {
    return moment().utc().tz(timeZone).format("Z");
  }

  /**
 * Get Timesheet hours and minutes Difference from current Date Time
 * @param time
 * @param format
 * @returns {number}
 */
  static getOverDueInHour(time = "", format = dateTime.formats.mySQLDateTimeFormat) {
    if (!time) {
      return null;
    }
    time = moment(time).format(format);

    return moment(time).fromNow(true)
  }

  /**
* Hours Between Diff
*
* @param fromDate
* @param toDate
* @returns {number}
*/
  static hoursBetweenDiff(fromDate, toDate) {
    return Math.abs(new Date(moment(toDate).format(dateTime.formats.mySQLDateTimeFormat)) - new Date(fromDate)) / 36e5;
  }

  /**
 * Get Last Date of Month
 *
 * @param date
 * @param format
 */
  static getLastDayOfMonth(date, format = DateTime.formats.dateFormat) {
    return moment(date).endOf("month").format(format);
  }

  static getMonth(date, monthType = "short") {
    let dates = new Date(date)
    // Getting full month name (e.g. "June")
    let month = dates.toLocaleString('default', { month: monthType });
    return month
  }
  static getYear(date) {
    let dates = new Date(date)
    // Getting year (e.g. "2022")
    let year = dates.getFullYear();
    return year
  }
  /** Get Actual hours time diff**/

  static getTimeDiffData(endDate) {
    let currentTime = new Date().getTime();
    let endTime = endDate.getTime();
    let diff = (endTime - currentTime) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
  }

  /**
 * Convert Hours to days
 *
 * @param hours
 * @param showDay
 * @returns {*}
 */
  static convertHoursToDays(hours, showDay = true) {
    if (!hours) {
      return "";
    }

    hours = parseFloat(hours);
    const days = hours / 10;

    let text = `${Math.round(hours) !== hours ? hours.toFixed(2) : hours} hr${hours > 1 ? "s" : ""}`;
    if (showDay && days > 0) {
      text += ` (${Math.round(days) !== days ? days.toFixed(2) : days} day${days > 1 ? "s" : ""})`;
    }

    return text;
  }


  static getHours(startDate, endDate) {
    try{
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      return "";
    }

    // Parse the input dates
    const start_date = moment(startDate);
    const end_date = moment(endDate);

    // Calculate the duration between the dates
    const duration = moment.duration(end_date.diff(start_date));
    
    // Extract hours and minutes
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    // Format the result as 'hh:mm'
    const formattedTimeDifference = `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
    return formattedTimeDifference;

  }catch(err){
    console.log(err);
  }
  }

  /**
 * Convert to hours and minutes
 *
 * @param milliseconds
 * @returns {string}
 */
  static covertToHoursAndMinutes(milliseconds) {
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

  }

  static HoursAndMinutes(totalMinutes) {
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    if (hours > 0) {
      return `${(hours)} Hour${hours > 1 ? "s" : ""} ${(minutes)} Minute${minutes > 1 ? "s" : ""}`;
    } else {
      return `${(minutes)} Minute${minutes > 1 ? "s" : ""}`;
    }
  }
  /**
   * convert UTC time to local time
   *
   * @param date
   * @returns {null|*}
   */
  static Get(date) {
    if (!date) {
      return null;
    }
    let gmtDateTime = moment.utc(date);

    return gmtDateTime.local().format("DD-MMM-YY hh:mm A");
  }

  static getDatesInRange(startDate, endDate) {

    if (startDate) {

      const date = new Date(startDate.getTime());

      const dates = [];

      while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }

      return dates;
    }
    return null

  }

  static GetDate(date, format = DateTime.formats.mySQLDateFormat) {
    if (date) {
      return moment(date).format(format);
    }

    return moment().format(format);

  }

  static Difference(start_time, end_time) {
    if (start_time && end_time) {
      let startTime = moment(start_time);
      let endTime = moment(end_time);

      let difference = endTime - startTime;
      let days = Math.floor(difference / 1000 / 60 / 60 / 24);
      difference -= days * 1000 * 60 * 60 * 24

      let hours = Math.floor(difference / 1000 / 60 / 60);
      difference -= hours * 1000 * 60 * 60

      let minutes = Math.floor(difference / 1000 / 60);
      difference -= minutes * 1000 * 60

      return (+hours * 60) + (+minutes);
    }
  }


  static TimeDifference(start_time, end_time) {
    if (start_time && end_time) {
      let startTime = moment(start_time);
      let endTime = moment(end_time);
  
      let difference = endTime - startTime;
  
      let hours = Math.floor(difference / 1000 / 60 / 60);
      difference -= hours * 1000 * 60 * 60;
  
      let minutes = Math.floor(difference / 1000 / 60);
  
      if (hours > 0) {
        // Show hours, and only show minutes if they are greater than 0
        return `${hours} Hour${hours > 1 ? "s" : ""}${minutes > 0 ? ` ${minutes} Minute${minutes > 1 ? "s" : ""}` : ""}`;
      } else if (minutes > 0) {
        // Show only minutes if hours are 0
        return `${minutes} Minute${minutes > 1 ? "s" : ""}`;
      }
      // If both hours and minutes are 0, return a specific message or empty string
      return "";
    }
    return "Invalid time provided";
  }
  
  static formateTime(date, format = "HH:mm:ss") {
    if (!date) {
      return null;
    }
    return moment(date).format(format);
  }


  static countDaysOtherThanSunday(startDate, endDate) {
    if (startDate && endDate) {
      const start_date = new Date(startDate);
      const end_date = new Date(endDate);
      let numDays = 0;

      for (let day = start_date; day <= end_date; day.setDate(day.getDate() + 1)) {
        if (day.getDay() !== 0) { // 0 = Sunday
          numDays++;
        }
      }
      return numDays;
    }
    else return null
  }

  static getDaysInAMonth(start_date, end_date, workingDays = null) {
    if (start_date && end_date) {
      let start = moment(start_date);
      let end = moment(end_date);
      let numberOfDays = 0;

      // If workingDays is provided, count only the working days
      if (workingDays) {
       let  working_days = workingDays.split(",");
        while (start <= end) {
          // Check if the current day is in the list of working days
          if (working_days.includes(start.format('dddd'))) {
            numberOfDays++;
          }
          start.add(1, 'day'); // Move to the next day
        }
      } else {
        // If no workingDays are provided, count all days
        numberOfDays = end.diff(start, 'days') + 1;
      }

      return numberOfDays;
    } else {
      return null;
    }
  }
  static getMonthCount(startDate, endDate) {
    try{
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate the year and month difference
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    
    // Total months difference
    const totalMonths = (yearDiff * 12) + monthDiff + 1; // +1 to include the start month

    return totalMonths;
    }catch(err){
      console.log(err);
    }
  }
  static getStartAndEndOfDay(date) {
    // Set the start time to 12:00 AM
    let start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

    // Set the end time to 11:59 PM
    let end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    // Return an object with the start and end dates
    return { start: start, end: end };
  }

  static subtract(value) {
    if (value !== undefined) {
      const newDate = new Date();

      const weeklyDate = new Date(newDate.getTime() - value * 24 * 60 * 60 * 1000);

      const date = weeklyDate.toISOString().split('T')[0];

      return date;
    }
  }

  static getOnehourAgo(currentDate) {

    let utcDate = DateTime.UTCtoLocalTime(currentDate);

    const givenTime = moment(utcDate);
    const oneHourEarlier = givenTime.clone().subtract(1, 'hour');
    const formattedOneHourEarlier = oneHourEarlier.format(dateTime.formats.mySQLDateTimeFormat);

    const formattedOneHourEarlierTime = moment(formattedOneHourEarlier, dateTime.formats.mySQLDateTimeFormat);
    const onehourAgo = formattedOneHourEarlierTime.format('YYYY-MM-DD HH:mm:ss.SSSZ');

    return onehourAgo
  }
  static compareTime(startTime, endTime) {
    try {

      let currentDate = new Date();

      startTime = new Date(Date.parse(startTime));

      endTime = new Date(Date.parse(endTime));

      if (startTime instanceof Date && endTime instanceof Date) {

        let startTimeHour = startTime.getHours();
        let startTimeMinute = startTime.getMinutes();
        let startTimeSeconds = endTime.getSeconds();

        let endTimeHour = endTime.getHours();
        let endTimeMinute = endTime.getMinutes();
        let endTimeSeconds = endTime.getSeconds();

        let currentTimeHour = currentDate.getHours();
        let currentTimeMinutes = currentDate.getMinutes();
        let currentTimeSeconds = currentDate.getMinutes();

        let hourValidation = currentTimeHour >= startTimeHour && currentTimeHour <= endTimeHour;

        let minuteValidation = startTimeMinute > 0 && endTimeMinute > 0 ? currentTimeMinutes >= startTimeMinute && currentTimeMinutes <= endTimeMinute : true;

        let secondValidation = startTimeSeconds > 0 && endTimeSeconds > 0 ? currentTimeSeconds >= startTimeSeconds && currentTimeSeconds <= endTimeSeconds : true;

        return hourValidation && minuteValidation && secondValidation ? true : false;

      }
    } catch (err) {
      console.log(err);
    }
  }

  static CurrentStartMonth() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const startDate = new Date(currentYear, currentMonth, 1);

    return startDate;
  }

  static CurrentEndMonth() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const endDate = new Date(currentYear, currentMonth + 1, 0);

    return endDate;
  }

  static getVariable() {
    return dateTime.formats;
  }

  static GetCurrentTime(date) {
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute
      .toString()
      .padStart(2, '0')}`;
    return currentTime
  }

  static getTimeOrNull(inputDate) {
    const date = new Date(inputDate);
    const time = date.toISOString().split('T')[1];
    if (time === '00:00:00.000Z') {
      return null;
    } else {
      return inputDate;
    }
  }

  static CompareTwoDate(sourceDate, destinationDate) {

    const date1 = this.formatDate(sourceDate, dateTime.formats.mySQLDateFormat);

    const date2 = this.formatDate(destinationDate, dateTime.formats.mySQLDateFormat);

    if (date1 < date2) {
      return true;
    } else if (date1 > date2) {
      return true;
    } else {
      return false;
    }
  }

  static getTimeZoneDateTime(dateTime, timeZone, format) {
    if (dateTime && timeZone) {
      return moments.tz(dateTime, timeZone).format(format ? format : "YYYY-MM-DD HH:mm:ss");
    }
    return dateTime ? moment(dateTime).format(format ? format : "YYYY-MM-DD HH:mm:ss") : "";
  }

  static getUserTimeZoneTime(time, timeZone, format = "hh:mm A") {

    let convertedTime = this.getTimeZoneDateTime(time, timeZone, format)

    if (convertedTime) {
      return convertedTime;
    }

    return time ? moment(time).format(format) : "";
  }

  static GetFormatedTime(date) {
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    const isAM = currentHour < 12;
    let formattedHour = currentHour % 12;
    formattedHour = formattedHour === 0 ? 12 : formattedHour;

    const currentTime = `${formattedHour.toString().padStart(2, '0')}:${currentMinute
      .toString()
      .padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
    return currentTime;
  }

  static getTodayDate(timeZone) {

    if (timeZone) {

      let dateValue = new Date().toLocaleString("en-US", {
        timeZone: timeZone,
      });

      return new Date(dateValue)
    }
  }
  static UTCtoLocalTimeAndMmmFormat(date,format) {
    if (!date) {
      return null;
    }
    let gmtDateTime = moment.utc(date);

    return gmtDateTime.local().format(format ? format : "DD-MMM-YY hh:mm A");
  }

  static getDateTimeByUserProfileTimezone(date, timeZone, format ) {
    let dateTime = this.getTimeZoneDateTime(date, timeZone, format ? format : "DD-MMM-YY hh:mm A")
    if (dateTime) {
      return dateTime;
    }
    return this.UTCtoLocalTimeAndMmmFormat(date,format);
  }

  static getDateByUserProfileTimezone(date, timeZone, format = "DD-MMM-YY" ) {
    let dateTime = this.getTimeZoneDateTime(date, timeZone, format)
    if (dateTime) {
      return dateTime;
    }
    return this.UTCtoLocalTimeAndMmmFormat(date,format);
  }

  static getTomorrow() {
    const currentDate = new Date();
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(currentDate.getDate() + 1);
    const tomorrowDateString = tomorrowDate.toISOString().split('T')[0];
    return tomorrowDateString;
  }

  static getHoursFromTimeDifference(startTime, endTime) {
    const timeDifferenceInMilliseconds = endTime - startTime;
    const totalHours = timeDifferenceInMilliseconds / (1000 * 60 * 60);
    const hours = Math.floor(totalHours);
    return hours;
  }


  static getTimeByTimeZone(date, timeZone) {
    if (date && timeZone) {
      const dateTime = moment.tz(date, timeZone);
      const time = dateTime.format('hh:mm A');
      return time;
    } else { return null }
  }

  static isBeforeShiftTime(currentTime, shiftTime) {
    const timeFormat = 'hh:mm a';

    const currentDateTime = parse(currentTime, timeFormat, new Date());
    const shiftDateTime = parse(shiftTime, timeFormat, new Date());
    return isBefore(currentDateTime, shiftDateTime);
  }

  static getCurrentTimeByTimeZone(timeZone) {

    const options = {
      hour12: false,
      hour: '2-digit', minute: '2-digit',
      timeZone: timeZone
    };

    const formattedTime = new Intl.DateTimeFormat('en-US', options).format(new Date());

    return formattedTime;

  }

  static getTimeByTimeZoneonDate(timeZone, date) {

    const options = {
      hour12: false,
      hour: '2-digit', minute: '2-digit',
      timeZone: timeZone
    };

    const formattedTime = new Intl.DateTimeFormat('en-US', options).format(date);

    return formattedTime;

  }

  static stripTime(date) {
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  static isDateEuqal(startDate, endDate) {

    if (startDate && endDate) {

      const date1 = this.stripTime(new Date(startDate));

      const date2 = this.stripTime(new Date(endDate));

      return date1.getDay() == date2.getDay();
    }

  }

  static getCurrentDateTimeByUserProfileTimezone(date, timeZone, format = "DD-MMM-YY hh:mm A") {
    let dateTime = this.getTimeZoneDateTime(date, timeZone, format)
    if (dateTime) {
      return dateTime;
    }
    return this.UTCtoLocalTimeAndMmmFormat(date);
  }

  static getDate(date) {
    return new Date(date);
  }

  static addMinutesToTime(time, minutes = 0) {
    const [defaultHours, defaultMinutes] = time && time.split(':').map(Number);
    const totalSeconds = (defaultHours * 3600) + (defaultMinutes * 60);
    const newTotalSeconds = totalSeconds + (minutes * 60);
    const resultHours = Math.floor(newTotalSeconds / 3600);
    const resultMinutes = Math.floor((newTotalSeconds % 3600) / 60);
    const formattedHours = String(resultHours).padStart(2, '0');
    const formattedMinutes = String(resultMinutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
  }

  static GetGmtDate(date) {
    if (!date) {
      return null;
    }
    let gmtDate = moment(date).tz("GMT").format("YYYY-MM-DD HH:mm:ss.SSSZ");

    return gmtDate;
  }
  static getGmtHoursAndMinutes(timestamp) {
    const gmtTime = moment(timestamp).tz('GMT').format('HH:mm');
    return gmtTime;
  }

  static getDayOfWeek(date) {
    if(date){
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dateValue = new Date(date);
      const dayOfWeek = dateValue.getDay();
      const dayName = daysOfWeek[dayOfWeek];
      return dayName;
    }
  }

  static isYearsAndMonthsEqual(dateString1) {
    const lastUpdatedDate = new Date(dateString1);
    const currentdate = new Date();

    const lastUpdatedYear = lastUpdatedDate.getUTCFullYear();
    const lastUpdatedMonth = lastUpdatedDate.getUTCMonth() + 1;

    const currentYear = currentdate.getUTCFullYear();
    const currentMonth = currentdate.getUTCMonth() + 1;
    return lastUpdatedYear === currentYear && lastUpdatedMonth === currentMonth;
  }


  static convertGmtTimeToDateTimeByUserProfileTimezone(time, dateTime, timeZone, format = "DD-MMM-YY hh:mm A") {
    if (time) {
      const [defaultHours, defaultMinutes] = time.split(':').map(Number);

      if (!isNaN(defaultHours) && !isNaN(defaultMinutes)) {
        let dateValue = moment.utc(dateTime, 'YYYY-MM-DDTHH:mm:ss');

        dateValue.set({
          hour: defaultHours,
          minute: defaultMinutes,
          second: 0,
          millisecond: 0,
        });
        if (timeZone) {
          dateValue = dateValue.tz(timeZone);
        }

        return dateValue.format(format);
      }
    }
  }

  static getTimeDifference(startTime, endTime) {

    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      const timeDifferenceInMinutes = endTimeInMinutes - startTimeInMinutes;

      const hours = Math.floor(timeDifferenceInMinutes / 60);
      const minutes = timeDifferenceInMinutes % 60;

      const formattedTimeDifference = `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
      return formattedTimeDifference;
    }
  }

  static convertHoursToMinutes(time) {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      return totalMinutes;
    }
  }

  static convertGmtTimeToUserTimeZone(gmtTime, timeZone, format = "HH:mm") {
    const gmtMoment = moment.utc(gmtTime, format);
    const userTimeZoneTime = gmtMoment.tz(timeZone).format('HH:mm');
    return userTimeZoneTime;
  }

  static getCurrentDay(date) {
    const currentDate = date ? new Date(date):new Date();
    const currentDay = currentDate.getDate();
    return currentDay
  }

  static getCurrentMonth() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;

    return currentMonth
  }

  static sumTimes(startTime, endTime) {

    if (startTime && endTime) {
      let [startHours, startMinutes] = startTime.split(':').map(Number);
      let [endHours, endMinutes] = endTime.split(':').map(Number);

      let totalMinutes = startHours * 60 + startMinutes + endHours * 60 + endMinutes;

      let hours = Math.floor(totalMinutes / 60);
      let minutes = totalMinutes % 60;

      let concat = hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0');

      return concat;
    }

  }
  static compareDates(startDate, endDate) {
    if (startDate && endDate) {
      const date1 = new Date(startDate);
      const date2 = new Date(endDate);
  
      // Check if both dates are the same
      if (date1.getTime() === date2.getTime()) {
        return true;
      }

      return date1 < date2;
    } else if(!startDate && endDate) {
      return true
    }
      else{
      return null;
    }
  }

  static timeStringToDecimal(timeString) {

    if (timeString) {
      let [hours, minutes] = timeString.split(":").map(Number);

      let timeDecimal = parseFloat(hours + "." + minutes);

      return timeDecimal;
    }
  }

  static DateOnly(date) {

    if (date) {

      const originalDate = new Date(date);

      return originalDate.toISOString().split('T')[0];
    }
  }

  static getDateOnlyRange(startDate, endDate) {
    if (startDate) {

      const date = new Date(startDate);

      const dates = [];

      while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
    let datess =  dates.map(date => date.toISOString().split('T')[0]);
      return datess;
    }
    return null
  }

  static getDayByDate(date) {
    try{
    if (date) {
      const dates = new Date(date);
      const options = { weekday: 'long' };
      const day = dates.toLocaleString('en-US', options);
      return day
    }
    return null
  }catch(err){
    console.log(err);
  }
  }
  static isOtpValid(otp_createdAt) {
    let newDate = new Date();
    let otpDate = new Date(otp_createdAt);
  
    // Calculate the time difference in milliseconds
    let timeDifference = newDate - otpDate;
  
    // Convert 3 minutes to milliseconds
    let threeMinutesInMilliseconds = 3 * 60 * 1000;
  
    // Check if the time difference is less than or equal to 3 minutes
    return timeDifference <= threeMinutesInMilliseconds;
  }


  static getDayCount(list) {
    try{
    return list.reduce((map, value) => {
      const key = `${value.id}`;
      const startDate = moment(value.start_date);
      const endDate = value.end_date ? moment(value.end_date) : moment();
      const duration = moment.duration(endDate.diff(startDate));
      const days = Math.floor(duration.asDays());
  
      map[key] = days;
      return map;
    }, {});
  }catch(err){
    console.log(err);
  }
  }

  static isValidDate(date){
    if(date && date !== "Invalid date" && date !== "undefined" && date !== "null" && date !== undefined && date !== null){
      return true
    }
    return false
  }
  static GetCurrentDateTime(date) {
    if(this.isValidDate(date)){
    const receivedDate = new Date(date);

    // Get the current time
    const now = new Date();

    // Combine the date and the current time
    const currentDateTime = new Date(
      receivedDate.getFullYear(),
      receivedDate.getMonth(),
      receivedDate.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
    return currentDateTime
  }else{
    return null
  }
  }
  static compareTimeByMinutes(createdAt, minutes){
    try{
    if(createdAt && minutes){
    const currentDate = new Date();
    const createdAtDate = new Date(createdAt);
    const diffInMinutes = (currentDate - createdAtDate) / (1000 * 60);
    return diffInMinutes >= minutes;
    }
  }catch(err){
    console.log(err);
  }
  }
 
  static getCustomMonthStartEndDateTime(monthYearString, timeZone) {
    const currentDate = this.getCurrentDateTimeByUserProfileTimezone(new Date(), timeZone);
    const now = DateTimes.fromJSDate(new Date(currentDate));

    const [monthName, year] = monthYearString && monthYearString.split('-');
    const month = DateTimes.fromFormat(monthName.trim(), 'MMMM').month; 

    const start = now.set({ year: parseInt(year), month }).startOf('month');
    const end = start.endOf('month');

    const startDateFormatted = start.toISO({ includeOffset: true, suppressMilliseconds: true }); 
    const endDateFormatted = end.toISO({ includeOffset: true, suppressMilliseconds: true });    
    const currentDateFormatted = now.toISO({ includeOffset: true, suppressMilliseconds: true }); 
    return {
        date: currentDateFormatted,
        startDate: startDateFormatted,
        endDate: endDateFormatted
    };
}


  static getCustomDateTime(customDateKey, timeZone) {
   let curentDateTime = this.getCurrentDateTimeByUserProfileTimezone(new Date(),timeZone)
    const now = DateTimes.fromJSDate(new Date(curentDateTime));
    
    const menuItems = [
      {
        value: 1,
        label: 'Today',
        getValue: () => {
          const start = now.startOf('day');
          const end = now.endOf('day');
          return [start, end];
        },
      },
      {
        value: 2,
        label: 'Yesterday',
        getValue: () => {
          const start = now.minus({ days: 1 }).startOf('day');
          const end = now.minus({ days: 1 }).endOf('day');
          return [start, end];
        },
      },
      {
        value: 3,
        label: 'This Week',
        getValue: () => {
          const start = now.startOf('week');
          const end = now.endOf('week');
          return [start, end];
        },
      },
      {
        value: 4,
        label: 'Last Week',
        getValue: () => {
          const start = now.minus({ weeks: 1 }).startOf('week');
          const end = now.minus({ weeks: 1 }).endOf('week');
          return [start, end];
        },
      },
      {
        value: 5,
        label: 'This Month',
        getValue: () => {
          const start = now.startOf('month');
          const end = now.endOf('month');
          return [start, end];
        },
      },
      {
        value: 6,
        label: 'Last Month',
        getValue: () => {
          const start = now.minus({ months: 1 }).startOf('month');
          const end = now.minus({ months: 1 }).endOf('month');
          return [start, end];
        },
      },
      {
        value: 7,
        label: 'This Year',
        getValue: () => {
          const start = now.startOf('year');
          const end = now.endOf('year');
          return [start, end];
        },
      },
      {
        value: 8,
        label: 'Last Year',
        getValue: () => {
          const start = now.minus({ years: 1 }).startOf('year');
          const end = now.minus({ years: 1 }).endOf('year');
          return [start, end];
        },
      },
    ];
  
    if (customDateKey != null && customDateKey != CUSTOM_VALUE) {
      let matchedDateValue = menuItems.find((data) => data?.value == customDateKey);
      if (matchedDateValue) {
        let [start, end] = matchedDateValue.getValue();
        return {
          date: start.toISO({ includeOffset: true, suppressMilliseconds: true }),
          startDate: start.toISO({ includeOffset: true, suppressMilliseconds: true }),
          endDate: end.toISO({ includeOffset: true, suppressMilliseconds: true }),
        };
      } else {
        // Return today's date
        const start = now.startOf('day');
        const end = now.endOf('day');
        return {
          date: start.toISO({ includeOffset: true, suppressMilliseconds: true }),
          startDate: start.toISO({ includeOffset: true, suppressMilliseconds: true }),
          endDate: end.toISO({ includeOffset: true, suppressMilliseconds: true }),
        };
      }
    }else{
      return null
    }
  }
  

  
  static convertMinutesToHoursAndDivide(minutes,Divide=8) {
    if(minutes){
      const hours = minutes / 60; 
      const result = hours / Divide;   
      return result.toFixed(1);   
    }else{
      return 0
    }
  }
  static getMonthStartEndDates(month, year , timeZone){
    if(month && year && timeZone){
      
    const startDate = moment.tz([year, month - 1, 1], timeZone).startOf('day').format('YYYY-MM-DD');

    const endDate = moment.tz([year, month, 1], timeZone).subtract(1, 'day').endOf('day').format('YYYY-MM-DD');

    return { startDate, endDate };
    }
  }
  
  static getFormattedHour(minutes){
    try{
      if(minutes>0){
      const hours = (minutes / 60);
      
      if (hours > 1 ) {
        return `${hours.toFixed(2)} hours`; 
      } else {
        return `${hours.toFixed(2)} hour`; 
      }
    }else{
      return ""
    }
  }catch(err){
    console.log(err);
  }
  }

  static convertMinutesToTime(totalMinutes) {
    if (totalMinutes < 60) {
      return `${totalMinutes} Min${totalMinutes !== 1 ? "s" : ""}`;
    } else {
      const hours = (totalMinutes / 60).toFixed(2); 
      return `${hours} Hr${hours !== "1.00" ? "s" : ""}`;
    }
  }

  static convertDateRangeToUTC(startDate, endDate, userTimezone) {
    if(startDate && endDate){
      const utcStartDate = moment.tz(startDate, userTimezone)
        .startOf('day')
        .utc()
        .format('YYYY-MM-DD HH:mm:ss.SSS');
  
      const utcEndDate = moment.tz(endDate, userTimezone)
        .endOf('day')
        .utc()
        .format('YYYY-MM-DD HH:mm:ss.SSS');
  
      return { startDate: utcStartDate, endDate: utcEndDate };
    }
  }

  static getDateInTimeZone(startDate, endDate, userTimezone) {
    try{

    if(startDate && endDate){
      const utcStartDate = moment.tz(startDate, userTimezone)
        .startOf('day')
        .format('YYYY-MM-DD');
  
      const utcEndDate = moment.tz(endDate, userTimezone)
        .endOf('day')
        .format('YYYY-MM-DD');
  
      return { startDate: utcStartDate, endDate: utcEndDate };
    }
  }catch(err){
    console.log(err);
  }
  }

  static getMostRecentDates(date1, date2) {
    try{
    const date1Start = new Date(date1.startDate);
    const date1End = new Date(date1.endDate);
    const date2Start = new Date(date2.startDate);
    const date2End = new Date(date2.endDate);

    // Find the max start date
    const maxDate = new Date(Math.max(date1Start, date2Start));

    // Find the min date
    const minDate = new Date(Math.min(date1End, date2End));

    return {
        starDate: maxDate,
        endDate: minDate
    };
  }catch(err){
    console.log(err);
  }
}

static getDayCountByDateRange(startDate, endDate) {
  if(DateTime.isValidDate(startDate) && DateTime.isValidDate(endDate)){
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDifference = end - start;
    const dayDifference = timeDifference / (1000 * 60 * 60 * 24);
    return dayDifference;
  }else{
    return;
  }
}

static addDateTimeToGraceTime(dateTime, graceTime, timeZone) {
  if (dateTime && graceTime) {
    const dateTimeValue = new Date(dateTime);
    dateTimeValue.setHours(dateTimeValue.getHours() + graceTime); 
    return dateTimeValue.toLocaleString('en-US', { timeZone });
  }
}

}

const dateTime = new DateTime();
// dateTimeformats.formattedDateFormat
module.exports = DateTime;
