const restify = require("restify");

// Models
const { SchedulerJob } = require("../../db").models;
const schedularjob = require("./processList");
const { USER_DEFAULT_TIME_ZONE } = require('../../helpers/Setting');
const { getSettingValue, loadSettingByName } = require("../../services/SettingService");
const { Op } = require("sequelize");
const DateTime = require("../../lib/dateTime");
const Time = require("../../lib/time");
const Status = require("../../helpers/Status");
const { TaskType } = require("../../helpers/RecurringTask");
const Number = require("../../lib/Number");

async function schedulerJobList(req, res, next) {
	try {

		const schedularJobList = [];

		let schedulerList = await SchedulerJob.findAll({
			where: { status: Status.ACTIVE, company_id: { [Op.ne]: null } }
		})

		let settingArray = [];
        let settings = await loadSettingByName(USER_DEFAULT_TIME_ZONE);

         if (settings && settings.length > 0) {
         for (let i = 0; i < settings.length; i++) {
         settingArray.push({ name: settings[i].name, value: settings[i].value, company_id: settings[i].company_id });
	    }
        }
		let currentDay = DateTime.getDayOfWeek(new Date());
		let CurrentDate = DateTime.getCurrentDay(new Date())
		let currentMonth =DateTime.getCurrentMonth();
		let currentDate = new Date();

		if (schedulerList && schedulerList.length > 0) {

			for (let i = 0; i < schedulerList.length; i++) {

				if (schedulerList[i].interval > 0 && !schedulerList[i].start_time && !schedulerList[i].end_time) {

					if (schedulerList[i].started_at) {

						//get execution time
						const executedTime = new Date(schedulerList[i].started_at);

						//get difference time
						let diff = currentDate - executedTime;

						if (diff > 60e3) {

							diff = Math.floor(diff / 60e3);

							if (schedulerList[i].interval < diff) {

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
									schedularJobList.push(schedulerList[i]);
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
									let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
									if (days && days.includes(currentDay)) {
									schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
									if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
										schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
									if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {

										if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
											schedularJobList.push(schedulerList[i]);
										}
									}
								}

							}
						}
					} else {
							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
									schedularJobList.push(schedulerList[i]);
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
									let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
									if (days && days.includes(currentDay)) {
									schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
									if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
										schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
									if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {

										if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
											schedularJobList.push(schedulerList[i]);
										}
									}
								}
					}
				} else if (schedulerList[i].start_time && !schedulerList[i].end_time && !schedulerList[i].interval) {

					let isJobRunToday = schedulerList[i].started_at ? DateTime.isDateEuqal(currentDate, schedulerList[i].started_at) : false;



					let userDefaultTimeZone = settingArray.find(value => value.company_id == schedulerList[i].company_id );

					if (userDefaultTimeZone && userDefaultTimeZone?.value) {

						let currentTime = DateTime.getCurrentTimeByTimeZone(userDefaultTimeZone?.value);

						let startedAtTime = schedulerList[i].started_at ? DateTime.getTimeByTimeZoneonDate(userDefaultTimeZone?.value, schedulerList[i].started_at) : null;

						let isRunAfterStartTime = startedAtTime ? Time.compareTimes(startedAtTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].start_time,userDefaultTimeZone?.value)) : null;

						if (!isJobRunToday || (isJobRunToday && isRunAfterStartTime < 0)) {

							let timeComparision = Time.compareTimes(currentTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].start_time,userDefaultTimeZone?.value));

							if (timeComparision >= 0) {
								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
									schedularJobList.push(schedulerList[i]);
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
									let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
									if (days && days.includes(currentDay)) {
									schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
									if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
										schedularJobList.push(schedulerList[i]);
									}
								}

								if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
									if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {

										if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
											schedularJobList.push(schedulerList[i]);
										}
									}
								}
							}
						}
					}

				} else if (schedulerList[i].start_time && schedulerList[i].end_time && !schedulerList[i].interval) {

					let userDefaultTimeZone = settingArray.find(value => value.company_id == schedulerList[i].company_id );

					if (userDefaultTimeZone && userDefaultTimeZone?.value) {

						let currentTime = DateTime.getCurrentTimeByTimeZone(userDefaultTimeZone?.value);
						let startTimeComparision = Time.compareTimes(currentTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].start_time,userDefaultTimeZone?.value));
						let endTimeComparision = Time.compareTimes(currentTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].end_time,userDefaultTimeZone?.value));
						if (startTimeComparision >= 0 && endTimeComparision <= 0) {
							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
								schedularJobList.push(schedulerList[i]);
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
								let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
								if (days && days.includes(currentDay)) {
								schedularJobList.push(schedulerList[i]);
								}
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
								if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
									schedularJobList.push(schedulerList[i]);
								}
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
								if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {

									if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
										schedularJobList.push(schedulerList[i]);
									}
								}
							}
						}
					}

				} else if (schedulerList[i].start_time && schedulerList[i].end_time && schedulerList[i].interval > 0) {

					let userDefaultTimeZone = settingArray.find(value=> value.company_id == schedulerList[i].company_id );

					if (userDefaultTimeZone && userDefaultTimeZone?.value) {

						let currentTime = DateTime.getCurrentTimeByTimeZone(userDefaultTimeZone?.value);

						let startTimeComparision = Time.compareTimes(currentTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].start_time,userDefaultTimeZone?.value));

						let endTimeComparision = Time.compareTimes(currentTime, DateTime.convertGmtTimeToUserTimeZone(schedulerList[i].end_time,userDefaultTimeZone?.value));

						if (schedulerList[i].started_at) {

							//get execution time
							const executedTime = new Date(schedulerList[i].started_at);

							//get difference time
							let diff = currentDate - executedTime;

							if (diff > 60e3) {

								diff = Math.floor(diff / 60e3);

								if (schedulerList[i].interval < diff && startTimeComparision >= 0 && endTimeComparision <= 0) {
									if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
										schedularJobList.push(schedulerList[i]);
									}
	
									if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
										let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
										if (days && days.includes(currentDay)) {
										schedularJobList.push(schedulerList[i]);
										}
									}
	
									if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
										if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
											schedularJobList.push(schedulerList[i]);
										}
									}
	
									if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
										if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {
	
											if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
												schedularJobList.push(schedulerList[i]);
											}
										}
									}

								}
							}
						} else if (startTimeComparision >= 0 && endTimeComparision <= 0) {
							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.DAILY){
								schedularJobList.push(schedulerList[i]);
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.WEEKLY){
								let days = schedulerList[i] && schedulerList[i]?.day && schedulerList[i]?.day.split(",");
								if (days && days.includes(currentDay)) {
								schedularJobList.push(schedulerList[i]);
								}
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.MONTHLY){
								if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
									schedularJobList.push(schedulerList[i]);
								}
							}

							if(schedulerList[i]?.type && schedulerList[i]?.type ==TaskType.ANNUALLY){
								if (Number.Get(schedulerList[i]?.month) == Number.Get(currentMonth)) {

									if (Number.Get(schedulerList[i]?.date) == Number.Get(CurrentDate)) {
										schedularJobList.push(schedulerList[i]);
									}
								}
							}
						}
					}
				}
			}
		}

		res.json({
			schedularJob: schedularJobList,
		});

	} catch (err) {
		console.log(err);
	}

}

module.exports = schedulerJobList;
