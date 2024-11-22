"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log("Altering Table: Changing data type of 'date' to DATEONLY in 'order' table");

            const tableDefinition = await queryInterface.describeTable("order");

            if (tableDefinition && tableDefinition["date"]) {
                await queryInterface.changeColumn("order", "date", {
                    type: Sequelize.DATEONLY,
                    allowNull: true,
                });
                console.log("Column 'date' changed to DATEONLY");
            }
        } catch (err) {
            console.error("Error altering 'date' column:", err);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            console.log("Reverting Table: Changing data type of 'date' back to DATE in 'order' table");

            const tableDefinition = await queryInterface.describeTable("order");

            if (tableDefinition && tableDefinition["date"]) {
                await queryInterface.changeColumn("order", "date", {
                    type: Sequelize.DATE,
                    allowNull: true,
                });
                console.log("Column 'date' reverted to DATE");
            }
        } catch (err) {
            console.error("Error reverting 'date' column:", err);
        }
    },
};
