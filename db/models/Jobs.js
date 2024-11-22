module.exports = (sequelize, DataTypes) =>{
	const Tag = require("./Tag")(sequelize, DataTypes);
const Jobs = sequelize.define("jobs", {
		id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true
		},
		category: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		sub_category: {
			type: DataTypes.STRING,
			allowNull: true
		},
		job_title: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		slug: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		job_type: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		location: {
			type: DataTypes.STRING,
			allowNull: true
		},
		experience: {
			type: DataTypes.STRING,
			allowNull: true
		},
		sort: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		},
		job_description: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		mandatory_skills: {
			type: DataTypes.STRING,
			allowNull: true
		},
		responsibilities: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		requirements: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		minimum_experience: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		maximum_experience: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		maximum_salary: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		course_name: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		project_name: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		
		show_project_details: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_course_details: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_current_address: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_home_town_address: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_skills: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_expected_salary: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_current_salary: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_employment_eligibility: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_employment: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		show_vaccine_status: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: 0.00
		},
		fields: {
			type: DataTypes.STRING,
			allowNull: true
		},
		company_id : {
			type: DataTypes.INTEGER,  
			allowNull: false
		},
	}, {
		tableName: "jobs",
		timestamps: true,
		createdAt: "created_at",
		updatedAt: false,
		deletedAt: false
	});

	Jobs.belongsTo(Tag, {
		as: "categoryDetails",
		foreignKey: "category",
		
	  });
	
	 return Jobs;
	}