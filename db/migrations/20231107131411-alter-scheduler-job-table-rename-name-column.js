"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log("Altering scheduler_job table - Renaming column name to job_name");

      // Check the table definition
      const tableDefinition = await queryInterface.describeTable("scheduler_job");

      // Check if the column 'name' exists and 'job_name' does not exist
      if (tableDefinition["name"] && !tableDefinition["job_name"]) {
        return queryInterface.renameColumn("scheduler_job", "name", "job_name");
      } else {
        console.log("Column 'name' does not exist or column 'job_name' already exists.");
        return Promise.resolve(true);
      }
    } catch (err) {
      console.error("Error in migration:", err);
    }
  },
};
