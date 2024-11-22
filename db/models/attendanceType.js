
module.exports = (sequelize, DataTypes) => {
  
  
    const attendanceType = sequelize.define(
        "attendance_type",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
              },
              name: {
                type: DataTypes.STRING,
                allowNull: true,
              },
              status: {
                type: DataTypes.INTEGER,
                allowNull: false,
              },
              days_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
              },
              company_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
              },
              createdAt: {
                allowNull: true,
                type: DataTypes.DATE,
              },
              updatedAt: {
                allowNull: true,
                type: DataTypes.DATE,
              },
              deletedAt: {
                allowNull: true,
                type: DataTypes.DATE,
              },
              cutoff_time: {
                type: DataTypes.INTEGER,
                allowNull: true,
              },
              maximum_leave_allowed: {
                type: DataTypes.INTEGER,
                allowNull: true,
              },
              allow_late_checkin: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },   
               is_leave: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              is_working_day: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              is_additional_leave: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              is_additional_shift: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              is_additional_day: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              is_absent: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
              },
              allowed_days: {
                type: DataTypes.STRING,
                allowNull: true,
              },
              category: {
                type: DataTypes.INTEGER,
                allowNull: true,
              },
        },
        {
            tableName: "attendance_type",
            timestamps: true,
            paranoid: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
            deletedAt: "deletedAt"
        }
    );
   
  
   
    return attendanceType;
};
