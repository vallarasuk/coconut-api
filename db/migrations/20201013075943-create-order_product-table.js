"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // Console log
            console.log("Creating order_product table");

            // Defining whether the order_product table already exist or not.
            const orderProductTableExists = await queryInterface.tableExists("order_product");

            // Condition for creating the order_product table only if the table doesn't exist already.
            if (!orderProductTableExists) {
                await queryInterface.createTable("order_product", {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER,
                    },
                    store_product_id: {
                        type: Sequelize.BIGINT,
                        allowNull: true,
                    },
                    order_id: {
                        type: Sequelize.BIGINT,
                        allowNull: true,
                    },
                    name: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    quantity: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                    },
                    sku: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    vendor: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    fulfillment_service: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    requires_shipping: {
                        type: Sequelize.BOOLEAN,
                        allowNull: true,
                    },
                    taxable: {
                        type: Sequelize.BOOLEAN,
                        allowNull: true,
                    },
                    grams: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                    },
                    order_date: {
                        type: Sequelize.DATEONLY,
                        allowNull: true,
                    },
                    price: {
                        type: Sequelize.DECIMAL,
                        allowNull: true,
                    },
                    total_discount: {
                        type: Sequelize.DECIMAL,
                        allowNull: true,
                    },
                    fulfillment_status: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    deletedAt: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    total_cgst_amount: {
                        type: Sequelize.DECIMAL,
                        allowNull: true,
                    },
                    total_sgst_amount: {
                        type: Sequelize.DECIMAL,
                        allowNull: true,
                    },
                    order_number: {
                        type: Sequelize.STRING,
                        allowNull: true,
                      },
                      cancelled_at: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    taxable_amount: {
                        type: Sequelize.DECIMAL,
                        allowNull: true,
                      },
                });
            };
        } catch (err) {
            console.log(err);
        };
    },

    down: async (queryInterface, Sequelize) => {
        try {
            // Defining whether the order_product table already exist or not.
            const orderProductTableExists = await queryInterface.tableExists("order_product");
      
            // Condition for dropping the order_product table only if the table exist already.
            if (orderProductTableExists) {
              await queryInterface.dropTable("order_product");
            };
        } catch (err) {
            console.log(err);
        };
    },
};
