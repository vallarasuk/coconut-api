const { Op } = require("sequelize");
const Response = require("../helpers/Response");
const validator = require('../lib/validator');
const Boolean = require("../lib/Boolean");
const { typeOptions, statusOptions } = require("../helpers/AttendanceType");
const DateTime = require("../lib/dateTime");
const Number = require("../lib/Number");
const ArrayList = require("../lib/ArrayList");
const Currency = require("../lib/currency");
const { attendanceType,Attendance, UserEmployment } = require('../db').models;

class AttendanceTypeService {
  static async create(params) {
    try{
    let createData = {
      name: params?.name ? params?.name:"",
      days_count: Number.Get(params?.days_count),
      status: Number.Get(params?.status),
      company_id: Number.Get(params?.company_id),
      cutoff_time: Number.Get(params?.cutoff_time),
      maximum_leave_allowed:Number.Get(params?.maximum_leave_allowed),
      allow_late_checkin: params?.allow_late_checkin,
      is_leave: params?.is_leave,
      is_working_day: params?.is_working_day,
      is_additional_leave: params?.is_additional_leave,
      is_additional_shift: params?.is_additional_shift,
      is_additional_day: params?.is_additional_day,
      is_absent: params?.is_absent,
      allowed_days: params?.days,
      category : Number.Get(params?.category)
    };
    let response = await attendanceType.create(createData);
    return response && response;
  }catch(err){
    console.log(err);
  }
  }

  static async search (params,res){
    try{
    let { page, pageSize, search, sort, sortDir, pagination, company_id } = params;

    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page" });
    }

    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid page size" });
    }
   
