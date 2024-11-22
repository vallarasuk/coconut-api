module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Removing the foreign key constraint
    await queryInterface.removeConstraint("bill", "bill_account");
  },
  down: async (queryInterface, Sequelize) => {
    // Re-adding the foreign key constraint if rolled back
    await queryInterface.addConstraint("bill", {
      type: "foreign key",
      name: "bill_account", // The name of the constraint
      fields: ["account_id"], // The field in the "bill" table
      references: {
        table: "account", // The referenced table
        fields: ["id"], // The field in the "account" table
      },
      onDelete: 'RESTRICT', // Restrict delete action
    });
  },
};
