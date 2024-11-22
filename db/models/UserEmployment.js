const Tag = require("./Tag");

module.exports = (sequelize, DataTypes) => {
    const location = require("./Location")(sequelize, DataTypes);
    const Tag = require("./Tag")(sequelize, DataTypes);

    const shift = require("./Shift")(sequelize, DataTypes)
    const UserEmployment = sequelize.define(
        "user_employment",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            start_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            designation: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            end_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            salary: {
                type: DataTypes.NUMERIC,
                allowNull: true,
            },
            company_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            created_at: {
                allowNull: false,
                type: DataTypes.DATE,
            },
            updated_at: {
                allowNull: true,
                type: DataTypes.DATE,
            },
            deleted_at: {
                allowNull: true,
                type: DataTypes.DATE,
            },
            working_days: {
                type: DataTypes.STRING,
                allowNull: true
            },
            leave_balance: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            leave_balance_updated_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            manager: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            primary_location: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            primary_shift: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            tableName: "user_employment",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: false,
        }
    );
    UserEmployment.belongsTo(Tag, {
        as: "tagDetail",
        foreignKey: "designation"
    })
    return UserEmployment;
};
