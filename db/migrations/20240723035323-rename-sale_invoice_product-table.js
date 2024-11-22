"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log("Checking if 'sale_invoice_product' table exists...");
            await queryInterface.describeTable("sale_invoice_product");
            console.log("Renaming table 'sale_invoice_product' to 'invoice_product'...");
            await queryInterface.renameTable("sale_invoice_product", "invoice_product");
            console.log("Table renamed to 'invoice_product' successfully.");
        } catch (error) {
            if (error.message.includes("does not exist")) {
                console.log("Table 'sale_invoice_product' does not exist. Skipping rename.");
            } else if (error.message.includes("No description found")) {
                console.log("No description found for 'sale_invoice_product'. Check the table name and schema.");
            } else {
                console.error("Error checking table 'sale_invoice_product':", error);
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            console.log("Checking if 'invoice_product' table exists...");
            await queryInterface.describeTable("invoice_product");
            console.log("Renaming table 'invoice_product' back to 'sale_invoice_product'...");
            await queryInterface.renameTable("invoice_product", "sale_invoice_product");
            console.log("Table renamed back to 'sale_invoice_product' successfully.");
        } catch (error) {
            if (error.message.includes("does not exist")) {
                console.log("Table 'invoice_product' does not exist. Skipping rename.");
            } else if (error.message.includes("No description found")) {
                console.log("No description found for 'invoice_product'. Check the table name and schema.");
            } else {
                console.error("Error checking table 'invoice_product':", error);
            }
        }
    }
};
