"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Console log
      console.log("Altering account_product table - Renaming column from cost_price to last_purchased_price");
      
      // Defining the table
      const tableDefinition = await queryInterface.describeTable("account_product");

      // Condition for renaming the column from cost_price to last_purchased_price
      if (tableDefinition && tableDefinition["cost_price"]) {
        await queryInterface.renameColumn("account_product", "cost_price", "last_purchased_price");
        console.log("Column cost_price renamed to last_purchased_price.");
      } else {
        console.log("Column cost_price does not exist. Skipping rename.");
      }
     
      // Add the last_purchased_margin_percentage column if it doesn't exist
      if (tableDefinition && !tableDefinition["last_purchased_margin_percentage"]) {
        await queryInterface.addColumn("account_product", "last_purchased_margin_percentage", {
          type: Sequelize.STRING,
        });
        console.log("Column last_purchased_margin_percentage added.");
      } else {
        console.log("Column last_purchased_margin_percentage already exists. Skipping addition.");
      }
    } catch (err) {
      console.error("Error in up migration:", err);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Defining the table
      const tableDefinition = await queryInterface.describeTable("account_product");
      
      // Condition for renaming the column back from last_purchased_price to cost_price
      if (tableDefinition && tableDefinition["last_purchased_price"]) {
        await queryInterface.renameColumn("account_product", "last_purchased_price", "cost_price");
        console.log("Column last_purchased_price renamed back to cost_price.");
      } else {
        console.log("Column last_purchased_price does not exist. Skipping rename.");
      }

      // Remove the last_purchased_margin_percentage column if it exists
      if (tableDefinition && tableDefinition["last_purchased_margin_percentage"]) {
        await queryInterface.removeColumn("account_product", "last_purchased_margin_percentage");
        console.log("Column last_purchased_margin_percentage removed.");
      } else {
        console.log("Column last_purchased_margin_percentage does not exist. Skipping removal.");
      }
    } catch (err) {
      console.error("Error in down migration:", err);
    }
  }
};
