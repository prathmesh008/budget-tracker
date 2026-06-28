require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { parseTransactionEmail } = require('../../src/services/parser.service');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

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
  if (!text && payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        text = decodeBase64Url(part.body.data); 
      }
    }
  }
  return text;
}

async function checkUnparsed() {
  const gmail = getGmailClient();
  
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 500, 
    q: 'from:canarabank.com after:2026/06/01'
  });

  const messages = listRes.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No emails found.');
    return;
  }

  console.log(`Found ${messages.length} emails. Finding unparsed ones...`);
  
  let unparsedCount = 0;
  let oldestDate = new Date();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full', 
    });

    // Check date header to find the oldest email
    const dateHeader = msgDetails.data.payload.headers.find(h => h.name.toLowerCase() === 'date');
    if (dateHeader) {
      const emailDate = new Date(dateHeader.value);
      if (emailDate < oldestDate) oldestDate = emailDate;
    }

    const emailText = getEmailText(msgDetails.data.payload);
    if (!emailText) continue;

    const parsed = parseTransactionEmail(emailText);
    
    // If it failed to parse AND it looks like it might have been a transaction (contains keywords)
    if (!parsed) {
      if (emailText.includes('debited') || emailText.includes('credited') || emailText.includes('INR')) {
        console.log(`\n--- UNPARSED POTENTIAL TRANSACTION ---`);
        console.log(`Date: ${dateHeader ? dateHeader.value : 'Unknown'}`);
        console.log(emailText.substring(0, 300) + '...');
        unparsedCount++;
      }
    }
  }
  
  console.log(`\nAnalysis complete!`);
  console.log(`Oldest email found: ${oldestDate.toString()}`);
  console.log(`Number of potential transactions that failed to parse: ${unparsedCount}`);
}

checkUnparsed();
