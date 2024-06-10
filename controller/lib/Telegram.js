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
        return sendMessage(messageObj, "Une autre transaction est en cours. Veuillez attendre qu'elle soit terminée ou tapez /cancel pour annuler la transaction en cours.");
    }

    if (messageText === "/deposit" || messageText === "/withdraw" || messageText === "/start" || messageText === "/cancel" || messageText === "/transactions" || messageText === "deposit" || messageText === "withdraw" || messageText === "start" || messageText === "cancel" || messageText === "transactions") {

        const command = messageText.charAt(0) === "/" ? messageText.substr(1).toLowerCase() : messageText.toLowerCase()
        onGoingTransaction = true;
        switch (command) {
            case "start":
                const startMessage = "Bonjour! Bienvenue chez betfundr, nous allons vous aider à traiter votre transaction rapidement.\n\nCliquez sur /deposit pour commencer un processus de dépôt ou cliquez sur /withdraw pour commencer un processus de retrait ou /transactions pour voir toutes vos transactions précédentes";

                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction when starting
                return sendMessage(messageObj, startMessage);

            case "deposit":
                handleUserAction(userId, "deposit");
                // Set onGoingTransaction to true when starting a deposit
                const lastDepositId = userLastIdsForDeposit[userId] || null;
                const depositMessage = lastDepositId
                    ? `Vous êtes sur le point de faire un dépôt, entrez votre identifiant ou utilisez votre dernier identifiant en cliquant sur l'identifiant ci-dessous: \n\nIdentifiant précédent: /${lastDepositId}.\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours`
                    : "Vous êtes sur le point de faire un dépôt, entrez votre identifiant. (ex: 34377834).\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours";
                onGoingTransaction = false;
                return sendMessage(messageObj, depositMessage);

            case "withdraw":
                handleUserAction(userId, "withdraw");
                // Set onGoingTransaction to true when starting a withdrawal
                const lastWithdrawId = userLastIdsForWithdrawal[userId] || null;
                const withdrawMessage = lastWithdrawId
                    ? `Vous êtes sur le point de faire un retrait, répondez avec votre identifiant ou utilisez votre dernier identifiant en cliquant sur l'identifiant ci-dessous: \n\nIdentifiant précédent: /${lastWithdrawId}.\n\nAdresse:\nVille: abomey Calavi       Rue: FABLE WALLET EXCHANGE
                    \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours
`
                    : "Vous êtes sur le point de faire un retrait, répondez avec votre identifiant. (ex: 34377834).\n\nAdresse:\nVille: abomey Calavi         Rue: FABLE WALLET EXCHANGE\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours"
                    ;
                onGoingTransaction = false;
                return sendMessage(messageObj, withdrawMessage);

            case "cancel":
                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction when canceling
                return sendMessage(messageObj, "Votre transaction en cours a été annulée. \n\nCliquez sur /deposit pour commencer un processus de dépôt, \n/withdraw pour commencer un processus de retrait ou \n/transactions pour voir les transactions précédentes");

            case "transactions":

                const transactions = await getTransactions(userId);
                if (transactions.length === 0) {
                    return sendMessage(messageObj, "Aucune transaction trouvée.");
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
                    return sendMessage(messageObj, `Vos transactions ne peuvent pas être retournées car elles sont trop longues\n\nTapez /deposit pour effectuer un dépôt et \n/withdraw pour effectuer un retrait.`);

                } else {
                    return sendMessage(messageObj, `Vos transactions:\n\n${transactionList}\n\nTapez /deposit pour effectuer un dépôt et \n/withdraw pour effectuer un retrait.`);

                }


            default:
                onGoingTransaction = false;
                return sendMessage(messageObj, "Entrée incorrecte");
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
                        const lastDepositId = userLastIdsForDeposit[userId] || "Pas d'identifiant précédent";
                        console.log(lastDepositId)
                        onGoingTransaction = false;
                        if (lastDepositId === "Pas d'identifiant précédent") {
                            return sendMessage(messageObj, `Identifiant invalide. Entrez votre identifiant.(ex: 23423434) \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours`);
                        } else {
                            return sendMessage(messageObj, `Identifiant invalide. Entrez votre identifiant ou utilisez votre dernier identifiant en cliquant sur l'identifiant ci-dessous: \n\nIdentifiant précédent: /${lastDepositId}\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours`);
                        }

                    }
                    userState.id = id;
                    userLastIdsForDeposit[userId] = id; // Save the ID in the separate state
                    userState.step++;

                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Veuillez saisir le montant que vous souhaitez déposer. (ex: 5000).\n\n Ou appuyez sur /cancel pour annuler le processus de transaction en cours");
                } else if (userState.step === 2) {
                    console.log("done")
                    const amount = parseFloat(messageText);
                    if (isNaN(amount) || amount < 200 || !/^\d+(\.\d{1,2})?$/.test(messageText)) {
                        return sendMessage(messageObj, "Montant invalide. Veuillez entrer un montant numérique supérieur ou égal à 200 (ex: 5000).\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                    }
                    userState.amount = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Veuillez entrer votre numéro de téléphone (sans indicatif du pays). (ex: 99999999).\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                } else if (userState.step === 3) {
                    // Validate the phone number input
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Numéro de téléphone invalide. Veuillez entrer un numéro de téléphone numérique valide. (ex: 99999999).\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                    }
                    userState.phoneNumber = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Veuillez entrer votre réseau. Cliquez sur votre choix. \n\n   /MTN        /MOOV\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                }
                else if (userState.step === 4) {
                    const updatedMessageText = messageText.startsWith('/') ? messageText.substr(1) : messageText;
                    const validNetworks = ["MTN", "MOOV"];
                    if (!validNetworks.includes(updatedMessageText)) {
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Réseau invalide. Veuillez cliquer sur votre choix. \n\n   /MTN        /MOOV\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");

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

                    saveTransaction(userId, transaction)
                        .then(() => {
                            delete userStates[userId].action;
                            delete userStates[userId].step;
                            onGoingTransaction = false; // Reset onGoingTransaction when transaction is complete

                            return sendMessage(messageObj, `Le dépôt de ${userState.amount} est en cours de traitement pour l'identifiant ${userState.id} sur le réseau ${updatedMessageText}, en utilisant le numéro momo ${userState.phoneNumber}. \n\n Cliquez sur /deposit pour commencer un autre dépôt ou cliquez sur /withdraw pour commencer un retrait ou /transactions pour voir toutes vos transactions`);
                        })
                        .catch((error) => {
                            console.error("Error saving transaction:", error);
                            onGoingTransaction = false; // Reset onGoingTransaction in case of error
                            return sendMessage(messageObj, "Une erreur s'est produite lors du traitement de votre transaction. Veuillez réessayer plus tard.");
                        });

                }
                break;

            case "withdraw":
                if (userState.step === 1) {
                    if (userState.step === 1) {
                        const id = messageText.startsWith('/') ? messageText.substr(1) : messageText;
                        // Check if the id is numeric
                        if (!/^\d+$/.test(id)) {
                            const lastWithdrawId = userLastIdsForWithdrawal[userId] || "Pas d'identifiant précédent";
                            onGoingTransaction = false;
                            if (lastWithdrawId === "Pas d'identifiant précédent") {
                                return sendMessage(messageObj, `Identifiant invalide. Entrez votre identifiant.(ex: 23423434) \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours`);
                            } else {
                                return sendMessage(messageObj, `Identifiant invalide. Entrez votre identifiant ou utilisez votre dernier identifiant en cliquant sur l'identifiant ci-dessous: \n\nIdentifiant précédent: /${lastWithdrawId}\n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours`);
                            }
                        }
                        userState.id = id;
                        userLastIdsForWithdrawal[userId] = id; // Save the ID in the separate state
                        userState.step++;
                        onGoingTransaction = false;
                        return sendMessage(messageObj, "Veuillez entrer votre code de retrait. \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                    }
                } else if (userState.step === 2) {
                    if (!/^[a-zA-Z0-9]+$/.test(messageText)) { // Assuming withdrawal code can be alphanumeric, numeric, or alphabetic
                        return sendMessage(messageObj, "Code de retrait invalide. Veuillez entrer un code alphanumérique (ex: 343778frgr), un code numérique (ex: 123456), ou un code alphabétique (ex: ABCDEF). \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                    }

                    userState.withdrawalCode = messageText;
                    userState.step++;
                    onGoingTransaction = false;
                    return sendMessage(messageObj, "Veuillez entrer votre numéro momo (sans indicatif du pays). \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
                } else if (userState.step === 3) {
                    if (!/^\d{8}$/.test(messageText)) { // Assuming phone number length is 8 digits
                        return sendMessage(messageObj, "Numéro de téléphone invalide. Veuillez entrer un numéro de téléphone numérique valide. \n\nOu appuyez sur /cancel pour annuler le processus de transaction en cours");
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
                    sendMessage(messageObj, `Le retrait pour l'identifiant ${userState.id} avec le code de retrait ${userState.withdrawalCode} et le numéro ${userState.phoneNumber} est en cours de traitement.\n\nCliquez sur /withdraw pour commencer un autre retrait ou /deposit pour effectuer un dépôt ou /transactions pour voir toutes vos transactions.`);
                    saveTransaction(userId, transaction)
                        .then(() => {
                            delete userStates[userId];
                            onGoingTransaction = false; // Reset onGoingTransaction when transaction is complete
                            return;
                        })
                        .catch((error) => {
                            console.error("Error saving transaction:", error);
                            onGoingTransaction = false; // Reset onGoingTransaction in case of error
                            return sendMessage(messageObj, "Une erreur s'est produite lors du traitement de votre transaction. Veuillez réessayer plus tard.");
                        });
                }
                break;

            default:
                delete userStates[userId];
                onGoingTransaction = false; // Reset onGoingTransaction for invalid action
                return sendMessage(messageObj, "Action invalide. Veuillez recommencer.");
        }
    } else {
        onGoingTransaction = false;
        return sendMessage(messageObj,
            "Entrée invalide !!. Effectuez une action en utilisant les instructions ci-dessous... \n\nCliquez sur /deposit pour commencer un dépôt ou cliquez sur \n/withdraw pour commencer un retrait ou \n/transactions pour voir toutes vos transactions");
    }
}

module.exports = { handleMessage };
