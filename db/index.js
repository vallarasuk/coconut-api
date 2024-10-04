const Sequelize = require("sequelize");
const config = require("../lib/config").database;

const db = {};

db.connection = new Sequelize(config.databaseUrl, {
	dialect: 'postgres',
	dialectOptions: {
		ssl: config.ssl || false
	},  
	pool: {
		max: config.poolMax,
		min: config.poolMin,
		acquire: config.poolAcquire,
		idle: config.poolIdle
	},
});

db.models = require("./models")(db.connection, Sequelize);

db.sequelize = Sequelize;

db.service = require("../service");
console.log("db------------------------", db)


db.connect = (callback) => {
	console.log("callback------------------------", callback)

	db.connection.authenticate()
.then(() => callback())
.catch((err) => callback(err));
};

module.exports = db;
