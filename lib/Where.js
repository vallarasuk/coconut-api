const { Op } = require("sequelize");
const ArrayList = require("./ArrayList");
const Number = require("./Number");


class Where {
    static id(whereCondition, columnName, value) {
        if (Number.isNotNull(value)) {
            if (ArrayList.isArray(value)) {
                if (ArrayList.isArray(value)) {
                    return whereCondition[columnName] =
                        value

                }
            } else if (typeof value === "string") {
                let ids = value?.split(",");
                if (ArrayList.isArray(ids)) {
                    return whereCondition[columnName] =
                        ids

                }
            } else {
                return whereCondition[columnName] = value;
            }
        } else {
            return whereCondition;
        }
    }
}

module.exports = Where;