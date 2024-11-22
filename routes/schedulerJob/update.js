const errors = require("restify-errors");
const Permission = require("../../helpers/Permission");
const DateTime = require("../../lib/dateTime");
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const { getSettingValue } = require("../../services/SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../../helpers/Setting");
const { SchedulerJob } = require("../../db").models;
const Request = require("../../lib/request");
const Status = require("../../helpers/Status");
const { TaskType, monthOption } = require("../../helpers/RecurringTask");
const { isKeyAvailable } = require("../../lib/validator");

async function update(req, res, next) {
  try {
    const hasPermission = await Permission.Has(Permission.SCHEDULER_JOBS_EDIT, req);

    

    const company_id = Request.GetCompanyId(req);
    const data = req.body;
    const id = req.params.id;

    if (!data.job_name) {
      return next(new errors.BadRequestError("Name required"));
    }

    let userDefaultTimeZone = await getSettingValue(USER_DEFAULT_TIME_ZONE, req.user.company_id);

    let dayValue;
    try {
      dayValue = data?.day && JSON.parse(data?.day);
    } catch (error) {
      dayValue = data?.day;
    }

    let updateData = {
      name: data.name,
      job_name: data.job_name,
      type: data.type,
      interval: data.interval,
      api_url: data.api_url,
      status: data.status,
      notes: data.notes,
      to_email: data.to_email.length > 0 ? data.to_email.join(',') : null,
      to_slack: data.to_slack ? data.to_slack : null,
      ...(isKeyAvailable(data,"startTime") ? {start_time: data?.startTime ? DateTime.GetGmtDate(data?.startTime) : null }   :{} ),
      ...(isKeyAvailable(data,"endTime") ? {end_time: data?.endTime ? DateTime.GetGmtDate(data?.endTime) : null }   :{} ),
      start_date :data?.start_date ?DateTime.formateDateAndTime( data?.start_date) : null,
      end_date :data?.end_date ? DateTime.formateDateAndTime(data?.end_date) : null,
  };

  const schedularData = await SchedulerJob.findOne({ where: { id: id, company_id: company_id } });
    updateData.day =
      data.taskType == TaskType.MONTHLY
        ? null
        : data.taskType == TaskType.ANNUALLY
        ? null
        : data.taskType == TaskType.DAILY
        ? null
        : dayValue && dayValue.join(',');

    if (data.date) {
      updateData.date = data.taskType == TaskType.DAILY ? null : data.date;
    }
    if (data.month) {
      updateData.month = data.taskType == TaskType.ANNUALLY ? data.month : null;
    }
    updateData.type = data.taskType;

    if(isKeyAvailable(data,"isOrderReportSchedulerJob") && data?.isOrderReportSchedulerJob){
      if(isKeyAvailable(data,"object_status")){
        updateData.object_status = data?.object_status ? data?.object_status : null
      }
      if(isKeyAvailable(data,"object_name")){
        updateData.object_name = data?.object_name ? data?.object_name : ""
      }
      
      if(isKeyAvailable(data,"date_type")){
        updateData.date_type = data?.date_type ? data?.date_type : null
      }
    }

    if(!isKeyAvailable(data,"isOrderReportSchedulerJob") && !data?.isOrderReportSchedulerJob){
      updateData.object_status =  null
       updateData.object_name =  ""
       updateData.date_type =  null
    }

    await SchedulerJob.update(updateData, { where: { id, company_id } });

    let logMessage = new Array();

    if (updateData.name !== schedularData?.name) {
      logMessage.push(`Name updated to: ${updateData.name}\n`);
    }

    if (updateData.job_name !== schedularData?.job_name) {
      logMessage.push(`Job Name updated to: ${updateData.job_name}\n`);
    }

    if (data.taskType === TaskType.DAILY) {
      logMessage.push(`Type updated to: Daily\n`);
    } else if (data.taskType === TaskType.WEEKLY) {
      logMessage.push(`Type updated to: Weekly ${data.day}\n`);
    } else if (data.taskType === TaskType.MONTHLY) {
      logMessage.push(`Type updated to: Monthly ${data.date}\n`);
    } else if (data.taskType === TaskType.ANNUALLY) {
      const selectedMonth = monthOption.find((month) => month.value === parseInt(data.month));
      const monthName = selectedMonth ? selectedMonth.label : '';
      logMessage.push(`Type updated to: Annually ${monthName} ${data.date}\n`);
    } else {
      logMessage.push(`Type updated\n`);
    }

    if (updateData.interval !== schedularData?.interval) {
      logMessage.push(`Interval updated to: ${updateData.interval} Minutes\n`);
    }

    if (updateData.notes !== schedularData?.notes) {
      logMessage.push(`Notes updated to: ${updateData.notes}\n`);
    }

    if (updateData.status !== schedularData?.status) {
      logMessage.push(
        `Status updated to: ${updateData.status === Status.ACTIVE ? Status.ACTIVE_TEXT : Status.INACTIVE_TEXT}\n`
      );
    }

    
    if (updateData.start_date !== schedularData?.start_date) {
      logMessage.push(`Start Date updated to: ${DateTime.formateDateAndTime(updateData.start_date)}\n`);
    }

    if (updateData.end_date !== schedularData?.end_date) {
      logMessage.push(`End Date updated to: ${DateTime.formateDateAndTime(updateData.end_date)}\n`);
    }

    if (updateData.start_time !== schedularData?.start_time) {
      logMessage.push(`Start Time updated to: ${DateTime.getUserTimeZoneTime(updateData.start_time)}\n`);
    }

    if (updateData.end_time !== schedularData?.end_time) {
      logMessage.push(`End Time updated to: ${DateTime.getUserTimeZoneTime(updateData.end_time)}\n`);
    }

    if (updateData.to_email !== schedularData?.to_email) {
      logMessage.push(`To Email updated to: ${updateData.to_email}\n`);
    }

    res.json({
      message: 'Scheduler Job updated',
    });

    if (logMessage && logMessage.length > 0) {
      let message = logMessage.join();
      History.create(`${message}`, req, ObjectName.SCHEDULER_JOB, id);
    }
  } catch (err) {
    req.log.error(err);
    console.log(err);
    return next(err);
  }
}

module.exports = update;
