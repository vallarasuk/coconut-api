"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log("Checking if 'sale_invoice' table exists...");
      
      // Check if the table exists using raw SQL query
      const [result] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name = 'sale_invoice'
        );
      `);

      if (result.exists) {
        console.log("Altering column 'status' in 'sale_invoice' table...");
        
        // Now that we know the table exists, we can safely describe it
        const tableDefinition = await queryInterface.describeTable("sale_invoice");

        if ("status" in tableDefinition) {
          await queryInterface.changeColumn("sale_invoice", "status", {
            type: Sequelize.INTEGER,
            allowNull: true, // Adjust based on your requirements
          });
          console.log("Column 'status' altered successfully.");
        } else {
          console.log("Column 'status' does not exist in 'sale_invoice' table.");
        }
      } else {
        console.log("Table 'sale_invoice' does not exist. Skipping column alteration.");
      }
    } catch (error) {
      console.error("Error in migration:", error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log("Reverting changes for column 'status' in 'sale_invoice' table...");
      
      // Check if the table exists using raw SQL query
      const [result] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name = 'sale_invoice'
        );
      `);

      if (result.exists) {
        // Now that we know the table exists, we can safely describe it
        const tableDefinition = await queryInterface.describeTable("sale_invoice");

        if ("status" in tableDefinition) {
          await queryInterface.changeColumn("sale_invoice", "status", {
            type: Sequelize.INTEGER,
            allowNull: false, // Adjust based on your original requirements
          });
          console.log("Column 'status' reverted successfully.");
        } else {
          console.log("Column 'status' does not exist in 'sale_invoice' table. Skipping revert.");
        }
      } else {
        console.log("Table 'sale_invoice' does not exist. Skipping column revert.");
      }
    } catch (error) {
      console.error("Error in reverting migration:", error);
    }
  }
};
