/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-case-declarations */
const { getTransactionsCollection } = require('../../db');
const { axiosInstance } = require("./axios");

// In-memory user state storage
let userStates = {};

// Global state to store the last used IDs

let userLastIdsForDeposit = {};
let userLastIdsForWithdrawal = {};

// Variable to track ongoing transactions
let onGoingTransaction = false;

function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

function handleUserAction(userId, action) {
    if (!userStates[userId]) {
        userStates[userId] = {};
    }

    userStates[userId].action = action;
    userStates[userId].step = 1; // Reset step to the beginning
}

async function saveTransaction(userId, transaction) {
    const collection = await getTransactionsCollection();
    await collection.insertOne({ userId, ...transaction });
}

async function getTransactions(userId) {
    const collection = await getTransactionsCollection();
    return collection.find({ userId }).toArray();
}

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
    return `Transaction ${index + 1}:\nDate: ${formattedDate}\nID: ${transaction.id}\nAmount: ${transaction.amount}\nPhone Number: ${transaction.phoneNumber}\nNetwork: ${transaction.network}\nType: ${transaction.transactiontype}\nStatus: ${transaction.status}`;
}

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
    return `Transaction ${index + 1}:\nDate: ${formattedDate}\nID: ${transaction.id}\nPhone Number: ${transaction.phoneNumber}\nType: ${transaction.transactiontype}\nStatus: ${transaction.status}`;
}

