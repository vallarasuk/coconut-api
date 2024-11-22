const AttendanceService = require("../../services/AttendanceService")


const leaveValidation =async (req,res,next)=>{
    await AttendanceService.leaveValidation(req,res,next)
}

module.exports =leaveValidation