    // Sortable Fields
    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      type: "type",
      days_count: "days_count",
      id: "id",
    };

    const sortParam = sort || "name";

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(Response.BAD_REQUEST, { message: `Unable to sort payments by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(Response.BAD_REQUEST, { message: "Invalid sort order" });
    }

    const where = {};

    where.company_id = company_id;

    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    const query = {
      order: [[sortParam, sortDirParam]],
      where,
    };
    if (validator.isEmpty(pagination)) {
      pagination = true;
    }
    if (Boolean.isTrue(pagination)) {
      if (pageSize > 0) {
        query.limit = pageSize;
        query.offset = (page - 1) * pageSize;
      }
    }

    const attendanceTypeList = await attendanceType.findAndCountAll(query);

    const data = [];

    const attendanceTypeData = attendanceTypeList && attendanceTypeList.rows;

    if(attendanceTypeData && attendanceTypeData.length > 0){

        for (let i = 0; i < attendanceTypeData.length; i++) {
            const {
              name,
              id,
              status,
              type,
              days_count,
              cutoff_time,
              maximum_leave_allowed,
              allow_late_checkin,
              is_leave,
              is_working_day,
              is_additional_leave,
              is_additional_shift,
              is_additional_day,
              is_absent,
              allowed_days,
              category
            } = attendanceTypeData[i];

            let typeValue = typeOptions.find((data)=>data?.value == type)
            let statusValue = statusOptions.find((data)=> data?.value == status)

            data.push({
              name,
              id,
              status: statusValue,
              type: typeValue,
              days_count,
              cutoff_time,
              maximum_leave_allowed,
              allow_late_checkin,
              is_leave,
              is_working_day,
              is_additional_leave,
              is_additional_shift,
              is_additional_day,
              is_absent,
              allowed_days,
              category
            });
        }
    }
      
   
   return {
      totalCount: attendanceTypeList.count,
      currentPage: page,
      pageSize,
      data,
      search,
      sort,
      sortDir,
    };
  }catch(err){
    console.log(err);
  }

  }

  static async update(params){
    
    let createData = {
        name: params?.name ? params?.name :"",
        type: Number.Get(params?.type),
        days_count: Number.Get(params?.days_count),
        status: Number.Get(params?.status),
        cutoff_time:Number.Get(params?.cutoff_time),
        maximum_leave_allowed:Number.Get(params?.maximum_leave_allowed),
        allow_late_checkin: params?.allow_late_checkin,
        is_leave: params?.is_leave,
        is_working_day: params?.is_working_day,
        is_additional_leave: params?.is_additional_leave,
        is_additional_shift: params?.is_additional_shift,
        is_additional_day: params?.is_additional_day,
        is_absent: params?.is_absent,
        allowed_days: params?.days,
        category : Number.Get(params?.category)
      };
  
      let response = await attendanceType.update(createData,{
        where:{
            id: params?.id,
            company_id: params?.company_id
        }
      });
      return response && response;
  }

  static async delete (params,res){

    let attendanceTypeDetail = await attendanceType.findOne({
        where:{
            id: params?.id,
            company_id: params?.company_id
        }
      });

      if(!attendanceTypeDetail){
        return res.json(Response.OK, { message: "Attendance Type Not Found" });
      }

      let response = await attendanceTypeDetail.destroy();
      return response && response;
  }

  static async get (params){
    let attendanceTypeDetail = await attendanceType.findOne({
        where:{
            id: params?.id,
            company_id: params?.company_id
        }
      });
      return attendanceTypeDetail && attendanceTypeDetail;
  }

  static async list(params) {

    try
    {
    let { company_id, is_leave } = params;

    const where = {};

    where.company_id = company_id;

    if(Number.isNotNull(is_leave)){
      where.is_leave= is_leave
    }

    const query = {
      order: [["cutoff_time", "DESC"]],
      where,
    };
    
    let endDate = DateTime.GetCurrentDateTime(new Date())

    let hourData = DateTime.getHours(endDate,params?.date)

    const attendanceTypeList = await attendanceType.findAndCountAll(query);

    const data = [];

    const attendanceTypeData = attendanceTypeList && attendanceTypeList.rows;

    if (attendanceTypeData && attendanceTypeData.length > 0  && params?.date !=="" ) {
      for (let i = 0; i < attendanceTypeData.length; i++) {
        const { name, id, status, type, days_count,cutoff_time,maximum_leave_allowed,is_leave,is_working_day,
          is_additional_leave,
          is_additional_shift,
          is_additional_day, is_absent } = attendanceTypeData[i];

        let warningMessage=""

        let where={}

        if(params?.date){
          where.date = params?.date
        }
        
        where.company_id = company_id

        if(id){
          where.type = id
        }

        const totalCount = await Attendance.count({
          where: where,
        });

        let isEligible=true
        
        if(Number.GetFloat(hourData) <= Number.GetFloat(cutoff_time)){
          warningMessage  ="Not Allowed";
          isEligible = false
        }
        if(Number.Get(totalCount) >= Number.Get(maximum_leave_allowed)){
          warningMessage = "Not Eligible";
          isEligible = false
        }

        let typeValue = typeOptions.find((data) => data?.value == type);
        let statusValue = statusOptions.find((data) => data?.value == status);

        if (cutoff_time > 0){
          data.push({
            name,
            label: name,
            id,
           value:id,
            status: statusValue,
            type: typeValue,
            days_count,
            isEnabled: isEligible,
            warningMessage: warningMessage,
            description:
              days_count > 0
                ? `${days_count} days salary will be deducated`
                : "",
            leaveTypeNote:
              cutoff_time > 0
                ? `Leave should be applied before ${cutoff_time} hours`
                : "",
            maximum_leave_allowed: maximum_leave_allowed,
            is_leave,is_working_day,
            is_additional_leave,
            is_additional_shift,
            is_additional_day,
            is_absent
          });
        }else{
          data.push({
            name,
            label: name,
            id,
           value:id,
            status: statusValue,
            type: typeValue,
            days_count,
            isEnabled: true,
            warningMessage: warningMessage,
            description:"",
            leaveTypeNote:"",
            maximum_leave_allowed: maximum_leave_allowed,
            is_leave,
            is_working_day,
            is_additional_leave,
            is_additional_shift,
            is_additional_day,
            is_absent
          });
        }
      }
    }
    return {
      data
    }
  }catch(err){
    console.log(err);
  }
  }

  static async leaveType(params) {

    try 
    {
      let { company_id, is_leave, user_id, timeZone } = params;

    
    const where = {};
    
    where.company_id = company_id;
    
    if(Number.isNotNull(is_leave)){
      where.is_leave= true
    }
    
    if(DateTime.isValidDate(params?.date)){
      let day = DateTime.getDayOfWeek(params?.date)
      where.allowed_days= {
        [Op.iLike]: `%${day}%`,
      }
    }

    const query = {
      order: [["cutoff_time", "DESC","NULLS LAST"],["days_count", "ASC"]],
      where,
    };
    
    let endDate = DateTime.GetCurrentDateTime(new Date())
    let hourData = DateTime.getHours(endDate,params?.date)
    let { startDate: startDateValue, endDate: endDateValue } = DateTime.getCustomDateTime(5, timeZone)

      const useDetail = await UserEmployment.findOne({
        where: { user_id: user_id, company_id: company_id },
      });

      const attendanceTypeList = await attendanceType.findAndCountAll(query);

      const data = [];

      const attendanceTypeData = attendanceTypeList && attendanceTypeList.rows;

      if (attendanceTypeData && attendanceTypeData.length > 0  && params?.date !=="" ) {
        for (let i = 0; i < attendanceTypeData.length; i++) {
          const { name, id, status, type, days_count,cutoff_time,maximum_leave_allowed,   is_leave: isLeave,
            is_working_day,
            is_additional_leave,
            is_additional_shift,
            is_additional_day,
            is_absent } = attendanceTypeData[i];

          let warningMessage=""

          let where={}

          where.date = {
            [Op.and]: {
              [Op.gte]: startDateValue,
              [Op.lte]: endDateValue,
            },
          };

          where.company_id = company_id

          if(id){
            where.type = id
          }

          where.login= { [Op.eq]: null }

          const totalCount = await Attendance.count({
            where: where,
          });

          let isEligible=true
          if(cutoff_time && Number.GetFloat(hourData) <= Number.GetFloat(cutoff_time)){
            warningMessage  ="Not Allowed";
            isEligible = false
          }
          if(maximum_leave_allowed && Number.Get(totalCount) >= Number.Get(maximum_leave_allowed)){
            warningMessage = "Not Eligible";
            isEligible = false
          }

          let typeValue = typeOptions.find((data) => data?.value == type);
          let statusValue = statusOptions.find((data) => data?.value == status);

          if (cutoff_time > 0 || maximum_leave_allowed > 0){
            data.push({
              name,
              label: name,
              id,
              value:id,
              status: statusValue,
              type: typeValue,
              days_count,
              isEnabled: isEligible,
              warningMessage: warningMessage,
              formattedSalary: Currency.GetFormatted(Currency.calculateDailySalary(useDetail?.salary, 30) * days_count),
              description:
                days_count > 0
                  ? `${days_count} days salary ${Currency.calculateDailySalary(useDetail?.salary,30) * days_count} will be deducated`
                  : "",
              leaveTypeNote:
                cutoff_time > 0
                  ? `Leave should be applied before ${cutoff_time} hours`
                  : "",
              maximum_leave_allowed: maximum_leave_allowed,
              is_leave: isLeave,
              is_working_day,
              is_additional_leave,
              is_additional_shift,
              is_additional_day,
              is_absent,
              deductedSalary: (Currency.calculateDailySalary(useDetail?.salary,30) * days_count)
            });
          }else{
            data.push({
              name,
              label: name,
              id,
              value:id,
              status: statusValue,
              type: typeValue,
              days_count,
              isEnabled: true,
              warningMessage: warningMessage,
              description:"",
              leaveTypeNote:"",
              maximum_leave_allowed: maximum_leave_allowed,
              is_leave: isLeave,
              is_working_day,
              is_additional_leave,
              is_additional_shift,
              is_additional_day,
              is_absent,
              formattedSalary: Currency.GetFormatted(Currency.calculateDailySalary(useDetail?.salary, 30) * days_count),
              deductedSalary: (Currency.calculateDailySalary(useDetail?.salary,30) * days_count),
              description:
                days_count > 0
                  ? `${days_count} days salary (${Currency.IndianFormat(Currency.calculateDailySalary(useDetail?.salary,30) * days_count)}) will be deducated`
                  : "",
              leaveTypeNote:
                cutoff_time > 0
                  ? `Leave should be applied before ${cutoff_time} hours`
                  : "",
            });
          }
        }
      }

      return {
        data
      }
    }catch(err){
      console.log(err);
    }
  }
 
  static async getAttendanceTypeId (where={}){
    let attendanceTypeList = await attendanceType.findAll({
      order:[["id","DESC"]],
      where: where
    });
    let returnValue = ArrayList.isArray(attendanceTypeList) &&  attendanceTypeList.map((mapData)=> mapData?.id) || []
    return returnValue;
  }

  static async getDaysCountById(params) {
    let { id, company_id } = params;
    let where = {}

    where.company_id = company_id;

    if (Number.isNotNull(id)) {
      where.id = id;
    }

    let attendanceTypeDetail = await attendanceType.findOne({
      where: where
    });

    return attendanceTypeDetail && attendanceTypeDetail?.days_count;
  }


}

module.exports = AttendanceTypeService;
