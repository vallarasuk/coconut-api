"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Console log
      console.log("Altering store_product table - Adding last_return_date");

      // Defining the table
      const tableDefinition = await queryInterface.describeTable(
        "store_product"
      );

      // Condition for adding the last_return_date and last_return_date.0 column if it doesn't exist in the table
      if (tableDefinition && !tableDefinition["last_return_date"]) {
        await queryInterface.addColumn("store_product", "last_return_date", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
    } catch (err) {
      console.log(err);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Defining the table
      const tableDefinition = await queryInterface.describeTable(
        "store_product"
      );

      // Condition for removing the last_return_date and last_return_date column if it's exist in the table
      if (tableDefinition && tableDefinition["last_return_date"]) {
        await queryInterface.removeColumn("store_product", "last_return_date");
      }
    } catch (err) {
      console.log(err);
    }
  },
};
