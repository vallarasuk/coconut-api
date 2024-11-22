module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Removing the foreign key constraint
    await queryInterface.removeConstraint("account_product", "product_account");
  },
  down: async (queryInterface, Sequelize) => {
    // Re-adding the foreign key constraint if rolled back
    await queryInterface.addConstraint("account_product", {
      type: "foreign key",
      name: "product_account", // The name of the constraint
      fields: ["account_id"], // The field in the "account_product" table
      references: {
        table: "account", // The referenced table
        fields: ["id"], // The field in the "account" table
      },
      onDelete: 'RESTRICT', // Restrict delete action
    });
  },
};
