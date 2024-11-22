module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("attendance_type");

    if (tableDefinition && !tableDefinition["category"]) {
      await queryInterface.addColumn("attendance_type", "category", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("attendance_type");

    if (tableDefinition && tableDefinition["category"]) {
      await queryInterface.removeColumn("attendance_type", "category");
    }
  
  },
};