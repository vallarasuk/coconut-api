const async = require("async");
// Common
const { removeUndefinedKeys } = require("../../lib/utils");
const { saveSetting } = require("../../services/SettingService");
const Request = require("../../lib/request");
const History = require("../../services/HistoryService");
const crypto = require("crypto");
const Setting = require("../../helpers/Setting");

function generateOauthToken(companyId) {
  // Get 8 random bytes and convert them to hex
  const randomBytes = crypto.randomBytes(8).toString("hex");

  let token = `${companyId}-${randomBytes}`;

  if (token.length > 16) {
    const splitToken = token.split("-");
    if (splitToken[0].length > 15) {
      splitToken[0] = splitToken[0].slice(0, 15);
    }
    token = `${splitToken[0]}-${splitToken[1]}`;
  } else if (token.length < 16) {
    token = token.padEnd(16, "0");
  }

  return token;
}

async function generateOauthtoken(req, res, next) {
  try {
    const { company_id } = req.query;

    let companyId = company_id ? company_id : Request.GetCompanyId(req);

    const data = req.body;

    // Validation
    if (!companyId) {
      return res.status(400).json({ message: "Company Id is required" });
    }

    const historyEntries = [];

    // Generate 16-digit alphanumeric OAuth token if 'wordpress_access_token' is present
    const oauthToken = generateOauthToken(companyId);

    // Save the token or any other relevant settings
    await saveSetting(
      Setting.WORDPRESS_ACCESS_TOKEN,
      oauthToken,
      companyId,
      data.objectId,
      data.objectName
    );
    const historyMessage = `Token Generated`;

    historyEntries.push({
      message: historyMessage,
      objectName: data.objectName,
      objectId: data.objectId,
    });

    return res.json({
      message: "Token generated successfully",
      oauthToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = generateOauthtoken;
