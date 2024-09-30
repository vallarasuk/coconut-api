"use strict";
exports.up = async function up(queryInterface, Sequelize) {
  try {
    console.log("Drop Table: ");
    const tableDefinition = await queryInterface.describeTable("inventory_specification");

    if (tableDefinition) {
      return queryInterface.dropTable("inventory_specification");
    } else {
      return null
    }
  } catch (err) {
    console.log(err);
  }
};

exports.down = function down(queryInterface) {
  return queryInterface.dropTable("inventory_specification");
};
