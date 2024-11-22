const ObjectName = require("../helpers/ObjectName");
const Permission = require("../helpers/Permission");
const { BAD_REQUEST } = require("../helpers/Response");
const Request = require("../lib/request");
const DateTime = require("../lib/dateTime")

const History = require("./HistoryService");
const { PaymentAccount } = require("../db").models;
const validator = require("../lib/validator");
const errors = require("restify-errors");
const { Op } = require("sequelize");
const Boolean = require("../lib/Boolean");


const create = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.PAYMENT_ACCOUNT_ADD, req);


  
  let object_id = "";

  try {
    const company_id = Request.GetCompanyId(req);

    // Create Data
    let data = req.body;

    const AccountExist = await PaymentAccount.findOne({
      where: {
        payment_account_name: data.payment_account_name,
        company_id: company_id,
      },
    });

    if (AccountExist) {
      account_id = AccountExist.id;
      return res.json(BAD_REQUEST, { message: "Payment Account Already Exists" });
    }

    let createData = {};
    createData.payment_account_type = data.payment_account_type;
    createData.payment_account_name = data.payment_account_name;
    createData.payment_account_number = data.payment_account_number;
    createData.bank_name = data.bank_name;
    createData.ifsc = data.ifsc;
    createData.company_id = company_id;
    createData.description = data.description;
    createData.primary = data.primary !== null && data.primary !== "null" ? parseInt(data.primary, 10) : 0;
    const account = await PaymentAccount.create(createData);
    res.json(200, { message: "Payment Account Created" });
    
    // systemLog
    res.on("finish", async () => {
    History.create("Payment Account Created", req, ObjectName.PAYMENT_ACCOUNT, account.id);
    })
    
  } catch (err) {
    next(err);
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
};

const del = async (req, res, next) => {
    const hasPermission = await Permission.Has(Permission.PAYMENT_ACCOUNT_DELETE, req);


    const id = req.params.id;
    const company_id = Request.GetCompanyId(req);
  

    PaymentAccount.findOne({
        attributes: [
            "id",
            "payment_account_type",
            "payment_account_name",
            "payment_account_number",
            "bank_name",
            "ifsc",
            "description",
            "primary",
            "company_id",
        ],
        where: { id ,company_id},
    }).then((account) => {
        if (!account) {
            return next(new errors.NotFoundError("Payment Account not found"));
        }

        PaymentAccount
            .destroy({
                where: { id: account.id, company_id }
            })
            .then(() => {
                res.json({ message: "Account deleted" });
                History.create("Account Deleted", req, ObjectName.PAYMENT_ACCOUNT, id);
            })
            .catch((err) => {
                req.log.error(err);
                return next(err);
            });
    }).catch((err)=>{
      console.log(err);
    })

}
const get = async (req, res, next) => {
    const { id } = req.params;

    try {
      const company_id = Request.GetCompanyId(req);
  
      if (!id) {
        return res.json(400, { message: "Invalid Id" });
      }
  
      const AccountData = await PaymentAccount.findOne({
        where: {
          id: id,
          company_id: company_id,
        },
      });
  
      if (!AccountData) return res.json(200, { message: "No Records Found" });
  
      let { payment_account_type, payment_account_name,payment_account_number, bank_name, ifsc, description, primary, } = AccountData.get();
  
      let data = {
          payment_account_type,
          payment_account_name,
          payment_account_number,
          bank_name,
          ifsc,
        description,
        primary,
        company_id
      };
      res.json(200, data);
    } catch (err) {
      next(err);
      console.log(err);
    }
}

const update = async (req, res, next) => {
  const hasPermission = await Permission.Has(Permission.PAYMENT_ACCOUNT_EDIT, req);



  let { id } = req.params;

  try {
    let data = req.body;
    
    let company_id = Request.GetCompanyId(req);
    if (!id) {
      return res.json(400, { message: "Invalid Id" });
    }

    const accountDetails = await PaymentAccount.findOne({
      attributes: ["id"],
      where: {  id ,company_id: company_id},
    });

    if (!accountDetails) {
      return res.json(BAD_REQUEST, { message: "Account Detail Not Found" });
    }

    let updateData = {
      payment_account_name : data.payment_account_name,
      payment_account_type : data.payment_account_type,
      description : data.description,
      bank_name : data.bank_name,
      company_id : company_id,
      primary: data.primary !== null && data.primary !== "null" ? parseInt(data.primary, 10) : 0,
      ifsc:data.ifsc,
      payment_account_number: data.payment_account_number,

    };

    await PaymentAccount.update(updateData, {
      where: { id },
    });

    res.json(200, { message: "Payment Account Data Updated" });

    // systemLog
    res.on("finish", async () => {
      History.create("Payment Account Updated", req, ObjectName.PAYMENT_ACCOUNT, id);
    })

  } catch (err) {
    console.log(err);
    res.json(BAD_REQUEST, { message: err.message });
  }
}

