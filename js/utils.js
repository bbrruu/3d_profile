// utils.js - Utility functions for InvestSim

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtTWD(n) {
  if (n === null || n === undefined || isNaN(n)) return 'NT$--';
  return 'NT$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtUSD(n) {
  if (n === null || n === undefined || isNaN(n)) return '$--';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n, dec = 2) {
  if (n === null || n === undefined || isNaN(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '--%';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function colorClass(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return n >= 0 ? 'gain' : 'loss';
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function monthsBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function formatDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Math / Statistics ────────────────────────────────────────────────────────

function erf(x) {
  // Abramowitz and Stegun approximation
  const t = 1.0 / (1.0 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const result = 1.0 - poly * Math.exp(-x * x);
  return x >= 0 ? result : -result;
}

function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ─── Black-Scholes ────────────────────────────────────────────────────────────

/**
 * Black-Scholes option pricing model
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free interest rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {string} type - 'call' or 'put'
 * @returns {number} Option price
 */
function blackScholesPrice(S, K, T, r, sigma, type) {
  if (T <= 0) {
    // At expiration
    if (type === 'call') return Math.max(0, S - K);
    return Math.max(0, K - S);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/**
 * Calculate option Greeks using Black-Scholes
 * @returns {{ delta, gamma, theta, vega }}
 */
function optionGreeks(S, K, T, r, sigma, type) {
  if (T <= 0) {
    const intrinsic = type === 'call' ? S - K : K - S;
    return {
      delta: intrinsic > 0 ? (type === 'call' ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0
    };
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const sqrtT = Math.sqrt(T);

  const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  // Theta per calendar day
  const theta = (-(S * normalPDF(d1) * sigma) / (2 * sqrtT) -
    r * K * Math.exp(-r * T) * (type === 'call' ? normalCDF(d2) : normalCDF(-d2))) / 365;
  // Vega per 1% move in vol
  const vega = S * normalPDF(d1) * sqrtT * 0.01;

  return { delta, gamma, theta, vega };
}

// ─── Fee Calculators ──────────────────────────────────────────────────────────

/**
 * Taiwan stock fee
 * @param {number} value - Trade value in NTD
 * @param {string} direction - 'buy' or 'sell'
 * @returns {number} Fee in NTD
 */
function calcTWFee(value, direction) {
  const buyFee = Math.max(20, value * 0.001425);
  if (direction === 'buy') return buyFee;
  return buyFee + value * 0.003; // sell adds securities transaction tax
}

/**
 * US stock fee (zero commission)
 */
function calcUSFee() {
  return 0;
}

/**
 * Crypto trading fee
 * @param {number} value - Trade value
 * @returns {number} Fee (0.1%)
 */
function calcCryptoFee(value) {
  return value * 0.001;
}

/**
 * Taiwan futures fee
 * @param {number} contracts - Number of contracts
 * @returns {number} Fee in NTD
 */
function calcTWFuturesFee(contracts) {
  return contracts * 100; // NT$100/contract per side
}

/**
 * US futures fee
 * @param {number} contracts
 * @param {number} fxRate - TWD per USD
 * @returns {number} Fee in NTD
 */
function calcUSFuturesFee(contracts, fxRate) {
  return contracts * 5 * fxRate; // $5/contract converted
}

/**
 * Options fee
 * @param {number} contracts
 * @param {string} market - 'TW' or 'US'
 * @param {number} fxRate - TWD per USD
 * @returns {number} Fee in NTD
 */
function calcOptionsFee(contracts, market, fxRate) {
  if (market === 'TW') return contracts * 50;
  return contracts * 0.65 * fxRate;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

let _toastCount = 0;

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  _toastCount++;
  const id = 'toast-' + _toastCount;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = id;

  const icon = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' }[type] || 'ℹ';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  // Auto-remove after 4s
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
