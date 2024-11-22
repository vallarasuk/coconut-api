const { UserDeviceInfo, User, Slack, App: appModel } = require('../db').models;

const Request = require('../lib/request');
const Response = require('../helpers/Response');
const { Op, Sequelize } = require('sequelize');
const String = require('../lib/string');
const Boolean = require('../lib/Boolean');
const validator = require('.././lib/validator');
const DateTime = require('../lib/dateTime');
const History = require('./HistoryService');
const ObjectName = require('../helpers/ObjectName');
const DeviceInfoStatus = require('../helpers/DeviceInfo');
const Permission = require('../helpers/Permission');
const userDeviceinfoEmailService = require('./UserDeviceInfoEmailService');
const SlackService = require('./SlackService');
const Number =require("../lib/Number");
const { getSettingValue } = require("./SettingService");
const { USER_DEFAULT_TIME_ZONE } = require("../helpers/Setting");
const App = require("../helpers/App");

class UserDeviceInfoService {
  static async create(req, res) {
    try {
      const data = req.body;
      const companyId = Request.GetCompanyId(req);
      const ipAddress = Request.getIpAddress(req, res);
      const uniqueId = data?.unique_id;

      let deviceInfoDetail;

      let where = {};
      if (Number.isNotNull(data.brandName)) {
        where.brand_name = data.brandName;
      }

      if (Number.isNotNull(data.unique_id)) {
        where.unique_id = data.unique_id;
      }

      if (Number.isNotNull(data.deviceName)) {
        where.device_name = data.deviceName;
      }
      let appDetails = await appModel.findOne({where : {name_space : data && data.app_id,status : App.STATUS_ACTIVE}})
      let existingDeviceInfo = await UserDeviceInfo.findOne({
        where: {
          ...where,
          user_id: data.user,
          company_id: companyId,
        },
        order:[["created_at","DESC"]]
      });
      if (existingDeviceInfo) {
        existingDeviceInfo.device_name = data.deviceName;
        existingDeviceInfo.brand_name = data.brandName;
        existingDeviceInfo.network_connection = data.network;
        existingDeviceInfo.user_id = data.user;
        existingDeviceInfo.battery_percentage = data.battery;
        existingDeviceInfo.version_number = data.versionNumber;
        existingDeviceInfo.last_logged_in_at = new Date();
        existingDeviceInfo.app_id = appDetails && appDetails.id
        deviceInfoDetail = await existingDeviceInfo.save();
      } else {
        const createData = {
          ip_address: ipAddress,
          device_name: data.deviceName,
          brand_name: data.brandName,
          network_connection: data.network,
          user_id: data.user,
          battery_percentage: data.battery,
          unique_id: uniqueId,
          company_id: companyId,
          status: DeviceInfoStatus.PENDING,
          version_number: data.versionNumber,
          last_logged_in_at: new Date(),
          app_id : appDetails && appDetails.id
        };

        deviceInfoDetail = await UserDeviceInfo.create(createData);
      }

      res.json(200, { message: 'Device Information Added', deviceInfoDetail });
    } catch (err) {
      console.log(err);
      res.json(400, { message: err.message });
    }
  }
  static async update(req, res) {
    try {
      const companyId = Request.GetCompanyId(req);
      const data = req.body;
      const { id } = req.params;

      if (!id) {
        return res.json(Response.BAD_REQUEST, { message: 'Device id is required' });
      }

      const updateData = {
        reset_mobile_data: data?.reset_mobile_data,
      };
     
      const save = await UserDeviceInfo.update(updateData, { where: { id: id } });
      res.json(Response.UPDATE_SUCCESS, {
        message: 'DeviceInfo updated',
      });

      res.on('finish', async () => {
        History.create("DeviceInfo updated", req, ObjectName.USER_INFO, save.id);
      });

      res.json(200, { message: 'Device Information Updated' });
    } catch (err) {
      console.log(err);
    }
  }



