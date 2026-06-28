const mongoose = require('mongoose');

// Define the Schema (Blueprint) for our Transaction documents
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Credit Card', 'Bank Account', 'Unknown'] // Validates that type is exactly one of these
  },
  account: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  flow: {
    type: String,
    enum: ['Debit', 'Credit'],
    default: 'Debit'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  merchant: {
    type: String,
    default: 'Unknown'
  },
  date: {
    type: String,
    required: true
  },
  availableBalance: {
    type: Number
  }
}, {
  timestamps: true // Automatically adds 'createdAt' and 'updatedAt' fields
});

// Compile the schema into a model
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
