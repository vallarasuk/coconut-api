const request = require('request');

// Models
const { User } = require('../db').models;

const userProfileStatus = require('../helpers/UserProfileStatus');
// Utils
const config = require('../lib/config');

const { default: axios } = require('axios');

const { getSettingValue, saveSetting } = require('../services/SettingService');

const { WebClient } = require('@slack/web-api');

const setting = require("../helpers/Setting");
const { isNotEmpty } = require("../lib/validator");
const Response = require("../helpers/Response");

class SlackService {

    static GET_CHANNEL_LIST = "https://slack.com/api/conversations.list";

    static GET_REFRESHED_ACCESS_TOEN = "https://slack.com/api/oauth.v2.access";

    static SEND_MESSAGE = "https://slack.com/api/chat.postMessage";

    static GET_USER_LIST = "https://slack.com/api/users.list"

    static GET_CONVERSATION_HISTORY = "https://slack.com/api/conversations.history"

    static async authenticate(companyId) {
        try {

            let refreshToken = await getSettingValue(setting.SLACK_REFRESH_TOKEN, companyId);

            if (refreshToken) {

                let apiUrl = `${this.GET_REFRESHED_ACCESS_TOEN}?client_id=${config.slackClientId}&client_secret=${config.slackClientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`

                const response = await axios.post(
                    apiUrl,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response && response.data) {

                    saveSetting(setting.SLACK_REFRESH_TOKEN, response.data.refresh_token, companyId);

                    return response.data.access_token;
                }

                return null;

            }
        } catch (err) {
            console.log(err);
        }
    }


