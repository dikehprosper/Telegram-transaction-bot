/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { handleMessage } = require('./lib/Telegram');

async function handler(req) {
    const messageObj = req.body;
    console.log("Received message object:", messageObj);
    if (!messageObj || !messageObj.message) {
        console.error("Invalid message object:", messageObj);
        return;
    }

    try {
        await handleMessage(messageObj.message);
    } catch (error) {
        console.error("Error handling message:", error);
    }
}

module.exports = { handler };
