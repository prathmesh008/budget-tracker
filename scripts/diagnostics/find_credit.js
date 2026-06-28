require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

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

async function findCreditEmails() {
  const gmail = getGmailClient();
  
  // Search for credit emails
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 3, 
    q: 'from:canarabank.com credited'
  });

  const messages = listRes.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No credit emails found.');
    process.exit(0);
  }

  for (const msg of messages) {
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full', 
    });

    const emailText = getEmailText(msgDetails.data.payload);
    console.log("----- CREDIT EMAIL TEXT -----");
    console.log(emailText);
  }
}

findCreditEmails();
