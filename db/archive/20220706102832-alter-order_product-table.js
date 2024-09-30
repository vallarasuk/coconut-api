"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("order_product");

        if (tableDefinition && !tableDefinition["company_id"]) {
            await queryInterface.addColumn("order_product", "company_id", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        if (tableDefinition && !tableDefinition["portal_id"]) {
          await queryInterface.addColumn("order_product", "portal_id", {
              type: Sequelize.INTEGER,
              allowNull: true,
          });
      }
    },

    down: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("order_product");

        if (tableDefinition && tableDefinition["company_id"]) {
            await queryInterface.removeColumn("order_product", "company_id");
        }
        if (tableDefinition && tableDefinition["portal_id"]) {
          await queryInterface.removeColumn("order_product", "portal_id");
      }
    },
};