    static async getConversationHistory(channelId, companyId) {
        try {

            let accessToken = await this.authenticate(companyId);

            if (!accessToken) {
                throw { message: "Slack Not Connected" }
            }

            const response = await axios.get(
                `${this.GET_CONVERSATION_HISTORY}?channel=${channelId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response && response.data && response.data.messages;

        } catch (err) {
            console.log(err);
        }
    }

    static async getChannel(companyId) {
        try {

            let accessToken = await this.authenticate(companyId);

            if (!accessToken) {
                throw { message: "Slack Not Connected" }
            }

            const response = await axios.get(
                `${this.GET_CHANNEL_LIST}?types=public_channel,private_channel`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response && response.data && response.data.channels;

        } catch (err) {
            console.log(err);
        }
    }

    static async SendTextMessage(companyId, channelId, blocks, text) {
        try {

            let accessToken = await this.authenticate(companyId);

            let body = {
                channel: channelId,
            }

            if (blocks) {
                body.blocks = blocks;
            }

            if (text) {
                body.text = text;
            }

            const response = await axios.post(
                this.SEND_MESSAGE,
                body,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response;
        } catch (err) {
            console.log(err);
        }
    }



    static async sendSlackChannelMessageWithImage(companyId, channelId, imageUrl, text) {
        try {

            let block = new Array();

            if (text) {
                block.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: text,
                    },
                },)
            }

            if (isNotEmpty(imageUrl)) {
                block.push(
                    {
                        type: 'image',
                        image_url: imageUrl,
                        alt_text: 'Image',
                    },
                );

            }

            await this.SendTextMessage(companyId, channelId, block);

        } catch (err) {
            console.log(err);
        }
    }


    static async getSlackUserList(companyId, callback) {
        try {
            let accessToken = await this.authenticate(companyId);

            if (!accessToken) {
                throw { message: "Slack Not Connected" }
            }

            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const response = await axios.get(
                        this.GET_USER_LIST,
                        {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (response && response.data && response.data.members) {
                        return response.data.members;
                    }

                } catch (err) {
                    if (err.response && err.response.status === Response.TOO_MANY_REQUESTS) {
                        const retryAfter = err.response.headers['retry-after'] || 60;
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        retryCount++;
                    } else {
                        throw err;
                    }
                }
            }

            throw { message: 'Max retry attempts reached' };

        } catch (err) {
            console.log(err);
        }

        // Fallback to using Slack WebClient if the above fails
        const slackClient = new WebClient(config.slack_bot_oauth_access_token);
        const response = await slackClient.users.list();
        let data = response && response?.members ? response?.members : [];
        return callback(data);
    }

    static async postMessage(token, slackId, text, as_user, callback) {
        try {
            if (!token || !slackId || !text) {
                return callback();
            }

            if (!token) {
                return callback();
            }

            let asUserParams = '';
            if (as_user) {
                asUserParams = `&as_user=${as_user}`;
            }

            text = `${text}`;

            const option = {
                url: `https://slack.com/api/chat.postMessage?channel=${slackId}&text=${text}&pretty=1${asUserParams}`,
                method: 'POST',
                json: true,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${token}`,
                },
            };

            request.post(option, () => callback());
        } catch (err) {
            console.log(err);
        }
    }

    static async postImage(token, slackId, image, as_user, callback) {
        try {
            if (!token || !slackId || !image) {
                return callback();
            }

            const data = {
                url: 'https://slack.com/api/files.upload?pretty=1',
                formData: {
                    channels: slackId,
                    file: {
                        value: image,
                        options: {
                            filename: 'screenshot.png',
                        },
                    },
                    filename: 'screenshot.png',
                    filetype: 'image/png',
                    token: token,
                },
            };
            request.post(data, () => callback());
            //    request.post(data, function (error, response, body) {
            //     if (!error && response.statusCode == 200) {
            //       console.log(body);
            //     } else {
            //       console.log(error);
            //     }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Send Post Message As User
     *
     * @param {*} slackId
     * @param {*} text
     * @param {*} callback
     */
    static async sendMessageAsUser(slackId, text, callback) {
        SlackService.postMessage(config.slack_user_oauth_access_token, slackId, text, true, () => callback());
    }

    /**
     * Send Post Message As Bot User
     *
     * @param {*} slackId
     * @param {*} text
     * @param {*} callback
     */
    static async sendMessageAsBot(slackId, text, callback) {
        SlackService.postMessage(config.slack_bot_oauth_access_token, slackId, text, false, () => callback());

        // TODO: Need to remove this. Added for testing
        SlackService.postMessage(config.slack_bot_oauth_access_token, 'U04TH6B3T', text, false, () => callback());
    }

    /**
     * Send Post Message To Channel
     *
     * @param {*} channelId
     * @param {*} text
     * @param {*} callback
     */
    static async sendMessageToChannel(channelId, text, callback) {
        SlackService.postMessage(config.slack_bot_oauth_access_token, channelId, text, false, () => callback());
    }

    /**
     * Send Post Message To Channel
     *
     * @param {*} channelId
     * @param {*} text
     * @param {*} callback
     */
    static async sendImageToChannel(channelId, image, callback) {
        SlackService.postImage(config.slack_bot_oauth_access_token, channelId, image, true, () => callback());
    }

    /**
     * Send Post Message As Bot User
     *
     * @param {*} slackId
     * @param {*} text
     * @param {*} SLACK_MESSAGE_TYPE_BOT
     * @param {*} callback
     */
    static async sendMessage(slackId, text, SLACK_MESSAGE_TYPE_BOT, callback) {
        if (slackId) {
            User.findOne({
                attributes: ['id', 'name', 'slack_id'],
                where: { slack_id: slackId, active: userProfileStatus.ACTIVE },
            }).then((user) => {
                if (user) {
                    if (SLACK_MESSAGE_TYPE_BOT === 1) {
                        //If logged in send slack notification
                        SlackService.sendMessageAsBot(slackId, text, () => callback());
                    } else {
                        //If logged in send slack notification
                        SlackService.sendMessageAsUser(slackId, text, () => callback());
                    }
                }
            });
        }
    }

    static async sendMessageToUser(companyId, slackUserId, text) {
        try {
            let accessToken = await this.authenticate(companyId);

            if (accessToken) {
                const slackApiUrl = 'https://slack.com/api/chat.postMessage';

                const response = await axios.post(
                    slackApiUrl,
                    {
                        channel: slackUserId,
                        text: text,
                        unfurl_links: true,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                return response;
            }
        } catch (err) {
            console.log(err);
        }
    }


    static async sendOrderMessageToUser(params, blocks, customerDetail) {
        let { companyId, slackUserId, latitude, longitude, headerText, orderDetail } = params;

        try {
            const header = `<@${slackUserId}> ${headerText}`;
            let accessToken = await this.authenticate(companyId);

            if (accessToken) {
                const slackApiUrl = 'https://slack.com/api/chat.postMessage';

                // Create the initial blocks array
                let messageBlocks = [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": header
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": orderDetail
                        }
                    }
                ];

                // Conditionally add customerDetail section if it exists
                if (customerDetail) {
                    messageBlocks.push({
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": customerDetail
                        }
                    });
                }

                // Add the action buttons at the end
                if (latitude && longitude) {
                    messageBlocks.push({
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "🗺️ Get Direction",
                                    "emoji": true
                                },
                                "url": `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                            }
                        ]
                    });
                }

                messageBlocks.push(...blocks);

                // Send the Slack message
                const response = await axios.post(
                    slackApiUrl,
                    {
                        channel: slackUserId,
                        unfurl_links: true,
                        blocks: messageBlocks
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                return response;
            }
        } catch (err) {
            console.log(err);
        }
    }
}

module.exports = SlackService;
