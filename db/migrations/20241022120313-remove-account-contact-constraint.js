module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Removing the foreign key constraint
    await queryInterface.removeConstraint("contact", "account_contact");
  },
  down: async (queryInterface, Sequelize) => {
    // Re-adding the foreign key constraint if rolled back
    await queryInterface.addConstraint("contact", {
      type: "foreign key",
      name: "account_contact", // Name of the constraint
      fields: ["object_id"], // Field in the "contact" table
      references: {
        table: "account", // Referenced table
        fields: ["id"], // Field in the "account" table
      },
      onDelete: 'RESTRICT', // Restrict delete action
    });
  },
};
