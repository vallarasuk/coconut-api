"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log("Checking if 'sale_invoice' table exists...");

            // Attempt to describe the 'sale_invoice' table
            const tableDefinition = await queryInterface.describeTable("sale_invoice");
            console.log("Table 'sale_invoice' exists.");

            if (tableDefinition) {
                console.log("Renaming 'sale_invoice' table to 'invoice'...");
                await queryInterface.renameTable("sale_invoice", "invoice");
                console.log("Table renamed to 'invoice' successfully.");
            } 
        } catch (error) {
            if (error.message.includes("does not exist") || error.message.includes("No description found")) {
                console.log("Table 'sale_invoice' does not exist. Skipping rename.");
            } else {
                console.error("Error renaming table:", error);
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            console.log("Checking if 'invoice' table exists...");
            const tableDefinition = await queryInterface.describeTable("invoice");

            if (tableDefinition) {
                console.log("Renaming 'invoice' back to 'sale_invoice'...");
                await queryInterface.renameTable("invoice", "sale_invoice");
                console.log("Table renamed back to 'sale_invoice' successfully.");
            } else {
                console.log("Table 'invoice' does not exist. Skipping rename.");
            }
        } catch (error) {
            if (error.message.includes("does not exist") || error.message.includes("No description found")) {
                console.log("Table 'invoice' does not exist. Skipping rename.");
            } else {
                console.error("Error renaming table back:", error);
            }
        }
    }
};
