/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {handleMessage} = require("./lib/Telegram");

async function handler(req, method){
    const { body } = req;
    if (body) {
        const messageObj = body.message;
        await handleMessage(messageObj);
        
    }
    return;
}

module.exports = { handler };