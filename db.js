
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { MongoClient } = require('mongodb');
require('dotenv').config();
// MongoDB connection URI and database name
const uri = process.env.MY_URI; // Replace with your MongoDB connection string
const dbName = "betfundr";

// Create a new MongoClient
const client = new MongoClient(uri);

let db;

// Connect to the database
async function connectToDatabase() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
    }
    return db;
}

// Get the transactions collection
async function getTransactionsCollection() {
    const database = await connectToDatabase();
    return database.collection('transactions');
}

module.exports = {
    getTransactionsCollection
};
