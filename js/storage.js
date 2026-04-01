// storage.js - localStorage persistence layer for InvestSim

const KEYS = {
  PORTFOLIO: 'investsim_portfolio',
  TRANSACTIONS: 'investsim_transactions',
  SIM_ACCOUNT: 'investsim_sim_account',
  SIM_TRADES: 'investsim_sim_trades',
  SIM_HISTORY: 'investsim_sim_history',
  PORT_HISTORY: 'investsim_port_history'
};

// ─── Default States ───────────────────────────────────────────────────────────

const DEFAULT_PORTFOLIO = {
  holdings: [],
  cashNTD: 0,
  cashUSD: 0
};

function _defaultSimAccount() {
  const now = new Date().toISOString();
  return {
    cashNTD: 100000,
    totalDeposited: 100000,
    startDate: now,
    lastIncomeDate: now,
    positions: []
  };
}

// ─── Portfolio (Real Holdings) ────────────────────────────────────────────────

function getPortfolio() {
  try {
    const raw = localStorage.getItem(KEYS.PORTFOLIO);
    return raw ? JSON.parse(raw) : { ...DEFAULT_PORTFOLIO };
  } catch {
    return { ...DEFAULT_PORTFOLIO };
  }
}

function savePortfolio(p) {
  localStorage.setItem(KEYS.PORTFOLIO, JSON.stringify(p));
}

// ─── Portfolio Transactions ───────────────────────────────────────────────────

function getTransactions() {
  try {
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addTransaction(tx) {
  const txs = getTransactions();
  txs.unshift(tx); // most recent first
  // Keep last 500
  if (txs.length > 500) txs.splice(500);
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
}

function clearTransactions() {
  localStorage.removeItem(KEYS.TRANSACTIONS);
}

// ─── Simulator Account ────────────────────────────────────────────────────────

function getSimAccount() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_ACCOUNT);
    return raw ? JSON.parse(raw) : _defaultSimAccount();
  } catch {
    return _defaultSimAccount();
  }
}

function saveSimAccount(a) {
  localStorage.setItem(KEYS.SIM_ACCOUNT, JSON.stringify(a));
}

function resetSimAccount() {
  localStorage.removeItem(KEYS.SIM_ACCOUNT);
  localStorage.removeItem(KEYS.SIM_TRADES);
  localStorage.removeItem(KEYS.SIM_HISTORY);
}

// ─── Simulator Trades (closed trade log) ─────────────────────────────────────

function getSimTrades() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_TRADES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addSimTrade(trade) {
  const trades = getSimTrades();
  trades.unshift(trade);
  if (trades.length > 500) trades.splice(500);
  localStorage.setItem(KEYS.SIM_TRADES, JSON.stringify(trades));
}

// ─── Simulator Equity History ─────────────────────────────────────────────────

function getSimHistory() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addSimSnapshot(totalNTD) {
  const history = getSimHistory();
  const entry = { date: today(), value: totalNTD };
  // Update today's entry if exists
  if (history.length > 0 && history[history.length - 1].date === entry.date) {
    history[history.length - 1].value = totalNTD;
  } else {
    history.push(entry);
    if (history.length > 365) history.splice(0, history.length - 365);
  }
  localStorage.setItem(KEYS.SIM_HISTORY, JSON.stringify(history));
}

// ─── Portfolio Equity History ─────────────────────────────────────────────────

function getPortHistory() {
  try {
    const raw = localStorage.getItem(KEYS.PORT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addPortSnapshot(totalNTD) {
  const history = getPortHistory();
  const entry = { date: today(), value: totalNTD };
  if (history.length > 0 && history[history.length - 1].date === entry.date) {
    history[history.length - 1].value = totalNTD;
  } else {
    history.push(entry);
    if (history.length > 365) history.splice(0, history.length - 365);
  }
  localStorage.setItem(KEYS.PORT_HISTORY, JSON.stringify(history));
}
