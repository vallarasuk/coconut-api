module.exports = (sequelize, DataTypes) => {
	const Shift = sequelize.define("shift", {
		id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false
		},
		status: {
			type: DataTypes.STRING,
			allowNull: false
		},
        start_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
		checkin_allowed_from: {
            type: DataTypes.TIME,
            allowNull: true,
        },
		checkin_allowed_till: {
            type: DataTypes.TIME,
            allowNull: true,
        },
		company_id : {
			type: DataTypes.INTEGER,  
			allowNull: false
		},
        createdAt: {
            allowNull: false,
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
		grace_period : {
			type: DataTypes.INTEGER,  
			allowNull: true
		},
		cutoff_time : {
			type: DataTypes.INTEGER,  
			allowNull: true
		},
	}, {
		tableName: "shift",
		timestamps: true,
		createdAt: "createdAt",
		updatedAt: "updatedAt",
		deletedAt: "deletedAt",
		paranoid: true,
	});

	return Shift;
};
