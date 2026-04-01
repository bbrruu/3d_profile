// ============================================================
// storage.js – localStorage persistence layer
// ============================================================

const KEYS = {
  PORTFOLIO:     'investsim_portfolio',
  TRANSACTIONS:  'investsim_transactions',
  SIM_ACCOUNT:   'investsim_sim_account',
  SIM_TRADES:    'investsim_sim_trades',
  SIM_HISTORY:   'investsim_sim_history',
  PORT_HISTORY:  'investsim_port_history'
};

const DEFAULT_SIM = {
  cashNTD: 100000,
  totalDeposited: 100000,
  startDate: today(),
  lastIncomeDate: today(),
  positions: []
};

/* ── Portfolio ──────────────────────────────────────────── */
function getPortfolio() {
  try {
    const raw = localStorage.getItem(KEYS.PORTFOLIO);
    if (!raw) return { holdings: [], cashNTD: 0, cashUSD: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { holdings: [], cashNTD: 0, cashUSD: 0 };
  }
}

function savePortfolio(p) {
  localStorage.setItem(KEYS.PORTFOLIO, JSON.stringify(p));
}

/* ── Transactions ───────────────────────────────────────── */
function getTransactions() {
  try {
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addTransaction(tx) {
  const txns = getTransactions();
  tx.id = tx.id || generateId();
  tx.date = tx.date || today();
  txns.unshift(tx);
  // Keep last 500
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txns.slice(0, 500)));
}

function clearTransactions() {
  localStorage.removeItem(KEYS.TRANSACTIONS);
}

/* ── Simulator Account ──────────────────────────────────── */
function getSimAccount() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_ACCOUNT);
    if (!raw) return Object.assign({}, DEFAULT_SIM, { startDate: today(), lastIncomeDate: today() });
    return JSON.parse(raw);
  } catch (e) {
    return Object.assign({}, DEFAULT_SIM, { startDate: today(), lastIncomeDate: today() });
  }
}

function saveSimAccount(a) {
  localStorage.setItem(KEYS.SIM_ACCOUNT, JSON.stringify(a));
}

function resetSimAccount() {
  const fresh = Object.assign({}, DEFAULT_SIM, { startDate: today(), lastIncomeDate: today() });
  localStorage.setItem(KEYS.SIM_ACCOUNT, JSON.stringify(fresh));
  localStorage.removeItem(KEYS.SIM_TRADES);
  localStorage.removeItem(KEYS.SIM_HISTORY);
}

/* ── Simulator Trades Log ───────────────────────────────── */
function getSimTrades() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_TRADES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addSimTrade(trade) {
  const trades = getSimTrades();
  trade.id = trade.id || generateId();
  trade.date = trade.date || today();
  trades.unshift(trade);
  localStorage.setItem(KEYS.SIM_TRADES, JSON.stringify(trades.slice(0, 1000)));
}

/* ── Simulator Equity History ───────────────────────────── */
function getSimHistory() {
  try {
    const raw = localStorage.getItem(KEYS.SIM_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addSimSnapshot(totalNTD) {
  const hist = getSimHistory();
  const dt = today();
  // Update today's snapshot or add new
  if (hist.length > 0 && hist[hist.length - 1].date === dt) {
    hist[hist.length - 1].value = totalNTD;
  } else {
    hist.push({ date: dt, value: totalNTD });
  }
  localStorage.setItem(KEYS.SIM_HISTORY, JSON.stringify(hist.slice(-365)));
}

/* ── Portfolio Equity History ───────────────────────────── */
function getPortHistory() {
  try {
    const raw = localStorage.getItem(KEYS.PORT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addPortSnapshot(totalNTD) {
  const hist = getPortHistory();
  const dt = today();
  if (hist.length > 0 && hist[hist.length - 1].date === dt) {
    hist[hist.length - 1].value = totalNTD;
  } else {
    hist.push({ date: dt, value: totalNTD });
  }
  localStorage.setItem(KEYS.PORT_HISTORY, JSON.stringify(hist.slice(-365)));
}