  static bulkDelete = async (req, res) => {
    try {
      const ids = req?.body?.selectedId;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid IDs provided" });
      }
  
      const company_id = Request.GetCompanyId(req);
  
      for (const id of ids) {
        await UserDeviceInfo.destroy({ where: { id: id, company_id: company_id } });

        await History.create("Device Information Deleted", req, ObjectName.USER_INFO, id);
      }
  
      res.json(200, { message: 'Device Information Deleted' });
  
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  };

  static async search(req, res, next) {
    let { page, pageSize, search, sort, sortDir, pagination,app_id, startDate, endDate, user, uniqueId, deviceName,brandName } = req.query;

    // Validate if page is not a number
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(page)) {
      return res.json(BAD_REQUEST, { message: 'Invalid page' });
    }

    // Validate if page size is not a number
    pageSize = pageSize ? parseInt(pageSize, 10) : 25;
    if (isNaN(pageSize)) {
      return res.json(BAD_REQUEST, { message: 'Invalid page size' });
    }

    const companyId = req.user && req.user.company_id;

    if (!companyId) {
      return res.json(400, 'Company Not Found');
    }

    // Sortable Fields
    const validOrder = ['ASC', 'DESC'];
    const sortableFields = {
      id:"id",
      ip_address: 'ip_address',
      device_name: 'device_name',
      brand_name: 'brand_name',
      name: 'name',
      network_connection: 'network_connection',
      battery_percentage: 'battery_percentage',
      version_number: 'version_number',
      unique_id: 'unique_id',
      updated_at: 'updated_at',
      last_logged_in_at: 'last_logged_in_at',
      created_at: 'created_at',
    };

    const sortParam = sort || 'created_at';

    // Validate sortable fields is present in sort param
    if (!Object.keys(sortableFields).includes(sortParam)) {
      return res.json(Response.BAD_REQUEST, { message: `Unable to sort userDeviceinfo by ${sortParam}` });
    }

    const sortDirParam = sortDir ? sortDir.toUpperCase() : 'DESC';
    // Validate order is present in sortDir param
    if (!validOrder.includes(sortDirParam)) {
      return res.json(Response.BAD_REQUEST, { message: 'Invalid sort order' });
    }

    const data = req.query;

    const where = {};
    where.company_id = companyId;
    let timeZone = Request.getTimeZone(req);
    let start_date = DateTime.toGetISOStringWithDayStartTime(startDate)
    let end_date = DateTime.toGetISOStringWithDayEndTime(endDate)
    // Search by name

    // Search by status
    const status = data.status;
    if (status) {
      where.status = status;
    }

    if (Number.isNotNull(uniqueId)) {
      where.unique_id = uniqueId;
    }

    if (Number.isNotNull(deviceName)) {
      where.device_name = deviceName;
    }


    if (Number.isNotNull(brandName)) {
      where.brand_name = brandName;
    }
    if (Number.isNotNull(app_id)) {
      where.app_id = app_id
    }


