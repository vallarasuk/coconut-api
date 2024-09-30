"use strict";
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      console.log("change dataType for Size");
      const tableDefinition = await queryInterface.describeTable("product_index");

      if (tableDefinition && tableDefinition["size"]) {

      await queryInterface.changeColumn("product_index", "size", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    } catch (err) {
      console.log(err);
    }
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn("product_index", "size", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
