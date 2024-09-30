"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("account_vendor");

        if (tableDefinition && !tableDefinition["company_id"]) {
            await queryInterface.addColumn("account_vendor", "company_id", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        if (tableDefinition && !tableDefinition["portal_id"]) {
          await queryInterface.addColumn("account_vendor", "portal_id", {
              type: Sequelize.INTEGER,
              allowNull: true,
          });
      }
    },

    down: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("account_vendor");

        if (tableDefinition && tableDefinition["company_id"]) {
            await queryInterface.removeColumn("account_vendor", "company_id");
        }
        if (tableDefinition && tableDefinition["portal_id"]) {
          await queryInterface.removeColumn("account_vendor", "portal_id");
      }
    },
};
