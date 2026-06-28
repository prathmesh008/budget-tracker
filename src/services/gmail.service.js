const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

function getGmailClient() {
  let credentials, tokens;
  if (process.env.GMAIL_CREDENTIALS && process.env.GMAIL_TOKENS) {
    credentials = JSON.parse(process.env.GMAIL_CREDENTIALS);
    tokens = JSON.parse(process.env.GMAIL_TOKENS);
  } else {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  }
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

module.exports = {
  getGmailClient,
  getEmailText
};
