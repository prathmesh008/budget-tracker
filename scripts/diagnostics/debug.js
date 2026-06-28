require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { parseTransactionEmail } = require('./parser');

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

async function debugEmails() {
  const gmail = getGmailClient();
  
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
    q: 'SWIGGY' // Specifically looking for the credit card transaction
  });

  const messages = listRes.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No SWIGGY emails found.');
    return;
  }

  for (const msg of messages) {
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full', 
    });

    let emailText = '';
    const payload = msgDetails.data.payload;

    if (payload.parts) {
      const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        emailText = decodeBase64Url(textPart.body.data);
      }
    } else if (payload.body && payload.body.data) {
      emailText = decodeBase64Url(payload.body.data);
    }
    
    console.log("----- PAYLOAD STRUCTURE -----");
    console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...');
    
    console.log("----- RAW TEXT -----");
    console.log(emailText);
    console.log("----- PARSE RESULT -----");
    console.log(parseTransactionEmail(emailText));
  }
}

debugEmails();
