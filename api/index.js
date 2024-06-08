/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const express = require("express");
const PORT = process.env.PORT || 4040;
const { handler } = require("../controller")
const app = express();
app.use(express.json());

app.post("*", async (req, res) => {
    res.send(await handler(req));
})
app.get("*", async (req, res) => {
    res.send(await handler(req));
})

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT)
})

// https://api.telegram.org/bot7234815519:AAG9ddYHBs7b0XzXrCR3o9iXt-FgVMz8kG4/setWebhook?url=https://e71d-197-210-227-55.ngrok-free.app/