const search = async (req, res, next) => {
    const hasPermission = await Permission.Has(Permission.PAYMENT_ACCOUNT_VIEW, req);

   
    try {
        let { page, pageSize, search, sort, sortDir,primary,pagination } = req.query;
        const company_id = Request.GetCompanyId(req);
        const where = {};


        // Apply filters if there is one


        where.company_id = company_id;

        if(primary){
        where.primary = primary
        } 
        page = page ? parseInt(page, 10) : 1;
        if (isNaN(page)) {
            return res.json(400, { message: "Invalid page", })
        }

        // Validate if page size is not a number
        pageSize = pageSize ? parseInt(pageSize, 10) : 25;
        if (isNaN(pageSize)) {
            return res.json(400, { message: "Invalid page size", })
        }

        if (page && pageSize) {
            // Validate if page is not a number
            page = page ? parseInt(page, 10) : 1;
            if (isNaN(page)) {
                return res.json(400, { message: "Invalid page", })
            }

            // Validate if page size is not a number
            pageSize = pageSize ? parseInt(pageSize, 10) : 25;
            if (isNaN(pageSize)) {
                return res.json(400, { message: "Invalid page size", })
            }
        }
        // Sortable Fields
        const validOrder = ["ASC", "DESC"];
        const sortableFields = {
            payment_account_type: "payment_account_type",
            payment_account_name: "payment_account_name",
            payment_account_number: "payment_account_number",
            bank_name: "bank_name",
            ifsc: "ifsc",
            createdAt: "createdAt",
            id:"id",
        };

        const sortParam = sort || "createdAt";

        // Validate sortable fields is present in sort param
        if (!Object.keys(sortableFields).includes(sortParam)) {
            return res.json(400, { message: `Unable to sort data by ${sortParam}`, })
        }

        const sortDirParam = sortDir ? sortDir.toUpperCase() : "ASC";
        // Validate order is present in sortDir param
        if (!validOrder.includes(sortDirParam)) {
            return res.json(400, { message: "Invalid sort order", })
        }

        page = page ? parseInt(page, 10) : 1;

        pageSize = pageSize ? parseInt(pageSize, 10) : 25;
        // Search term
        const searchTerm = search ? search.trim() : null;
        if (searchTerm) {
            where[Op.or] = [
                {
                    payment_account_type: {
                        [Op.like]: `%${searchTerm}%`,
                    },
                },
                {
                    payment_account_name: {
                        [Op.iLike]: `%${searchTerm}%`,
                    },
                },
                {
                    payment_account_number: {
                        [Op.like]: `%${searchTerm}%`,
                    },
                },
                {
                    bank_name: {
                        [Op.like]: `%${searchTerm}%`,
                    },
                },
                {
                    ifsc: {
                        [Op.like]: `%${searchTerm}%`,
                    },
                },
            ];
        }

        const query = {
            order: [
                [sortableFields[sortParam], sortDirParam],
            ],
            where
        };

        if (validator.isEmpty(pagination)) {
          pagination = true;
      }
      if (Boolean.isTrue(pagination)) {
          if (pageSize > 0) {
              query.limit = pageSize;
              query.offset = (page - 1) * pageSize;
          }
      }

        const AccountsData = await PaymentAccount.findAndCountAll(query);
        let data = [];

        AccountsData.rows.forEach((value => {
            data.push({
                id: value.id,
                payment_account_type: value.payment_account_type,
                payment_account_name: value.payment_account_name,
                payment_account_number: value.payment_account_number,
                bank_name: value.bank_name,
                ifsc: value.ifsc,
                description: value.description,
                primary: value.primary,
                createdAt: DateTime.formateDateAndTime(value.createdAt),
            });
        }))
        res.json({
            totalCount: AccountsData.count,
            currentPage: page,
            pageSize,
            data
        })
    } catch (err) {
        next(err);
        console.log(err);
    }
}


const list=async(req,res,next) => {
  let {primary} = req.query
    const where = new Object();
     const companyId=Request.GetCompanyId(req)
     where.company_id = companyId;
    if(primary){
      where.primary=primary
    }
  
    try {
      const AccountsData=await PaymentAccount.findAll({where});
      const data=[]
      AccountsData.forEach((value => {
        data.push({
            id: value.id,
            payment_account_name: value.payment_account_name,
       
        });
    }))
    res.json({
      data
  })
    } catch (error) {
      console.log(error)
    }
}

const getPaymentAccountName = async (id,companyId)=>{

  let paymentAccountDetail = await PaymentAccount.findOne({where:{
    id:id,
    company_id:companyId
  }});

  return paymentAccountDetail && paymentAccountDetail?.payment_account_name

}

module.exports = {
    create,
    del,
    get,
    update,
    search,
    list,
    getPaymentAccountName
};
