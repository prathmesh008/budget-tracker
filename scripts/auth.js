const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const express = require('express');

// We only need read-only access to Gmail for this budget tracker
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// The files where we will store/read our secrets
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function authenticate() {
  // 1. Verify credentials.json exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ ERROR: credentials.json not found!');
    console.error('Please complete Step 1 of the implementation plan, download the OAuth Web Client credentials, save them as credentials.json in this directory, and try again.');
    process.exit(1);
  }

  // 2. Read the credentials
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const credentials = JSON.parse(content);
  
  // Destructure the needed fields from the credentials file (Web application type)
  const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;
  
  if (!redirect_uris || redirect_uris.length === 0) {
    console.error('❌ ERROR: No redirect URIs found in credentials.json.');
    console.error('Ensure you configured http://localhost:3001/oauth2callback as a redirect URI in Google Cloud Console.');
    process.exit(1);
  }

  // 3. Create the OAuth2 client using the googleapis library
  // We use this specific library because it automatically handles token formatting 
  // and refreshing under the hood when making API requests later.
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3001/oauth2callback' // Hardcoding our expected redirect for the local server
  );

  // 4. Generate the URL to prompt the user for consent
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial: 'offline' means we get a refresh token, allowing long-term background access
    prompt: 'consent',      // Force consent screen to ensure we get a refresh token
    scope: SCOPES,
  });

  console.log('=============================================');
  console.log('🚀 ACTION REQUIRED: Authorize this application');
  console.log('=============================================');
  console.log('Please visit the following URL in your browser:');
  console.log('\n' + authUrl + '\n');
  console.log('Waiting for authorization...');

  // 5. Start a temporary Express server to catch the redirect callback
  const app = express();
  
  const server = app.listen(3001, () => {
    // Server is listening, just waiting for the user to click the link and authenticate.
  });

  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
      res.send('Authorization failed. No code found in the URL.');
      console.error('❌ Authorization failed.');
      server.close();
      process.exit(1);
    }

    try {
      // 6. Exchange the authorization code for access & refresh tokens
      console.log('Code received! Exchanging for tokens...');
      const { tokens } = await oAuth2Client.getToken(code);
      
      oAuth2Client.setCredentials(tokens);

      // 7. Save the tokens for future executions (so we don't have to login every time)
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('✅ Tokens successfully acquired and saved to token.json');
      console.log('You can now proceed to the next step!');
      
      res.send('<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>');
    } catch (error) {
      console.error('❌ Error retrieving access token', error);
      res.send('<h1>Error occurred during authorization.</h1><p>Check the console for details.</p>');
    } finally {
      // Shut down the server, our job here is done.
      server.close();
      process.exit(0);
    }
  });
}

// Execute the flow
authenticate();
