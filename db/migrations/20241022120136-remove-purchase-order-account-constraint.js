module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Removing the foreign key constraint
    await queryInterface.removeConstraint("purchase_order", "purchase_order_account");
  },
  down: async (queryInterface, Sequelize) => {
    // Re-adding the foreign key constraint if rolled back
    await queryInterface.addConstraint("purchase_order", {
      type: "foreign key",
      name: "purchase_order_account", // Name of the constraint
      fields: ["vendor_id"], // Field in the "purchase_order" table
      references: {
        table: "account", // Referenced table
        fields: ["id"], // Field in the "account" table
      },
      onDelete: 'RESTRICT', // Restrict delete action
    });
  },
};
