module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("jobs");

    if (tableDefinition && !tableDefinition["fields"]) {
      await queryInterface.addColumn("jobs", "fields", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("jobs");

    if (tableDefinition && tableDefinition["fields"]) {
      await queryInterface.removeColumn("jobs", "fields");
    }
  
  },
};
