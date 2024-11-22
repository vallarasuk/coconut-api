module.exports = {
  up: async (queryInterface, Sequelize) => {
    const userTableDefinition = await queryInterface.describeTable("user");
    const userIndexTableDefinition = await queryInterface.describeTable("user_index");

    if (userTableDefinition && !userTableDefinition["allow_leave"]) {
      await queryInterface.addColumn("user", "allow_leave", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (userIndexTableDefinition && !userIndexTableDefinition["allow_leave"]) {
      await queryInterface.addColumn("user_index", "allow_leave", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }
    
  },

  down: async (queryInterface, Sequelize) => {
    const userTableDefinition = await queryInterface.describeTable("user");
    const userIndexTableDefinition = await queryInterface.describeTable("user_index");


    if (userTableDefinition && userTableDefinition["allow_leave"]) {
      await queryInterface.removeColumn("user", "allow_leave");
    }

    if (userIndexTableDefinition && userIndexTableDefinition["allow_leave"]) {
      await queryInterface.removeColumn("user_index", "allow_leave");
    }
  
  },
};
