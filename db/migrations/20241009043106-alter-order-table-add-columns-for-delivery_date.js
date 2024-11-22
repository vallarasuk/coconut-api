module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("order");

    if (tableDefinition && !tableDefinition["delivery_date"]) {
      await queryInterface.addColumn("order", "delivery_date", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("order");

    if (tableDefinition && tableDefinition["delivery_date"]) {
      await queryInterface.removeColumn("order", "delivery_date");
    }
  
  },
};