"use client";

import { useEffect, useState } from 'react';

// Helper function to check if a transaction date is in June (Legacy - can be removed, but kept for TransactionRow)
function isJuneTransaction(dateStr) {
  if (!dateStr) return false;
  if (dateStr.includes('/06/')) return true;
  if (dateStr.toUpperCase().includes('-JUN-')) return true;
  return false;
}

// Convert bank date strings to real Date objects for sorting
function parseTxDate(dateStr) {
  if (!dateStr) return new Date(0);
  
  // Bank Account Format: "28/06/26" or "10/06/2026"
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    // Handle both '26' and '2026'
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${fullYear}-${month}-${day}T00:00:00`);
  }
  
  // Credit Card Format: "28-JUN-26 21:31:34"
  // JS Date.parse can handle "28-JUN-2026 21:31:34" if we expand the year
  const expandedStr = dateStr.replace(/-(\d{2})\s/, '-20$1 ');
  const parsedDate = new Date(expandedStr);
  return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Credit Card');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/transactions`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sort transactions by actual date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => parseTxDate(b.date) - parseTxDate(a.date));

  // Date filtering logic
  const now = new Date();
  const isTransactionInDateRange = (txDateStr) => {
    if (dateFilter === 'All Time') return true;
    
    const txDate = parseTxDate(txDateStr);
    
    if (dateFilter === 'This Month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    
    if (dateFilter === 'Last 30 Days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return txDate >= thirtyDaysAgo && txDate <= now;
    }
    
    if (dateFilter === 'Custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    
    return true;
  };

  // Compute Statistics based on filtered transactions
  const displayedTransactions = sortedTransactions.filter(tx => {
    const accountMatch = filterType === 'Both' || tx.type === filterType;
    const dateMatch = isTransactionInDateRange(tx.date);
    return accountMatch && dateMatch;
  });
  
  const totalSpent = displayedTransactions.filter(tx => tx.flow === 'Debit').reduce((acc, tx) => acc + (tx.amount || 0), 0);
  const totalIncome = displayedTransactions.filter(tx => tx.flow === 'Credit').reduce((acc, tx) => acc + (tx.amount || 0), 0);
  
  // Get top merchant for selected period (Debits only)
  const merchantTotals = {};
  displayedTransactions.filter(tx => tx.flow === 'Debit').forEach(tx => {
    const m = tx.merchant !== 'Unknown' ? tx.merchant : 'POS/UPI';
    merchantTotals[m] = (merchantTotals[m] || 0) + tx.amount;
  });
  const topMerchant = Object.entries(merchantTotals).sort((a, b) => b[1] - a[1])[0];

  const periodLabel = dateFilter === 'This Month' ? 'This Month' : dateFilter === 'Last 30 Days' ? 'Last 30 Days' : dateFilter === 'Custom' ? 'Selected Period' : 'All Time';

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <main className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-titles">
          <h1>Overview</h1>
          <p className="subtitle">Your real-time automated expense tracking</p>
        </div>
        <div className="global-filter" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="This Month">This Month</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Custom">Custom Range</option>
            <option value="All Time">All Time</option>
          </select>
          
          {dateFilter === 'Custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                className="filter-dropdown" 
                style={{ minWidth: '130px' }}
              />
              <span style={{color: 'var(--text-secondary)'}}>to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                className="filter-dropdown"
                style={{ minWidth: '130px' }}
              />
            </div>
          )}

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-dropdown"
          >
            <option value="Both">All Accounts</option>
            <option value="Bank Account">Bank Account Only</option>
            <option value="Credit Card">Credit Card Only</option>
          </select>
        </div>
      </header>

      {/* --- DASHBOARD SUMMARY CARDS --- */}
      <section className="summary-section">
        <div className="summary-card highlight">
          <h3>Total Spent ({periodLabel})</h3>
          <div className="amount text-danger">{formatCurrency(totalSpent)}</div>
          <div className="trend">Across {displayedTransactions.filter(tx=>tx.flow==='Debit').length} debit transactions</div>
        </div>

        <div className="summary-card">
          <h3>Total Income ({periodLabel})</h3>
          <div className="amount text-success">{formatCurrency(totalIncome)}</div>
          <div className="trend">Across {displayedTransactions.filter(tx=>tx.flow==='Credit').length} credit transactions</div>
        </div>

        <div className="summary-card">
          <h3>Top Merchant ({periodLabel})</h3>
          <div className="amount text-primary">{topMerchant ? topMerchant[0] : '-'}</div>
          <div className="trend">{topMerchant ? formatCurrency(topMerchant[1]) : ''}</div>
        </div>
      </section>

      {/* --- RECENT TRANSACTIONS TABLE LOG --- */}
      <section className="recent-transactions">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Ledger Verification</h2>
          <span className="badge">{displayedTransactions.length} Total</span>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Syncing with ledger...</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found. Waiting for a webhook ping...</p>
          </div>
        ) : (
          <div className="glass-card wide-card">
            <div className="table-responsive">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Account</th>
                    <th>Merchant / Details</th>
                    <th className="text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions
                    .map((tx) => (
                    <TransactionRow key={tx._id} tx={tx} formatCurrency={formatCurrency} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function TransactionRow({ tx, formatCurrency }) {
  const typeClass = tx.type === 'Credit Card' ? 'type-Credit' : 'type-Bank';
  const isJune = isJuneTransaction(tx.date);
  const isCredit = tx.flow === 'Credit';
  
  return (
    <tr>
      <td className="col-date">{tx.date}</td>
      <td className="col-type">
        <span className={`tx-type ${typeClass}`}>{tx.type}</span>
        {isJune && <span className="tx-type type-June" style={{ marginLeft: '6px' }}>June</span>}
      </td>
      <td className="col-account">ending in {tx.account.slice(-4)}</td>
      <td className="col-merchant">
        {tx.merchant !== 'Unknown' ? tx.merchant : 'Point of Sale (POS)'}
      </td>
      <td className={`col-amount text-right font-bold ${isCredit ? 'text-success' : 'text-danger'}`}>
        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
      </td>
    </tr>
  );
}
