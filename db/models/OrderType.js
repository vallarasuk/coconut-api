module.exports = (sequelize, DataTypes) => {
  const Location = require("./Location")(sequelize, DataTypes);

  const OrderType = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
 
    default_location: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    show_customer_selection: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    allow_store_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    allow_delivery: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    delivery_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  };
  const orderType = sequelize.define('order_type', OrderType, {
    tableName: 'order_type',
    sequelize,
    freezeTableName: true,
    paranoid: true,
    timestamps: true,
  });

  orderType.belongsTo(Location, {
    as: "locationDetail",
    foreignKey: "default_location"
  })

  return orderType;
};
