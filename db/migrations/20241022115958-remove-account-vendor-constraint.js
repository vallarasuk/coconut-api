module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Removing the foreign key constraint
    await queryInterface.removeConstraint("purchase", "account_vendor");
  },
  down: async (queryInterface, Sequelize) => {
    // Re-adding the foreign key constraint in case of rollback
    await queryInterface.addConstraint("purchase", {
      type: "foreign key",
      name: "account_vendor",
      fields: ["vendor_id"],
      references: {
        table: "account",
        fields: ["id"],
      },
      onDelete: 'RESTRICT',
    });
  },
};
