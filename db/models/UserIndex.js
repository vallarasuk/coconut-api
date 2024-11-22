module.exports = (sequelize, DataTypes) => {
  const UserProfileStatus = require("./UserProfileStatus")(
    sequelize,
    DataTypes
  );
  const UserEmployment = require("./UserEmployment")(sequelize, DataTypes);
  const Address = require("./AddressModel")(sequelize, DataTypes);
  const shift = require("./Shift")(sequelize, DataTypes);
  const location = require("./Location")(sequelize, DataTypes);

  const UserIndex = sequelize.define(
    "UserIndex",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      force_logout : {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      profile_photo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      active: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      available_leave_balance: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      login_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },

      session_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_loggedin_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      date_of_joining: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      status: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      force_daily_update: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      allow_manual_login: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      slack_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mobile_number1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mobile_number2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pin_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      media_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      media_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      time_zone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      force_sync: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      role_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role_permission: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reset_mobile_data: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_shift_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      account_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      last_checkin_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      allow_leave: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
    },
    {
      tableName: "user_index",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  UserIndex.belongsTo(UserEmployment, {
    as: "UserEmployment",
    foreignKey: "user_id",
    targetKey: "user_id",
  });
  UserIndex.belongsTo(Address, {
    as: "addressDetail",
    foreignKey: "id",
    targetKey: "object_id",
  });
  UserIndex.belongsTo(shift, {
    as: "primaryShift",
    foreignKey: "primary_shift_id",
  });
  UserIndex.belongsTo(location, {
    as: "primaryLocation",
    foreignKey: "primary_location_id",
  });
  return UserIndex;
};
