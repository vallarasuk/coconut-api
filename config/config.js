require("dotenv").config();

// DB connect Data
const dbConnectionData = {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: true,
    "dialectOptions": {
        "ssl": {
            "require": false,
            "rejectUnauthorized": false,
        },
      },
};

const {
    SENDGRID_API_KEY,
    AWS_REGION,
    AWS_KEY_ID,
    AWS_SECRET_KEY_ACCESS,
    AWS_BUCKET,
    DEFAULT_ADMIN_EMAIL,
    EMAIL_IMAGE_BASE_URL,
    FROM_EMAIL,
    FROM_EMAIL_DISPLAY_NAME,
    GOOGLE_CLIENT_ID,
    SHOPIFY_SHOP_NAME,
    SHOPIFY_API_KEY,
    SHOPIFY_PASSWORD,
    SHOPIFY_ADMIN_API_VERSION,
    DEFAULT_COMPANY,
    DEFAULT_PORTAL,
    DEFAULT_PORTAL_URL,
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD
} = process.env;

module.exports = {
    // Pointing To Development DB
	development: dbConnectionData,

	// Pointing To Production DB
	production: dbConnectionData,
    sendGridAPIKey: SENDGRID_API_KEY || "",
    aws: {
        region: AWS_REGION,
        accessKeyId: AWS_KEY_ID,
        secretAccessKey: AWS_SECRET_KEY_ACCESS,
        bucketName: AWS_BUCKET || "",
    },
    defaultAdminEmail: DEFAULT_ADMIN_EMAIL || "",
    emailImageBaseUrl: EMAIL_IMAGE_BASE_URL || "",
    fromEmail: FROM_EMAIL || "",
    fromEmailDisplayName: FROM_EMAIL_DISPLAY_NAME || "",
    googleClientId: GOOGLE_CLIENT_ID || "",
    shopifyShopName: SHOPIFY_SHOP_NAME,
    shopifyApiKey: SHOPIFY_API_KEY,
    shopifyPassword: SHOPIFY_PASSWORD,
    shopifyAdminApiVersion: SHOPIFY_ADMIN_API_VERSION,
    defaultCompany: DEFAULT_COMPANY,
    defaultPortal: DEFAULT_PORTAL,
    defaultPortalUrl: DEFAULT_PORTAL_URL,
    superAdminEmail: SUPER_ADMIN_EMAIL,
    superAdminPassword: SUPER_ADMIN_PASSWORD
};