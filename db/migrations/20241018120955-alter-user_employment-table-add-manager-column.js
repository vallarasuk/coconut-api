module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Console log
      console.log('Altering user_employment table - add column from manager');

      // Defining the table
      const tableDefinition = await queryInterface.describeTable('user_employment');

      if (tableDefinition && !tableDefinition['manager']) {
        await queryInterface.addColumn('user_employment', 'manager', {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }

    } catch (err) {
      console.log(err);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Defining the table
      const tableDefinition = await queryInterface.describeTable('user_employment');

      if (tableDefinition && tableDefinition['user_employment']) {
        await queryInterface.removeColumn('manager', 'user_employment');
      }
    } catch (err) {
      console.log(err);
    }
  },
};
