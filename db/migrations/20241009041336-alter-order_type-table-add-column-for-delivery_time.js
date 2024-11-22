module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("order_type");

    if (tableDefinition && !tableDefinition["delivery_time"]) {
      await queryInterface.addColumn("order_type", "delivery_time", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable("order_type");

    if (tableDefinition && tableDefinition["delivery_time"]) {
      await queryInterface.removeColumn("order_type", "delivery_time");
    }
  
  },
};