async function handleMessage(messageObj) {
    if (!messageObj || !messageObj.chat || !messageObj.chat.id) {
        return;
    }

    const messageText = messageObj.text || "";
    const userId = messageObj.chat.id;

    const userState = userStates[userId];

    // Check for ongoing transaction
    if (onGoingTransaction && (!messageText.startsWith("/cancel") && !messageText.startsWith("/deposit") && !messageText.startsWith("/withdraw"))) {
        return sendMessage(messageObj, "Another transaction is in progress. Please wait until it is completed or type /cancel to terminate the current transaction.");
    }

    if (messageText === "/deposit" || messageText === "/withdraw" || messageText === "/start" || messageText === "/cancel" || messageText === "/transactions" || messageText === "deposit" || messageText === "withdraw" || messageText === "start" || messageText === "cancel" || messageText === "transactions") {

        const command = messageText.charAt(0) === "/" ? messageText.substr(1).toLowerCase() : messageText.toLowerCase()
        onGoingTransaction = true;
        switch (command) {
            case "start":
                const startMessage = "Hi! Welcome to betfundr, let's help you process your transaction swiftly.\n\nClick /deposit to start a deposit process or click /withdraw to start a withdrawal process or /transactions to see all your previous transactions";

                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction when starting
                return sendMessage(messageObj, startMessage);

            case "deposit":
                handleUserAction(userId, "deposit");
                // Set onGoingTransaction to true when starting a deposit
                const lastDepositId = userLastIdsForDeposit[userId] || null;
                const depositMessage = lastDepositId
                    ? `You are about to make a deposit, input your id or use your last ID by clicking the ID below: \n\nPrevious ID: /${lastDepositId}.\n\nOr Press /cancel to terminate the current transaction process`
                    : "You are about to make a deposit, input your id.(e.g: 34377834).\n\nOr Press /cancel to terminate the current transaction process";
                onGoingTransaction = false;
                return sendMessage(messageObj, depositMessage);

            case "withdraw":
                handleUserAction(userId, "withdraw");
                // Set onGoingTransaction to true when starting a withdrawal
                const lastWithdrawId = userLastIdsForWithdrawal[userId] || null;
                const withdrawMessage = lastWithdrawId
                    ? `You are about to make a withdrawal, reply with your ID or use your last ID by clicking the ID below: \n\nPrevious ID: /${lastWithdrawId}.
        \n\nOr press /cancel to cancel the ongoing transaction process \n\nWithdrawal Procedure:

1- Make sure your PERSONAL PROFILE is filled out according to the information on your ID card or passport
2- Select the withdraw menu and then 1XBET CASH
3- Enter the amount to withdraw
4- Choose city: Parakou
5- Choose Street: Zongo Street 447  24/7
6- Confirm the transaction with the SMS CODE obtained on our phone number
7- Wait and once the status shows APPROVED, select GET THE CODE
8- Copy the obtained code (this code contains four characters) \n\nOr press /cancel to cancel the ongoing transaction process`
                    : "You are about to make a withdrawal, reply with your ID. (e.g: 34377834).\n\nWithdrawal Procedure:\n\n1. Make sure your PERSONAL PROFILE is filled out according to the information on your ID card or passport.\n2. Select the withdraw menu and then 1XBET CASH.\n3. Enter the amount to withdraw.\n4. Choose city: Parakou.\n5. Choose Street: Zongo Street 447  24 / 7.\n6. Confirm the transaction with the SMS CODE obtained on our phone number.\n7. Wait and once the status shows APPROVED, select GET THE CODE.\n8. Copy the obtained code (this code contains four characters).\n\nOr press /cancel to cancel the ongoing transaction process";
                onGoingTransaction = false;
                return sendMessage(messageObj, withdrawMessage);


            case "cancel":
                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction when canceling
                return sendMessage(messageObj, "Your ongoing transaction has been cancelled. \n\nClick /deposit to start a deposit process, \n/withdraw to start a withdrawal process or \n/transactions to see previous transactions");

            case "transactions":

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
                onGoingTransaction = false;
                console.log(transactionList)
                if (transactionList.length > 500) {
                    return sendMessage(messageObj, `Your transactions cant be returned because it too lengthy\n\nType /deposit to perform a deposit and \n/withdraw to perform a withdrawal.`);

                } else {
                    return sendMessage(messageObj, `Your transactions:\n\n${transactionList}\n\nType /deposit to perform a deposit and \n/withdraw to perform a withdrawal.`);

                }


            default:
                onGoingTransaction = false;
                return sendMessage(messageObj, "Wrong entry");
        }
    }

    // Handle user inputs based on their current action
    if (userState && userState.action) {
        onGoingTransaction = true;
        switch (userState.action) {
            case "deposit":
                if (userState.step === 1) {
                    const id = messageText.startsWith('/') ? messageText.substr(1) : messageText;

                    // Check if the id is numeric
                    if (!/^\d+$/.test(id)) {
                        const lastDepositId = userLastIdsForDeposit[userId] || "No previous ID";
                        console.log(lastDepositId)
                        onGoingTransaction = false;
                        if (lastDepositId === "No previous ID") {
                            return sendMessage(messageObj, `Invalid ID. Input your ID.(e.g 23423434) \n\nOr Press /cancel to terminate the current transaction process`);
                        } else {
                            return sendMessage(messageObj, `Invalid ID. Input your ID or use your last ID by clicking the ID below: \n\nPrevious ID: /${lastDepositId}\n\nOr Press /cancel to terminate the current transaction process`);
                        }

                    }
                    userState.id = id;
                    userLastIdsForDeposit[userId] = id; // Save the ID in the separate state
                    userState.step++;

                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Please input the amount you wish to deposit.(e.g: 5000).\n\n Or Press /cancel to terminate the current transaction process");
                } else if (userState.step === 2) {
                    console.log("done")
                    const amount = parseFloat(messageText);
                    if (isNaN(amount) || amount < 200 || !/^\d+(\.\d{1,2})?$/.test(messageText)) {
                        return sendMessage(messageObj, "Invalid amount. Please enter a numeric amount greater than or equal to 200 (e.g., 5000).\n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.amount = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Please enter your phone number (without country code).(e.g: 99999999).\n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 3) {
                    // Validate the phone number input
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Invalid phone number. Please enter a valid numeric phone number.(e.g: 99999999).\n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.phoneNumber = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Please enter your network. Click on your choice. \n\n   /MTN        /MOOV\n\nOr Press /cancel to terminate the current transaction process");
                }
                else if (userState.step === 4) {
                    const updatedMessageText = messageText.startsWith('/') ? messageText.substr(1) : messageText;
                    const validNetworks = ["MTN", "MOOV"];
                    if (!validNetworks.includes(updatedMessageText)) {
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Invalid network. Please Click on your choice. \n\n   /MTN        /MOOV\n\nOr Press /cancel to terminate the current transaction process");

                    }

                    const transaction = {
                        id: userState.id,
                        amount: userState.amount,
                        phoneNumber: `+229${userState.phoneNumber}`,
                        network: updatedMessageText,
                        transactiontype: 'deposit',
                        timestamp: new Date().toISOString(),
                        status: "pending"
                    };

                    saveTransaction(userId, transaction).then(() => {
                        delete userStates[userId].action;
                        delete userStates[userId].step;
                        onGoingTransaction = false; // Reset onGoingTransaction when transaction is complete

                        return new Promise((resolve) => setTimeout(resolve, 100));
                    }).then(() => {
                        onGoingTransaction = false;
                        return sendMessage(messageObj, `Deposit of ${userState.amount} is currently procesing for ID ${userState.id} on ${updatedMessageText} network, using momo number ${userState.phoneNumber}. \n\n Click /deposit to start another deposit or click /withdraw to start a withdrawal or /transactions to see all your transactions`);
                    }).catch((error) => {
                        console.error("Error saving transaction:", error);
                        onGoingTransaction = false; // Reset onGoingTransaction in case of error
                        return sendMessage(messageObj, "An error occurred while processing your transaction. Please try again later.");
                    });
                }
                break;

            case "withdraw":
                if (userState.step === 1) {
                    if (userState.step === 1) {
                        const id = messageText.startsWith('/') ? messageText.substr(1) : messageText;
                        // Check if the id is numeric
                        if (!/^\d+$/.test(id)) {
                            const lastWithdrawId = userLastIdsForWithdrawal[userId] || "No previous ID";
                            onGoingTransaction = false;
                            if (lastWithdrawId === "No previous ID") {
                                return sendMessage(messageObj, `Invalid ID. Input your ID.(e.g 23423434) \n\nOr Press /cancel to terminate the current transaction process`);
                            } else {
                                return sendMessage(messageObj, `Invalid ID. Input your ID or use your last ID by clicking the ID below: \n\nPrevious ID: /${lastWithdrawId}\n\nOr Press /cancel to terminate the current transaction process`);
                            }
                        }
                        userState.id = id;
                        userLastIdsForWithdrawal[userId] = id; // Save the ID in the separate state
                        userState.step++;
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Please input your withdrawal code. \n\nOr Press /cancel to terminate the current transaction process");
                    }
                } else if (userState.step === 2) {
                    if (!/^[a-zA-Z0-9]+$/.test(messageText)) { // Assuming withdrawal code can be alphanumeric, numeric, or alphabetic
                        return sendMessage(messageObj, "Invalid withdrawal code. Please enter an alphanumeric code (e.g: 343778frgr), numeric code (e.g: 123456), or alphabetic code (e.g: ABCDEF). \n\nOr Press /cancel to terminate the current transaction process");
                    }

                    userState.withdrawalCode = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Please enter your momo number (without country code). \n\nOr Press /cancel to terminate the current transaction process");
                } else if (userState.step === 3) {
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        return sendMessage(messageObj, "Invalid phone number. Please enter a valid numeric phone number. \n\nOr Press /cancel to terminate the current transaction process");
                    }
                    userState.phoneNumber = messageText;
                    const transaction = {
                        id: userState.id,
                        withdrawalCode: userState.withdrawalCode,
                        phoneNumber: `+229${userState.phoneNumber}`,
                        transactiontype: 'withdraw',
                        timestamp: new Date().toISOString(),
                        status: "pending"
                    };
                    sendMessage(messageObj, `Withdrawal for ID ${userState.id} with withdrawal code ${userState.withdrawalCode} and number ${userState.phoneNumber} is currently processing.\n\nClick /withdraw to start another withdrawal or /deposit to perform a deposit or /transactions to see all your transactions.`);
                    saveTransaction(userId, transaction)
                        .then(() => {
                            delete userStates[userId];
                            onGoingTransaction = false; // Reset onGoingTransaction when transaction is complete
                            return;
                        })
                        .catch((error) => {
                            console.error("Error saving transaction:", error);
                            onGoingTransaction = false; // Reset onGoingTransaction in case of error
                            return sendMessage(messageObj, "An error occurred while processing your transaction. Please try again later.");
                        });
                }
                break;

            default:
                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction for invalid action
                return sendMessage(messageObj, "Invalid action. Please start again.");
        }
    } else {
        onGoingTransaction = false;
        return sendMessage(messageObj,
            "Invalid Entry!!. Perform an action using the instructions below... \n\nClick /deposit to start a deposit or click \n/withdraw to start a withdrawal or /transactions to see all your transactions");
    }
}

module.exports = { handleMessage };
