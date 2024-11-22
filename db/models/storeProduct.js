module.exports = (sequelize, DataTypes) => {

    const product = require("./product")(sequelize, DataTypes);
    const location = require("./Location")(sequelize, DataTypes);
    const product_index = require("./productIndex")(sequelize, DataTypes);
    const orderProduct = require("./orderProduct")(sequelize, DataTypes);
    const locationRack = require("./LocationRack")(sequelize, DataTypes);


    const storeProductSchema = {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
        },
        product_id: {
            type: DataTypes.INTEGER,
        },
        store_id: {
            type: DataTypes.INTEGER,
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity: {
            type: DataTypes.FLOAT,
        },
        min_quantity: {
            type: DataTypes.INTEGER,
        },
        max_quantity: {
            type: DataTypes.INTEGER,
        },
        status: {
            type: DataTypes.STRING,
        },
        rack_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_order_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        last_stock_entry_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        order_quantity: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        replenish_quantity: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        min_order_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        max_order_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        transferred_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        transfer_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }, 
         return_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        system_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        last_transfer_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        last_return_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        discrepancy_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        average_order_quantity: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        location_rack: {
            type: DataTypes.INTEGER,
        },
    };

    const storeProduct = sequelize.define("store_product", storeProductSchema, {
        tableName: "store_product",
        sequelize,
        freezeTableName: true,
        paranoid: true,
        timestamps: true,
    });
    // Location Product Association
    storeProduct.belongsTo(product, {
        as: "productDetail",
        foreignKey: "product_id",
    });

    storeProduct.belongsTo(location, {
        as: "location",
        foreignKey: "store_id",
    });

    storeProduct.belongsTo(locationRack, {
        as: "locationRackDetail",
        foreignKey: "location_rack",
    });

    storeProduct.hasOne(product_index, {
        as: "productIndex",
        sourceKey: "product_id",
        foreignKey: "product_id",
    });
    storeProduct.hasOne(orderProduct, {
        as: "orderProductdetail",
        sourceKey: "product_id",
        foreignKey: "product_id",
    });


    return storeProduct;
};