    if (startDate && !endDate) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone)
        },
      };
    }

    if (endDate && !startDate) {
      where.created_at = {
        [Op.and]: {
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }
    if (startDate && endDate) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: DateTime.toGMT(start_date,timeZone),
          [Op.lte]: DateTime.toGMT(end_date,timeZone),
        },
      };
    }
    let date = DateTime.getCustomDateTime(req.query.date, timeZone)

    if (date && Number.isNotNull(req.query.date)) {
      where.created_at = {
        [Op.and]: {
          [Op.gte]: date?.startDate,
          [Op.lte]: date?.endDate,
        },
      };
    }

    // Search term
    const searchTerm = search ? search.trim() : null;
    if (searchTerm) {
      where[Op.or] = [
        {
          brand_name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          '$userDetails.name$': {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }
    if (Number.isNotNull(user)) {
      where.user_id = user;
    }
    const nullsPlacement = sortDirParam === "DESC" ? "NULLS LAST" : "NULLS FIRST";
    const query = {
      order:[
        sortParam !== 'name'
          ? [[sortParam, sortDirParam,nullsPlacement]]
          : [[{ model: User, as: 'userDetails' }, 'name', sortDirParam]]],
      include: [
        {
          required: true,
          model: User,
          as: 'userDetails',
        },
      ],
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

    try {
      // Get Vendor list and count
      const details = await UserDeviceInfo.findAndCountAll(query);
      // Return Vendor list is null
      if (details.count === 0) {
        return res.json({ message: 'UserDevice Info  not found' });
      }
      let userDeviceInfoList = details && details?.rows;
      const data = [];

      if(userDeviceInfoList && userDeviceInfoList.length > 0){
        for (let i = 0; i < userDeviceInfoList.length; i++) {
          let {
            id,
            ip_address,
            device_name,
            brand_name,
            network_connection,
            userDetails,
            battery_percentage,
            version_number,
            created_at,
            status,
            unique_id,
            last_logged_in_at,
            reset_mobile_data
          } = userDeviceInfoList[i];

          data.push({
            device_info_id: id,
            id: id,
            ip_address,
            device_name,
            brand_name,
            network_connection: network_connection === true ? 'Connected' : 'Not connected',
            user_id: userDetails.id,
            first_name: userDetails.name,
            last_name: userDetails.last_name,
            avatarUrl: userDetails.media_url,
            user_id: userDetails.id,
            battery_percentage,
            version_number,
            uniqueId: unique_id,
            reset_mobile_data,
            created_at,
            status:
              status == DeviceInfoStatus.PENDING
                ? DeviceInfoStatus.STATUS_PENDING
                : status == DeviceInfoStatus.APPROVED
                ? DeviceInfoStatus.STATUS_APPROVED
                : status == DeviceInfoStatus.BLOCKED
                ? DeviceInfoStatus.STATUS_BLOCKED
                : '',
            lastLoggedInAt: last_logged_in_at,
          });
          
        }
      }

   

      res.json(Response.OK, {
        totalCount: details.count,
        currentPage: page,
        pageSize,
        data,
        search,
        sort,
        sortDir,
      });
    } catch (err) {
      console.log(err);
      res.json(Response.OK, { message: err.message });
    }
  }

  static async statusUpdate(req, res) {
    try {
      const companyId = Request.GetCompanyId(req);
      const hasPermission = await Permission.Has(Permission.DEVICE_INFO_STATUS_UPDATE, req);
     

      const data = req.body;
      const { id } = req.params;

      if (!id) {
        return res.json(Response.BAD_REQUEST, { message: 'Device id is required' });
      }

      const updateData = {
        status: data,
      };
      const deviceInfo = await UserDeviceInfo.findOne({
        where: { id: id },
        attributes: ['user_id', 'device_name'],
      });
      const userId = deviceInfo?.dataValues?.user_id;
      const slackInfo = await Slack.findOne({ where: { object_id: userId }, attributes: ["slack_id"] });
      const slackId = slackInfo?.dataValues?.slack_id;
      const save = await UserDeviceInfo.update(updateData, { where: { id: id } });

      if (Response.UPDATE_SUCCESS) {
        let status = '';
        if (data == DeviceInfoStatus.BLOCKED) {
          status = DeviceInfoStatus.STATUS_BLOCKED;
        }
        if (data == DeviceInfoStatus.APPROVED) {
          status = DeviceInfoStatus.STATUS_APPROVED;
        }
        if (status) {
          userDeviceinfoEmailService.sendEmail(status, companyId, userId);
          SlackService.sendMessageToUser(companyId, slackId, ` your device is ${status}`);
        }
      }
      res.json(Response.UPDATE_SUCCESS, {
        message: 'DeviceInfo updated',
      });

      res.on('finish', async () => {
        History.create("DeviceInfo updated", req, ObjectName.USER_INFO, save.id);
      });

      res.json(200, { message: 'Device Information Added' });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = UserDeviceInfoService;
