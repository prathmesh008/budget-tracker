require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');

async function checkDB() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const transactions = await Transaction.find();
  console.log(`Found ${transactions.length} transactions`);

  transactions.forEach(tx => {
    console.log(`- Amount: ${tx.amount} | Merchant: ${tx.merchant} | Date: ${tx.date}`);
  });

  process.exit(0);
}

checkDB();
