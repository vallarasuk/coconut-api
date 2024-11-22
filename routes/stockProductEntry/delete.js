
const Request = require("../../lib/request");

// Models
const { StockEntryProduct } = require("../../db").models;
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");


const permissionConstants = require("../../helpers/Permission");

const { hasPermission } = require("../../services/UserRolePermissionService");
const Permission = require("../../helpers/Permission");

const del = async (req, res) => {
    const { id } = req.params;

    try {
        //validate permission exiist or not
        const hasPermission = await Permission.GetValueByName(Permission.STOCK_PRODUCT_ENTRY_DELETE, req.role_permission);
 


        //get stock product entry Id

        //get company Id from request
        const companyId = Request.GetCompanyId(req);

        //validate stock product entry Id exist or not
        if (!id) {
            return res.json(400, { message: "stock Product Entry Id is required" });
        }

        //validate stock entry product exist or not
        let isStockProductEntryExist = await StockEntryProduct.findOne({
            where: { company_id: companyId, id: id }
        })

        //validate stock entry product exist or not
        if(!isStockProductEntryExist){
            return res.json(400, { message: "stock Product Entry Not Found" });
        }

        //delete the stock entry product
        await StockEntryProduct.destroy({where : { company_id: companyId, id: id }})

        res.json(200, { message: "Stock Product Entry Deleted" });

        res.on("finish", async () => {
            //create system log for product updation
            History.create("Stock Product Entry Deleted", req,
                ObjectName.STOCK_ENTRY,
                isStockProductEntryExist.dataValues.stock_entry_id);
        });

    } catch (err) {
        console.log(err);
        return res.json(400, { message: err.message });
    }
}

module.exports = del;