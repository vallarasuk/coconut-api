"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log("Altering Table: Changing data type of 'order_date' to DATEONLY in 'order_product' table");

            const tableDefinition = await queryInterface.describeTable("order_product");

            if (tableDefinition && tableDefinition["order_date"]) {
                await queryInterface.changeColumn("order_product", "order_date", {
                    type: Sequelize.DATEONLY,
                    allowNull: true,
                });
                console.log("Column 'order_date' changed to DATEONLY");
            }
        } catch (err) {
            console.error("Error altering 'order_date' column:", err);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            console.log("Reverting Table: Changing data type of 'order_date' back to DATE in 'order_product' table");

            const tableDefinition = await queryInterface.describeTable("order_product");

            if (tableDefinition && tableDefinition["order_date"]) {
                await queryInterface.changeColumn("order_product", "order_date", {
                    type: Sequelize.DATE,
                    allowNull: true,
                });
                console.log("Column 'order_date' reverted to DATE");
            }
        } catch (err) {
            console.error("Error reverting 'order_date' column:", err);
        }
    },
};
