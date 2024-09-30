"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("activity_type");

        if (tableDefinition && !tableDefinition["company_id"]) {
            await queryInterface.addColumn("activity_type", "company_id", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        if (tableDefinition && !tableDefinition["portal_id"]) {
          await queryInterface.addColumn("activity_type", "portal_id", {
              type: Sequelize.INTEGER,
              allowNull: true,
          });
      }
    },

    down: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("activity_type");

        if (tableDefinition && tableDefinition["company_id"]) {
            await queryInterface.removeColumn("activity_type", "company_id");
        }
        if (tableDefinition && tableDefinition["portal_id"]) {
          await queryInterface.removeColumn("activity_type", "portal_id");
      }
    },
};
