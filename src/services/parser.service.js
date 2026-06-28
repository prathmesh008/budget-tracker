/**
 * Parses Canara Bank transaction emails and extracts relevant data.
 * 
 * @param {string} emailText - The raw text body of the email
 * @returns {Object|null} - Extracted transaction data or null if parsing fails
 */
function parseTransactionEmail(emailText) {
  // Strip style tags and their contents
  let strippedText = emailText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Strip any remaining HTML tags
  strippedText = strippedText.replace(/<[^>]*>?/gm, ' ');
  // Normalize the text (remove excessive newlines and spaces to make regex matching easier)
  const normalizedText = strippedText.replace(/\s+/g, ' ').trim();

  const result = {
    type: 'Unknown',
    account: 'Unknown',
    amount: 0.0,
    currency: 'INR',
    merchant: 'Unknown',
    date: 'Unknown',
    amount: null,
    availableBalance: null,
    flow: 'Debit' // Default to Debit
  };

  // --- BANK ACCOUNT CREDIT PARSING ---
  if (normalizedText.includes('has been CREDITED')) {
    result.type = 'Bank Account';
    result.flow = 'Credit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+has been CREDITED/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const dateMatch = normalizedText.match(/on\s+(\d{2}\/\d{2}\/\d{2})/i);
    if (dateMatch) result.date = dateMatch[1];

    const accountMatch = normalizedText.match(/account\s+(XXXX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    const merchantMatch = normalizedText.match(/from\s+(.*?)\s+with/i);
    if (merchantMatch) result.merchant = merchantMatch[1].trim();

    const balanceMatch = normalizedText.match(/Balance INR\s+([\d,.]+)/i);
    if (balanceMatch) result.availableBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    
    return result.amount ? result : null;
  }

  // --- NEFT CREDIT PARSING ---
  if (normalizedText.includes('towards NEFT by Sender')) {
    result.type = 'Bank Account';
    result.flow = 'Credit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+has been credited/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const dateMatch = normalizedText.match(/on\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) result.date = dateMatch[1];

    const accountMatch = normalizedText.match(/(XXXX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    const merchantMatch = normalizedText.match(/Sender\s+(.*?),/i);
    if (merchantMatch) result.merchant = merchantMatch[1].trim();
    
    return result.amount ? result : null;
  }

  // --- BANK ACCOUNT UPI DEBIT PARSING ---
  if (normalizedText.includes('has been DEBITED') && normalizedText.includes('from your account')) {
    result.type = 'Bank Account';
    result.flow = 'Debit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+has been DEBITED/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const dateMatch = normalizedText.match(/on\s+(\d{2}\/\d{2}\/\d{2})/i);
    if (dateMatch) result.date = dateMatch[1];

    const accountMatch = normalizedText.match(/account\s+(XXXX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    const merchantMatch = normalizedText.match(/to\s+(.*?)\s+with/i);
    if (merchantMatch) result.merchant = merchantMatch[1].trim();

    const balanceMatch = normalizedText.match(/Balance INR\s+([\d,.]+)/i);
    if (balanceMatch) result.availableBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    
    return result.amount ? result : null;
  }

  // --- GENERIC BANK DEBIT PARSING (No merchant) ---
  if (normalizedText.includes('has been DEBITED to your account')) {
    result.type = 'Bank Account';
    result.flow = 'Debit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+has been DEBITED/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const dateMatch = normalizedText.match(/on\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) result.date = dateMatch[1];

    const accountMatch = normalizedText.match(/account\s+(XXXX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    result.merchant = 'Bank Transfer/Debit';
    
    return result.amount ? result : null;
  }

  // --- NEW CREDIT CARD DEBIT PARSING (After June 23) ---
  if (normalizedText.includes('Canara Bank Credit Card No.')) {
    result.type = 'Credit Card';
    result.flow = 'Debit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+debited/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const accountMatch = normalizedText.match(/Credit Card No\.\s+(XX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    const merchantMatch = normalizedText.match(/No\.\s+XX\d{4}\s+for\s+(.*?)(?:\s+on\b|\s+with\b|$)/i);
    if (merchantMatch) result.merchant = merchantMatch[1].trim();

    const dateMatch = normalizedText.match(/on\s+(\d{2}-[a-zA-Z]{3}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
    if (dateMatch) result.date = dateMatch[1];

    const limitMatch = normalizedText.match(/Avl limit INR\s+([\d,.]+)/i);
    if (limitMatch) result.availableBalance = parseFloat(limitMatch[1].replace(/,/g, ''));

    return result.amount ? result : null;
  }

  // --- OLD CREDIT CARD DEBIT PARSING (Before June 23) ---
  if (normalizedText.includes('Canara Credit Card XX')) {
    result.type = 'Credit Card';
    result.flow = 'Debit';

    const amtMatch = normalizedText.match(/INR\s+([\d,.]+)\s+is debited/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const accountMatch = normalizedText.match(/Credit Card\s+(XX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    const merchantMatch = normalizedText.match(/XX\d{4}\s+for\s+(.*?)(?:\s+on\b|\s+with\b|$)/i);
    if (merchantMatch) result.merchant = merchantMatch[1].trim();

    // Date format has "at" e.g. "on 07-JUN-26 at 13:44:44"
    const dateMatch = normalizedText.match(/on\s+(\d{2}-[a-zA-Z]{3}-\d{2})\s+at\s+(\d{2}:\d{2}:\d{2})/i);
    if (dateMatch) result.date = `${dateMatch[1]} ${dateMatch[2]}`;

    const limitMatch = normalizedText.match(/Available limit Rs\s+([\d,.]+)/i);
    if (limitMatch) result.availableBalance = parseFloat(limitMatch[1].replace(/,/g, ''));

    return result.amount ? result : null;
  }

  // --- BANK ACCOUNT DEBIT PARSING ---
  if (normalizedText.includes('linked to card debited') || normalizedText.includes('debited Rs INR')) {
    result.type = 'Bank Account';
    result.flow = 'Debit';
    
    // Account Number
    const accountMatch = normalizedText.match(/A\/C\s+(XXXX\d{4})/i);
    if (accountMatch) result.account = accountMatch[1];

    // Amount
    const amountMatch = normalizedText.match(/debited Rs INR\s+([\d,.]+)/i);
    if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Date
    const dateMatch = normalizedText.match(/on\s+(\d{2}\/\d{2}\/\d{2})/i);
    if (dateMatch) result.date = dateMatch[1];

    // Merchant / Transaction Type
    // The format doesn't always have a strict "for [merchant]". Sometimes it just says "POS txn" or "UPI txn".
    // We will extract whatever is between the date and "Avl Bal"
    const merchantMatch = normalizedText.match(/on\s+\d{2}\/\d{2}\/\d{2}\s+(.*?)\.Avl Bal/i) || 
                          normalizedText.match(/on\s+\d{2}\/\d{2}\/\d{2}\s+(.*?)\s+Avl Bal/i);
    if (merchantMatch) {
      result.merchant = merchantMatch[1].trim();
    }

    // Available Balance
    const balanceMatch = normalizedText.match(/Avl Bal is Rs INR\s+([\d,.]+)/i);
    if (balanceMatch) result.availableBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));

    return result;
  }

  // If the email doesn't match our known debit formats, return null
  return null;
}

module.exports = { parseTransactionEmail };
