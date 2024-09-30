"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        console.log("Alter location_product Table: Add Minimum Quantity column");
        try {
            const tableDefinition = await queryInterface.describeTable(
                "location_product"
            );

            if (tableDefinition && !tableDefinition["min_quantity"]) {
                return queryInterface.addColumn("location_product", "min_quantity", {
                    type: Sequelize.INTEGER,
                    allowNull: true
                });
            }
        } catch (err) {
            console.log(err);
        }
    },

    down: (queryInterface) => {
        console.log("Alter location_product Table: Remove Minimum Quantity column");
        return queryInterface.removeColumn("location_product", "min_quantity");
    },
};