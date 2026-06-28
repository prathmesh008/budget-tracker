const { getGmailClient, getEmailText } = require('../services/gmail.service');
const { parseTransactionEmail } = require('../services/parser.service');
const Transaction = require('../models/Transaction');

const handleWebhook = async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.status(400).send('Missing message');

    const decodedData = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    console.log(`\n🔔 Webhook Ping received! History ID: ${decodedData.historyId}`);
    res.status(200).send('Webhook received');

    // --- FETCH THE ACTUAL EMAIL ---
    const gmail = getGmailClient();
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 3, 
      labelIds: ['INBOX'],
    });

    const messages = listRes.data.messages;
    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      const msgDetails = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full', 
      });

      const headers = msgDetails.data.payload.headers;
      const fromHeader = headers.find(h => h.name === 'From');
      
      if (fromHeader && fromHeader.value.toLowerCase().includes('canarabank.com')) {
        const emailText = getEmailText(msgDetails.data.payload);

        // --- REGEX PARSING & DATABASE SAVING ---
        if (emailText) {
          const transactionData = parseTransactionEmail(emailText);
          
          if (transactionData) {
            console.log('✅ Transaction Parsed Successfully! Attempting to save to DB...');
            
            const newTransaction = new Transaction(transactionData);
            await newTransaction.save();
            
            console.log('💾 Successfully saved to MongoDB Atlas!');
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  handleWebhook,
  getTransactions
};
