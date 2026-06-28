const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Replace this with your exact Google Cloud Project ID
const PROJECT_ID = 'budgettracker'; 
const TOPIC_NAME = 'gmail-transactions-topic'; 

async function setupWatch() {
  try {
    // 1. Load our saved credentials and tokens
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
      console.error('❌ ERROR: Missing credentials.json or token.json.');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const { client_secret, client_id } = credentials.web || credentials.installed;

    // 2. Initialize the OAuth2 client using the saved refresh token
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
    oAuth2Client.setCredentials(tokens);

    // 3. Initialize the Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // 4. Call the watch() method to tell Gmail to publish to our Pub/Sub topic
    console.log('Sending watch request to Gmail API...');
    
    // We construct the full topic name required by Google: projects/YOUR_PROJECT_ID/topics/YOUR_TOPIC_NAME
    // Important: We must use the exact project ID from Google Cloud Console. 
    // We can extract it from credentials.json safely:
    const projectId = credentials.web?.project_id || credentials.installed?.project_id || PROJECT_ID;
    const fullTopicName = `projects/${projectId}/topics/${TOPIC_NAME}`;

    const res = await gmail.users.watch({
      userId: 'me', // 'me' refers to the authenticated user (you)
      requestBody: {
        labelIds: ['INBOX'], // We only care about emails hitting the inbox
        topicName: fullTopicName, 
      },
    });

    console.log('✅ Watch setup successful!');
    console.log('Gmail will now publish notifications to:', fullTopicName);
    console.log('History ID:', res.data.historyId);
    console.log('Expiration:', new Date(parseInt(res.data.expiration)).toLocaleString());
    
    console.log('\nNOTE: Google requires you to re-call this watch() function at least once every 7 days.');
    
  } catch (error) {
    console.error('❌ Error setting up watch:', error.message);
    if (error.message.includes('not found') || error.message.includes('permission denied')) {
      console.error('\n--> Hint: Did you create the Pub/Sub topic and grant publish permissions to gmail-api-push@system.gserviceaccount.com as instructed in Step 1?');
    }
  }
}

setupWatch();
