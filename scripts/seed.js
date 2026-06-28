require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const mongoose = require('mongoose');

const { parseTransactionEmail } = require('../src/services/parser.service');
const Transaction = require('../src/models/Transaction');

const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../token.json');

function getGmailClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const { client_secret, client_id } = credentials.web || credentials.installed;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials(tokens);
  
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function decodeBase64Url(base64UrlStr) {
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function getEmailText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  let text = '';
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        if (part.body && part.body.data) return decodeBase64Url(part.body.data);
      } else if (part.mimeType.startsWith('multipart/')) {
        const nestedText = getEmailText(part);
        if (nestedText) text = nestedText;
      }
    }
  }
  // Fallback to HTML if plain text isn't found
  if (!text && payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        text = decodeBase64Url(part.body.data); // It will have HTML tags, but our regex might still catch it
      }
    }
  }
  return text;
}

async function seedHistoricalData() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  console.log('🧹 Wiping existing database records to refresh parsed data...');
  await Transaction.deleteMany({});
  console.log('🧹 Database wiped.');

  const gmail = getGmailClient();
  
  // Search for all emails from Canara Bank since June 1st
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 500, 
    q: 'from:canarabank.com after:2026-06-01'
  });

  const messages = listRes.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No Canara Bank emails found.');
    process.exit(0);
  }

  console.log(`Found ${messages.length} potential transaction emails. Processing...`);

  for (const msg of messages) {
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full', 
    });

    const emailText = getEmailText(msgDetails.data.payload);

    if (emailText) {
      const transactionData = parseTransactionEmail(emailText);
      
      if (transactionData) {
        // Check if transaction already exists (basic deduplication by date/amount/account)
        const exists = await Transaction.findOne({
          date: transactionData.date,
          amount: transactionData.amount,
          account: transactionData.account
        });

        if (!exists) {
          const newTransaction = new Transaction(transactionData);
          await newTransaction.save();
          console.log(`💾 Saved: ${transactionData.type} - ₹${transactionData.amount}`);
        } else {
          console.log(`⚠️ Skipped: Transaction already exists in DB.`);
        }
      }
    }
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seedHistoricalData();
