module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("shift");

    if (tableDefinition && !tableDefinition["cutoff_time"]) {
      await queryInterface.addColumn("shift", "cutoff_time", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("shift");

    if (tableDefinition && tableDefinition["cutoff_time"]) {
      await queryInterface.removeColumn("shift", "cutoff_time");
    }
  
  },
};