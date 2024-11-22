'use strict';
const constants = require("../../routes/user/constants");
const utils = require("../../lib/utils");
const {
  defaultCompany,
  defaultPortal,
  defaultPortalUrl,
  superAdminEmail,
  superAdminPassword
} = require("../../config/config");

const { UserRole } = require("../../db").models;

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        const company = await queryInterface.describeTable("company");
        const systemSetting = await queryInterface.describeTable("system_setting");
        const role = await queryInterface.describeTable("role");
        const user = await queryInterface.describeTable("user");
        const schedulerJob = await queryInterface.describeTable("scheduler_job");
        const permission = await queryInterface.describeTable("permission");
        const userProfileStatus = await queryInterface.describeTable("user_profile_status");
        const userRole = await queryInterface.describeTable("user_role");

        // Checking if any data in the user role table
        let userId = await UserRole.findOne({
          where: { id: 1 }
        });

        // Inserting default company data into company table
        if (company && company["company_name"]) {
          await queryInterface.bulkInsert(
            "company",
            [
              {
                company_name: defaultCompany,
                status: "Active",
                createdAt: new Date(),
              },
            ],
            { transaction }
          );
        }
        // User table data insert
        if (userRole && userRole["role_name"] && !userId) {
          await queryInterface.bulkInsert(
            "user_role",
            [
              {
                id: 1,
                role_name: "Super Admin",
                status: "Active",
                createdAt: new Date(),
                company_id: 1
              },
            ],
            { transaction }
          );
        }

        // System config data insert
        if (systemSetting && systemSetting["module"]) {
          await queryInterface.bulkInsert(
            "system_setting",
            [
              {
                name: "no_open_tickets_notification_job_slack_webhook",
                value: "",
                company_id: 1
              },
              {
                name: "no_inprogress_tickets_notification_job_slack_webhook",
                value: "",
                company_id: 1
              },
              {
                name: "slack_oauth_access_token",
                value: "",
                company_id: 1
              },
              {
                name: "default_manager",
                value: "",
                company_id: 1
              },
              {
                name: "slack_channel_id",
                value: "",
                company_id: 1
              },
              {
                name: "slack_user_oauth_access_token",
                value: "",
                company_id: 1
              },
              {
                name: "slack_bot_oauth_access_token",
                value: "",
                company_id: 1
              },
            ],
            { transaction }
          )
        }

        // Role table data insert
        if (role && role["name"]) {
          await queryInterface.bulkInsert(
            "role",
            [
              {
                name: "Admin",
                company_id: 1
              },
              {
                name: "Developer",
                company_id: 1
              },
              {
                name: "QA",
                company_id: 1
              },
              {
                name: "Customer",
                company_id: 1
              },
              {
                name: "Consultant",
                company_id: 1
              },
              {
                name: "Manager",
                company_id: 1
              },
              {
                name: "Evaluation",
                company_id: 1
              },
              {
                name: "Lead",
                company_id: 1
              },
              {
                name: "Scrum Master",
                company_id: 1
              },
            ],
            { transaction }
          );
        }

        // User table data insert
        if (user && user["name"]) {
          await queryInterface.bulkInsert(
            "user",
            [
              {
                name: superAdminEmail,
                email: superAdminEmail,
                password: utils.md5Password(superAdminPassword),
                role: constants.ADMIN_ROLE,
                active: constants.ADMIN_ACTIVE_STATUS,
                created_at: new Date(),
                company_id: 1,
                status: constants.ADMIN_ACTIVE_STATUS,
              },
            ],
            { transaction }
          );
        }

        // Permission table data insert
        if (permission && permission["name"]) {
          await queryInterface.bulkInsert(
            "permission",
            [
              {
                name: "jobs_manage",
                display_name: "Jobs - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "jobs_add",
                display_name: "Jobs - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "jobs_edit",
                display_name: "Jobs - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "jobs_delete",
                display_name: "Jobs - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_manage",
                display_name: "User - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_add",
                display_name: "User - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_edit",
                display_name: "User - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_delete",
                display_name: "User - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "wiki_manage",
                display_name: "Wiki - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "wiki_add",
                display_name: "Wiki - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "wiki_edit",
                display_name: "Wiki - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "wiki_delete",
                display_name: "Wiki - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "inventory_manage",
                display_name: "Inventory - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "inventory_add",
                display_name: "Inventory - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "inventory_edit",
                display_name: "Inventory - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "inventory_delete",
                display_name: "Inventory - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "drive_manage",
                display_name: "Drive - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "drive_add",
                display_name: "Drive - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "drive_edit",
                display_name: "Drive - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "drive_delete",
                display_name: "Drive - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_manage",
                display_name: "Accounts- Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_add",
                display_name: "Accounts - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_edit",
                display_name: "Accounts - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_delete",
                display_name: "Accounts - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "project_board_manage",
                display_name: "Projects Board - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "project_board_add",
                display_name: "Projects Board - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "project_board_edit",
                display_name: "Projects Board - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "project_board_delete",
                display_name: "Projects Board - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_document",
                display_name: "User Document - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_document_add",
                display_name: "User Document - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_document_edit",
                display_name: "User Document - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "user_document_delete",
                display_name: "User Document - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_bill_manage",
                display_name: "Account Bill - Manage",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_bill_add",
                display_name: "Account Bill - Add",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_bill_edit",
                display_name: "Account Bill - Edit",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }, {
                name: "account_bill_delete",
                display_name: "Account Bill - Delete",
                createdAt: new Date(),
                updatedAt: new Date(),
                company_id: 1
              }
            ],
            { transaction }
          );
        }

        // User profile status data insert 
        if (userProfileStatus && userProfileStatus["profile_status"]) {
          await queryInterface.bulkInsert(
            "user_profile_status",
            [
              {
                id: 1,
                status_type: "Available",
                profile_status: "Logged In",
                sort: 1,
                created_at: new Date(),
                company_id: 1
              },
              {
                id: 2,
                status_type: "Not Available",
                profile_status: "Logged Out",
                sort: 2,
                created_at: new Date(),
                company_id: 1
              }
            ],
            { transaction }
          );
        }

      });

    } catch (err) {
      console.log(err);
    }

  },
  down: (queryInterface, Sequelize) => {
    queryInterface.bulkDelete("company", { company_name: defaultCompany });
    queryInterface.bulkDelete("system_config", null, {});
    queryInterface.bulkDelete("role", null, {});
    queryInterface.bulkDelete("user", null, {});
    queryInterface.bulkDelete("permission", null, {});
    queryInterface.bulkDelete("user_profile_status", null, {});
    queryInterface.bulkDelete("scheduler_job", null, {});

  },
};

