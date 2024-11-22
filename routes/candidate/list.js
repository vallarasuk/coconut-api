const { getMediaUrl } = require("../../lib/utils");
const utils = require("../../lib/utils");

const { Candidate, status: statusModal, Media: MediaModal } = require("../../db").models;
const { Op } = require("sequelize");
const ObjectName = require("../../helpers/ObjectName");
const DateTime = require("../../lib/dateTime");
const dateTime = new DateTime();
const validator = require('../../lib/validator');
const MediaService = require("../../services/MediaService");
const Number = require("../../lib/Number");
const Request = require("../../lib/request");




async function list(req, res, next) {
  try {
    const data = req.query;

    let { page, pageSize, search, sort, sortDir, startDate, endDate, pagination } = data;

    let companyId = Request.GetCompanyId(req);
    let timeZone = Request.getTimeZone(req);
    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(400, { message: "Invalid page" });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(404, { message: "Invalid page size" });
    }

    const validOrder = ["ASC", "DESC"];

    const sortableFields = {
      id: "id",
      first_name: "first_name",
      email: "email",
      gender: "gender",
      interview_date: "interview_date",
      marital_status: "marital_status",
      position: "position",
      phone: "phone",
      qualification: "qualification",
      created_at: "created_at",
      updatedAt: "updatedAt",
      status: "status",
      statusText: "statusText"
    };

    const sortParam = sort || "created_at";
    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(400, { message: `Unable to sort tag by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : "DESC";
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(400, { message: "Invalid sort order" });
    }


    // Search by term
    const searchTerm = search ? search.trim() : null;
    const query = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: sort == "statusText" ? [["statusDetail", "name", sortDirParam]] : [[sortParam, sortDirParam]],
      where: {
        company_id: companyId
      },
      include: [
        {
          required: false,
          model: statusModal,
          as: "statusDetail",


        },
        {
          required: false,
          model: MediaModal,
          as: "media",
        },

      ]
    };

    if (searchTerm) {
      query.where[Op.or] = [
        {
          first_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          last_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          email: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          phone: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },

      ];
    }
    if (startDate && !endDate) {
      query.where.created_at = {
        [Op.and]: {
          [Op.gte]: startDate,
        },
      };
    }

    if (endDate && !startDate) {
      query.where.created_at = {
        [Op.and]: {
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate)
        },
      };
    }

    if (startDate && endDate) {
      query.where.created_at = {
        [Op.and]: {
          [Op.gte]: startDate,
          [Op.lte]: DateTime.toGetISOStringWithDayEndTime(endDate),
        },
      };
    }

    const firstName = data.firstName;
    if (firstName) {
      query.where.first_name = { [Op.like]: `%${firstName}%` };
    }
    const lastName = data.lastName;
    if (lastName) {
      query.where.last_name = { [Op.like]: `%${lastName}%` };
    }

    const email = data.email;
    if (email) {
      query.where.email = { [Op.like]: `%${email}%` };
    }

    const currentCity = data.currentCity;
    if (currentCity) {
      query.where.current_city = { $in: currentCity.split(",") };
    }

    const phone = data.phone;
    if (phone) {
      query.where.phone = { [Op.like]: `%${phone}%` };
    }

    const knownLanguages = data.knownLanguages;
    if (knownLanguages) {
      query.where.known_languages = { [Op.like]: `%${knownLanguages}%` };
    }

    const status = data.status;
    if (Number.Get(status)) {
      query.where.status = Number.Get(status)
    }
    if (Number.Get(data.owner_id)) {
      query.where.owner_id = Number.Get(data.owner_id)
    }

    const yearOfPassing = data.yearOfPassing;
    if (yearOfPassing) {
      query.where.year_of_passing = { [Op.like]: `%${yearOfPassing}%` };
    }

    const qualification = data.qualification;
    if (qualification) {
      query.where.qualification = { $in: qualification.split(",") };
    }

    const experienceYear = data.experienceYear;
    if (experienceYear) {
      query.where.overall_experience = { [Op.like]: `%${experienceYear}%` };
    }

    const year_of_passing = data.year_of_passing;
    if (year_of_passing) {
      query.where.year_of_passing = { [Op.like]: `%${year_of_passing}%` };
    }

    const position = data.position;
    if (position) {
      query.where.position = { $in: position.split(",") };
    }

    const currentSalaryFrom = data.currentSalaryFrom;
    if (currentSalaryFrom) {
      query.where.current_salary = { $gte: `${currentSalaryFrom}` };
    }
    const currentSalaryTo = data.currentSalaryTo;
    if (currentSalaryTo) {
      query.where.current_salary = { $lte: `${currentSalaryTo}` };
    }

    if (currentSalaryFrom && currentSalaryTo) {
      query.where.current_salary = {
        $gte: `${currentSalaryFrom}`,
        $lte: `${currentSalaryTo}`,
      };
    }

    const expectedSalaryFrom = data.expectedSalaryFrom;
    if (expectedSalaryFrom) {
      query.where.expected_salary = { $gte: `${expectedSalaryFrom}` };
    }

    const expectedSalaryTo = data.expectedSalaryTo;
    if (expectedSalaryTo) {
      query.where.expected_salary = { $lte: `${expectedSalaryTo}` };
    }

    if (expectedSalaryFrom && expectedSalaryTo) {
      query.where.expected_salary = {
        $gte: `${expectedSalaryFrom}`,
        $lte: `${expectedSalaryTo}`,
      };
    }

    const gender = data.gender;
    if (gender) {
      query.where.gender = { $in: gender.split(",") };
    }

    const currentState = data.currentState;
    if (currentState) {
      query.where.current_state = { $in: currentState.split(",") };
    }

    const permanentCity = data.permanentCity;
    if (permanentCity) {
      query.where.permanent_city = { $in: permanentCity.split(",") };
    }
    const percentage = data.percentage;
    if (percentage) {
      query.where.percentage = { [Op.like]: `%${percentage}%` };
    }

    const startAppliedDate = data.startAppliedDate;
    const endAppliedDate = data.endAppliedDate;
    const appliedDate = utils.getDateFilter(
      "",
      startAppliedDate,
      endAppliedDate,
      true
    );
    if (appliedDate) {
      query.where = { created_at: appliedDate };
    }

    const startInterviewDate = data.startInterviewDate;
    const endInterviewDate = data.endInterviewDate;
    const interviewDate = utils.getDateFilter(
      "",
      startInterviewDate,
      endInterviewDate
    );
    if (interviewDate) {
      query.where.interview_date = interviewDate;
    }


    let candidates = await Candidate.findAndCountAll(query);

    let candidatesList = candidates && candidates.rows;
    const candidateList = [];

    for (let i = 0; i < candidatesList.length; i++) {
      const candidate = candidatesList[i];
      let mediaUrl
      let mediaData = await MediaModal.findAll({
        where: { company_id: companyId, object_name: ObjectName.CANDIDATE, object_id: candidate.id },
        order: [["createdAt", "ASC"]],
      });
      for (let i = 0; i < mediaData.length; i++) {
        const { id } = mediaData[i];
        let imageUrl = await MediaService.getMediaURL(id, companyId);

        if (validator.isImageFormat(imageUrl)) {
          mediaUrl = imageUrl;
        }
      }
      let data = {
        candidateId: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        status: candidate?.statusDetail?.id,
        statusColor: candidate?.statusDetail?.color_code,
        notes: candidate?.notes,
        owner_id: candidate?.owner_id,
        profilePhotoUrl: utils.getCandidateMediaUrl(candidate.avatar),
        phone: candidate.phone,
        gender: candidate.gender,
        candidate_url: mediaUrl,
        maritalStatus: candidate.marital_status,
        email: candidate.email,
        knownLanguages: candidate.known_languages,
        currentAddress: candidate.current_address,
        currentArea: candidate.current_area,
        currentCity: candidate.current_city,
        currentState: candidate.current_state,
        currentPincode: candidate.current_pincode,
        permanentAddress: candidate.permanent_address,
        permanentArea: candidate.permanent_area,
        permanentCity: candidate.permanent_city,
        permanentState: candidate.permanent_state,
        permanentPincode: candidate.permanent_pincode,
        qualification: candidate.qualification,
        department: candidate.department,
        yearOfPassing: candidate.year_of_passing,
        position: candidate.position,
        percentage: candidate.percentage,
        overallExperience: candidate.overall_experience,
        currentSalary: candidate.current_salary,
        expectedSalary: candidate.expected_salary,
        projectTitle: candidate.project_title,
        projectPeriod: candidate.project_period,
        projectDescription: candidate.project_description,
        courseName: candidate.course_name,
        coursePeriod: candidate.course_period,
        courseInstitution: candidate.course_institution,
        message: candidate.message,
        file: candidate.file,
        filePath: utils.getFileUrl(candidate.file),
        token: candidate.token,
        statusText: candidate?.statusDetail?.name,
        relevantExperience: candidate.relevant_experience,
        formattedDate: utils.formatLocalDate(candidate.created_at, dateTime.formats.frontendDateTime12HoursFormat),
        positionType: candidate.position_type,
        dob: candidate.dob,
        formattedDOBDate: utils.formatDate(candidate.dob, "DD-MMM-YYYY"),
        expectedCostPerHour: candidate.expected_cost_per_hour,
        age: candidate?.age,
        createdAt: DateTime.getDateTimeByUserProfileTimezone(candidate.created_at, timeZone),
        interviewDate: candidate?.interview_date ? DateTime.getSQlFormattedDate(candidate?.interview_date) : "",
        stayingWith: candidate.staying_with,
        profile_image_url: mediaUrl && validator.isImageFormat(mediaUrl) ? mediaUrl : "",
        file_url: mediaUrl && validator.isPdfFormat(mediaUrl) ? mediaUrl : ""
      };
      candidateList.push(data);

    }

    const { count, currentPage, lastPage, pageStart, pageEnd } =
      utils.getPageDetails(
        candidates.count,
        page,
        pageSize,
        candidateList.length
      );

    res.json({
      totalCount: count,
      currentPage: currentPage,
      pageSize,
      data: candidateList,
    });
  } catch (err) {
    console.log(err)
  }

}

module.exports = list;
