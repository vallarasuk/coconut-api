
module.exports = (sequelize, DataTypes) => {
  const location = require('./Location')(sequelize, DataTypes);
  const User = require('./User')(sequelize, DataTypes);
  const shift = require('./Shift')(sequelize, DataTypes);
  const status = require('./status')(sequelize, DataTypes);
  const orderType = require('./OrderType')(sequelize, DataTypes);
  const account = require("./account")(sequelize, DataTypes);

  const orderSchema = {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    order_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.NUMERIC,
      allowNull: true,
    },
    store_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    customer_account: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    sales_executive_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    delivery_executive: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    shift: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customer_phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    uuid: {
      type: DataTypes.UUIDV4,
      allowNull: true,
      defaultValue: DataTypes.UUIDV4,
    },
    payment_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total_cgst_amount: {
      type: DataTypes.NUMERIC,
      allowNull: true,
    },
    total_sgst_amount: {
      type: DataTypes.NUMERIC,
      allowNull: true,
    },
    cash_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    upi_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    upi_payment_verified: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    owner: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    delivery_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  };

  const order = sequelize.define('order', orderSchema, {
    sequelize,
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
  });

  order.belongsTo(location, {
    as: 'location',
    foreignKey: 'store_id',
  });

  order.belongsTo(User, {
    as: 'ownerDetail',
    foreignKey: 'owner',
  });
  order.belongsTo(User, {
    as: 'user',
    foreignKey: 'createdBy',
  });
  order.belongsTo(shift, {
    as: 'shiftDetail',
    foreignKey: 'shift',
  });
  order.belongsTo(status, {
    as: 'statusDetail',
    foreignKey: 'status',
  });
  order.belongsTo(orderType, {
    as: 'orderTypeDetail',
    foreignKey: 'type',
  });
  order.belongsTo(account, {
    as: 'accountDetail',
    foreignKey: 'customer_account',
  });
  return order;
};
