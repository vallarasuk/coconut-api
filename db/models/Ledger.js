module.exports = (sequelize, DataTypes) => {
  const Account = require("./account")(sequelize, DataTypes); // Assuming you have an Account model

  const ledgerSchema = {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Account, // Foreign key relationship to Account model
        key: "id",
      },
      onDelete: "CASCADE",
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    debit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    credit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    transaction_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  };

  const Ledger = sequelize.define("ledger", ledgerSchema, {
    sequelize,
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeSave: (ledger, options) => {
        // Calculate balance based on credit and debit
        ledger.balance = ledger.credit - ledger.debit;
      },
    },
  });

  // Setting up the associations
  Ledger.belongsTo(Account, {
    as: "accountDetail",
    foreignKey: "account_id",
  });

  return Ledger;
};
