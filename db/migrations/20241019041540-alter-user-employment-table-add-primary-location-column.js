"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
      try {
        
        const tableDefinition = await queryInterface.describeTable("user_employment");

        if (tableDefinition && !tableDefinition["primary_location"]) {
            await queryInterface.addColumn("user_employment", "primary_location", {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (tableDefinition && !tableDefinition["primary_shift"]) {
          await queryInterface.addColumn("user_employment", "primary_shift", {
              type: Sequelize.INTEGER,
              allowNull: true,
          });
      }
      } catch(err) {
        console.log(err);
      }
    },

    down: async (queryInterface, Sequelize) => {
        const tableDefinition = await queryInterface.describeTable("user_employment");

        if (tableDefinition && tableDefinition["primary_location"]) {
            await queryInterface.removeColumn("user_employment", "primary_location", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
        }

        if (tableDefinition && tableDefinition["primary_shift"]) {
          await queryInterface.removeColumn("user_employment", "primary_shift", {
          type: Sequelize.INTEGER,
          allowNull: true,
      });
      }
    },
};
