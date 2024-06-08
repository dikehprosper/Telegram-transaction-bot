/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
/* eslint-disable no-case-declarations */
const { getTransactionsCollection } = require('../../db');
const { axiosInstance } = require("./axios");

// In-memory user state storage
let userStates = {};

function sendMessage(messageObj, messageText) {
    console.log("Sending message:", messageText);
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

function handleUserAction(userId, action) {
    console.log(`Handling user action: ${action} for user: ${userId}`);
    // Initialize user state if it doesn't exist
    if (!userStates[userId]) {
        userStates[userId] = {};
    }

    // Update user state
    userStates[userId].action = action;
    userStates[userId].step = 1; // Reset step to the beginning
}

// Helper function to save a transaction for a user
async function saveTransaction(userId, transaction) {
    const collection = await getTransactionsCollection();
    await collection.insertOne({ userId, ...transaction });
}

// Helper function to get transactions for a user
async function getTransactions(userId) {
    const collection = await getTransactionsCollection();
    return collection.find({ userId }).toArray();
}

// Format a transaction for display
function formatTransaction(transaction, index) {
    const date = new Date(transaction.timestamp);
    const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    return `Transaction ${index + 1}:\nDate: ${formattedDate}\nID: ${transaction.id}\nAmount: ${transaction.amount}\nPhone Number: ${transaction.phoneNumber}\nNetwork: ${transaction.network}\nType: ${transaction.transactiontype}`;
}

// Format a transaction for display
function formatTransactionOnlyWithdrawal(transaction, index) {
    const date = new Date(transaction.timestamp);
    const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    return `Transaction ${index + 1}:\nDate: ${formattedDate}\nID: ${transaction.id}\nPhone Number: ${transaction.phoneNumber}\nType: ${transaction.transactiontype}`;
}

async function handleMessage(messageObj) {
    if (!messageObj || !messageObj.chat || !messageObj.chat.id) {
        console.error("Invalid message object:", messageObj);
        return;
    }

    const messageText = messageObj.text || "";
    const userId = messageObj.chat.id;

    if (messageText.charAt(0) === "/") {
        const command = messageText.substr(1).toLowerCase();
        console.log(`Received command: ${command}`);

        switch (command) {
            case "start":
                console.log("Starting transaction");
                delete userStates[userId];
                return sendMessage(messageObj, "Hi! Welcome to betfundr, let's help you process your transaction swiftly \n\nClick /deposit to start a deposit process or click /withdraw to start a withdrawal process or /transactions to see all your previous transactions");

            case "deposit":
                console.log("Initiating deposit process");
                delete userStates[userId];
                handleUserAction(userId, "deposit");
                return sendMessage(messageObj, "You are about to make a deposit, input your id.(e.g: 34377834).\n\nOr Press /cancel to terminate the current transaction process");

            case "withdraw":
                console.log("Initiating withdrawal process");
                delete userStates[userId];
                handleUserAction(userId, "withdraw");
                return sendMessage(messageObj, "You are about to make a withdrawal, input your id.(e.g: 34377834).\n\nOr Press /cancel to terminate the current transaction process");
            case "cancel":
                console.log("Cancelling transaction process");
                delete userStates[userId];
                return sendMessage(messageObj, "Your ongoing transaction has been cancelled. \n\nClick /deposit to start a deposit process, \n/withdraw to start a withdrawal process or \n/transactions to see previous transactions");
            case "transactions":
                console.log("Fetching transactions");
                delete userStates[userId];
                const transactions = await getTransactions(userId);
                if (transactions.length === 0) {
                    return sendMessage(messageObj, "No transactions found.");
                }
                const transactionList = transactions.map((t, index) => {
                    if (t.transactiontype === "withdraw") {
                        return formatTransactionOnlyWithdrawal(t, index);
                    } else {
                        return formatTransaction(t, index);
                    }
                }).join("\n\n");

                return sendMessage(messageObj, `Your transactions:\n\n${transactionList}\n\nType /deposit to perform a deposit and \n/withdraw to perform a withdrawal.`);

            default:
                console.log("Invalid command");
                return sendMessage(messageObj, "Wrong entry");
        }
    } else {
        // Handle user inputs based on their current action
        const userState = userStates[userId];

        if (!userState || !userState.action) {
            return sendMessage(messageObj,
                "Invalid Entry!!. Perform an action using the instructions below... \n\nClick /deposit to start a deposit or click \n/withdraw to start a withdrawal or \n/transactions to see all your transactions"); // Handle as a normal message if no action is set
        }

        switch (userState.action) {
            case "deposit":
                if (userState.step === 1) {
                    // Validate the id input
                    if (!/^\d+$/.test(messageText)) {
                        return sendMessage(messageObj, "Invalid ID. Please enter a numeric ID.(e.g: 34377834)");
                    }
                    userState.id = messageText;
                    userState.step++;
                    return sendMessage(messageObj, "Please input the amount you wish to deposit.(e.g: 5000).\n\n Or Press /cancel to terminate the current transaction process");
                } else if (userState.step === 2) {
                    // Validate the amount input
                    if (!/^\d+(\.\d{1,2})?$/.test(messageText)) {
                        return sendMessage(messageObj, "Invalid amount. Please enter a numeric amount.(e.g: 5000).\n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.amount = messageText;
                    userState.step++;
                    return sendMessage(messageObj, "Please enter your phone number (without country code).(e.g: 99999999).\n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 3) {
                    // Validate the phone number input
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        return sendMessage(messageObj, "Invalid phone number. Please enter a valid numeric phone number.(e.g: 99999999).\n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.phoneNumber = messageText;
                    userState.step++;
                    return sendMessage(messageObj, "Please enter your network. Only mtn and moov is accepted and make sure they are written in lower cases. (e.g: mtn or moov).\n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 4) {
                    // Validate the network input
                    const validNetworks = ["mtn", "moov"];
                    if (!validNetworks.includes(messageText.toLowerCase())) {
                        return sendMessage(messageObj, "Invalid network. Please enter either mtn or moov and make sure they are written in lower cases. (e.g: mtn or moov). \n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.network = messageText.toLowerCase();
                    // Final step, reset user state after processing
                    const transaction = {
                        id: userState.id,
                        amount: userState.amount,
                        phoneNumber: `+229${userState.phoneNumber}`,
                        network: userState.network,
                        transactiontype: 'deposit',
                        timestamp: new Date().toISOString()
                    };
                    saveTransaction(userId, transaction).then(() => {
                        delete userStates[userId];
                        return sendMessage(messageObj, `Deposit of ${userState.amount} has been processed for ID ${userState.id} on ${userState.network} network, using momo number ${userState.phoneNumber}. \n\n Click /deposit to start another deposit or click /withdraw to start a withdrawal or \n/transactions to see all your transactions`);
                    }).catch((error) => {
                        console.error("Error saving transaction:", error);
                        return sendMessage(messageObj, "An error occurred while processing your transaction. Please try again later.");
                    });
                }
                break;

            case "withdraw":
                if (userState.step === 1) {
                    // Validate the id input
                    if (!/^\d+$/.test(messageText)) {
                        return sendMessage(messageObj, "Invalid ID. Please enter a numeric ID.(e.g: 34377834). \n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.id = messageText;
                    userState.step++;
                    return sendMessage(messageObj, "Please input your withdrawal code. \n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 2) {
                    // Validate the withdrawal code input
                    if (!/^[a-zA-Z0-9]+$/.test(messageText)) { // Assuming withdrawal code can be alphanumeric, numeric, or alphabetic
                        return sendMessage(messageObj, "Invalid withdrawal code. Please enter an alphanumeric code (e.g: 343778frgr), numeric code (e.g: 123456), or alphabetic code (e.g: ABCDEF). \n\nOr Press /cancel to terminate the current transaction process");
                    }

                    userState.withdrawalCode = messageText;
                    userState.step++;
                    return sendMessage(messageObj, "Please enter your momo number (without country code). \n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 3) {
                    // Validate the phone number input
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        return sendMessage(messageObj, "Invalid phone number. Please enter a valid numeric phone number. \n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.phoneNumber = messageText;
                    // Final step, reset user state after processing
                    const transaction = {
                        id: userState.id,
                        withdrawalCode: userState.withdrawalCode,
                        phoneNumber: `+229${userState.phoneNumber}`,
                        transactiontype: 'withdraw',
                        timestamp: new Date().toISOString()
                    };
                    saveTransaction(userId, transaction)
                        .then(() => {
                            delete userStates[userId];
                            return sendMessage(messageObj, `Withdrawal for ID ${userState.id} with withdrawal code ${userState.withdrawalCode} and number ${userState.phoneNumber} has been processed.\n\nClick /withdraw to start another withdrawal or /deposit to perform a deposit or \n/transactions to see all your transactions.`);
                        })
                        .catch((error) => {
                            console.error("Error saving transaction:", error);
                            return sendMessage(messageObj, "An error occurred while processing your transaction. Please try again later.");
                        });
                }
                break;

            default:
                // If the action is not recognized, reset the user state
                delete userStates[userId];
                return sendMessage(messageObj, "Invalid action. Please start again.");
        }
    }
}

module.exports = { handleMessage };
