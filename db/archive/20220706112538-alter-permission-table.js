"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("permission");

        if (tableDefinition && !tableDefinition["company_id"]) {
            await queryInterface.addColumn("permission", "company_id", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        if (tableDefinition && !tableDefinition["portal_id"]) {
          await queryInterface.addColumn("permission", "portal_id", {
              type: Sequelize.INTEGER,
              allowNull: true,
          });
      }
    },

    down: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("permission");

        if (tableDefinition && tableDefinition["company_id"]) {
            await queryInterface.removeColumn("permission", "company_id");
        }
        if (tableDefinition && tableDefinition["portal_id"]) {
          await queryInterface.removeColumn("permission", "portal_id");
      }
    },
};
