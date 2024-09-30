'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("product_index");
    if (tableDefinition && !tableDefinition["manufacture_name"]) {
      await queryInterface.addColumn("product_index", "manufacture_name", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (tableDefinition && !tableDefinition["manufacture_id"]) {
      await queryInterface.addColumn("product_index", "manufacture_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("product_index");
    if (tableDefinition && tableDefinition["manufacture_name"]) {
      await queryInterface.removeColumn("product_index", "manufacture_name");
    }
    if (tableDefinition && tableDefinition["manufacture"]) {
      await queryInterface.removeColumn("product_index", "manufacture_id");
    }
  },
};
