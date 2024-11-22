const { defaultDateFormat } = require("../../lib/utils");
const { QueryTypes } = require("sequelize");
const Permission = require("../../helpers/Permission");
const Request = require("../../lib/request");
const String = require('../../lib/string');
const DateTime = require("../../lib/dateTime");
const db = require("../../db");
const ArrayList = require("../../lib/ArrayList");
const Number = require("../../lib/Number");

async function search(req, res, next) {
  try {
    //Permission Check
    const hasPermissions = await Permission.Has(Permission.USER_VIEW, req);
    const manageOthersPermission = await Permission.Has(Permission.USER_MANAGE_OTHERS, req);
   

    let { page, pageSize, search, status, sort, sortDir,  role, role_id } = req.query;

    let timeZone = Request.getTimeZone(req)


    const companyId = Request.GetCompanyId(req);
    const userId = Request.getUserId(req);

    if (!companyId) {
      return res.json(404, { message: "Company Id Not Found" });
    }

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(400, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(400, { message: "Invalid page size" });
    }

    const validOrder = ["ASC", "DESC"];
    const sortableFields = {
      id:"id",
      name: "name",
      last_name: "last_name",
      role_name: "role_name",
      created_at: "created_at",
      updatedAt: "updatedAt",
      status: "status",
      last_loggedin_at:"last_loggedin_at",
      last_check_in:"last_check_in",
      date_of_joining : "date_of_joining",
      date_of_leaving : "date_of_leaving",
      leave_balance : "leave_balance",
      primary_shift_id: "primary_shift_id",
      primary_location_id: "primary_location_id",
      salary:"salary",
      current_location_id: "current_location_id",
      current_shift_id: "current_shift_id"
    };

    const sortParam = sort || "name";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(400, { message: `Unable to sort user by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(400, { message: "Invalid sort order" });
    }

    const searchTerm = search ? search.trim() : null;
    let whereClause=''

    if(Number.isNotNull(status)){
      whereClause += ` AND "user_index"."status" = ${status}`
    }

    if(!manageOthersPermission){
      whereClause += ` AND "user_index"."user_id" = ${userId}`
    }

    if(Number.isNotNull(role) || role_id){
      whereClause += ` AND "user_index"."role_id" = ${role ? role:role_id}`
    }

    searchTerm  ? whereClause += ` AND ("user_index"."first_name" ILIKE '%${searchTerm}%' OR "user_index"."last_name" ILIKE '%${searchTerm}%' OR "user_index"."email" ILIKE '%${searchTerm}%' OR "user_index"."mobile_number1" ILIKE '%${searchTerm}%' OR "user_index"."mobile_number2" ILIKE '%${searchTerm}%')` : ""

   

    let sortColumn = ""

    if(sortParam == "name"){
      sortColumn=` "user_index"."first_name"`
    }

    if(sortParam == "primary_location_id"){
      sortColumn=` primaryLocation."name"`
    }

    if(sortParam == "primary_shift_id"){
      sortColumn=` primaryShift."name"`
    }

    if(sortParam == "leave_balance"){
      sortColumn=` userEmployment."leave_balance"`
    }

    if(sortParam == "last_check_in"){
      sortColumn=` attendance."login"`
    }

    if(sortParam == "date_of_leaving"){
      sortColumn=` userEmployment."end_date"`
    }

    if(sortParam == "salary"){
      sortColumn=` userEmployment."salary"`
    }

    if(sortParam == "current_location_id"){
      sortColumn=` currentLocation."name"`
    }

    if(sortParam == "current_shift_id"){
      sortColumn=` currentShift."name"`
    }

    if(sortParam !== "salary" && sortParam !== "last_check_in" && sortParam !== "date_of_leaving" && sortParam !== "leave_balance" && sortParam !== "name" && sortParam !== "primary_shift_id" && sortParam !== "primary_location_id" && sortParam !== "current_location_id" && sortParam !== "current_shift_id"){
      sortColumn=` "user_index".${sortParam}`
    }

    let limitClause=''
    if(pageSize > 0){
      limitClause += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}  `
    }


    const rawQuery = `
    WITH recent_attendance AS (
      SELECT
        attendance.*,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date DESC) AS rn
      FROM
        attendance
      WHERE
        attendance.login IS NOT NULL
    )
    SELECT 
      "user_index".*,
      attendance."login" AS login,
      userEmployment."salary" AS salary,
      userEmployment."start_date" AS start_date,
      userEmployment."end_date" AS end_date,
      userEmployment."leave_balance" AS leave_balance,
      primaryShift."name" AS primary_shift_name,
      primaryLocation."name" AS primary_location_name,
      currentShift."name" AS current_shift_name,
      currentLocation."name" AS current_location_name,
      COUNT(*) OVER() AS total_count
    FROM
      "user_index"
    LEFT JOIN
      recent_attendance attendance ON "user_index"."user_id" = attendance."user_id" AND attendance.rn = 1
    LEFT JOIN
      "user_employment" userEmployment ON "user_index"."user_id" = userEmployment."user_id"
    LEFT JOIN
      "shift" primaryShift ON "user_index"."primary_shift_id" = primaryShift."id"
    LEFT JOIN
      "store" primaryLocation ON "user_index"."primary_location_id" = primaryLocation."id"
    LEFT JOIN
      "shift" currentShift ON "user_index"."current_shift_id" = currentShift."id"
    LEFT JOIN
      "store" currentLocation ON "user_index"."current_location_id" = currentLocation."id"
    WHERE
      "user_index"."company_id" = ${companyId}
      AND "user_index"."deleted_at" IS NULL 
      ${whereClause}
       ORDER BY ${sortColumn} ${sortDirParam} ${sortDirParam == "DESC" ? "NULLS LAST":"NULLS FIRST"} 
       ${limitClause}
  `;
  
  
  
  const response = await db.connection.query(rawQuery, {
    type: QueryTypes.SELECT,
  });
  let totalCount =0
  let dataArray=[]
  if(ArrayList.isArray(response)){
    for (let i = 0; i < response.length; i++) {
      let userData = response[i];
      dataArray.push({
        id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        fullname: String.concatName(userData?.first_name, userData?.last_name),
        email: userData.email,
        reset_mobile_data : userData.reset_mobile_data,
        timeZone: userData.time_zone,
        role_name: userData ? userData.role_name : "",
        role_id: userData.role_id,
        slack_id: userData.slack_id,
        avatarUrl: userData.media_url,
        status: userData.status,
        userImage: userData.media_url,
        mobileNumber1: userData.mobile_number1,
        last_loggedin_at: DateTime.getDateTimeByUserProfileTimezone(userData?.last_loggedin_at,timeZone),
        address1: userData.address1,
        address2: userData.address2,
        city: userData.city,
        state: userData.state,
        country: userData.country,
        pin_code: userData.pin_code,
        last_check_in: userData?.login ? DateTime.getDateTimeByUserProfileTimezone(userData?.login,timeZone) : "",
        created_at: defaultDateFormat(userData.created_at),
        updatedAt: defaultDateFormat(userData.updated_at),
        leave_balance: userData?.leave_balance,
        salary: userData && userData?.salary ? userData?.salary : '',
        date_of_joining: userData && defaultDateFormat(userData?.start_date),
        date_of_leaving: userData && defaultDateFormat(userData?.end_date),
        primary_location:  userData?.primary_location_name,
        primary_shift:  userData?.primary_shift_name,
        current_location: userData?.current_location_name,
        current_shift: userData?.current_shift_name,
        allow_leave: userData?.allow_leave == true ? "Enabled" : userData?.allow_leave == false ? "Disabled": ""
      });
      totalCount = userData?.total_count
    }
  }

        res.send({
          totalCount: totalCount,
          currentPage: page,
          pageSize,
          data: dataArray,
        });
  
  } catch (err) {
    console.log(err);
  }
}

module.exports = search;
