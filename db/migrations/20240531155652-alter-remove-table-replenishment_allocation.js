"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log("Attempting to drop the 'replenishment_allocation' table...");

      // Check if the table exists
      const tableExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables 
          WHERE table_name = 'replenishment_allocation'
        );
      `);

      if (tableExists[0][0].exists) {
        await queryInterface.dropTable("replenishment_allocation");
        console.log("Table 'replenishment_allocation' dropped successfully.");
      } else {
        console.log("Table 'replenishment_allocation' does not exist. Skipping drop.");
      }
    } catch (err) {
      console.error("Error dropping table 'replenishment_allocation':", err);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log("Attempting to recreate the 'replenishment_allocation' table...");
      await queryInterface.createTable("replenishment_allocation", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        // Define other columns here as per your requirements
      });

      console.log("Table 'replenishment_allocation' recreated successfully.");
    } catch (err) {
      console.error("Error recreating table 'replenishment_allocation':", err);
    }
  }
};
