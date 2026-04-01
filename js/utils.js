// ============================================================
// utils.js – Formatting, math helpers, Black-Scholes, fees
// ============================================================

/* ── Formatting ─────────────────────────────────────────── */
function fmtTWD(n) {
  if (n == null || isNaN(n)) return 'NT$--';
  return 'NT$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtUSD(n) {
  if (n == null || isNaN(n)) return '$--';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n, dec) {
  if (dec === undefined) dec = 2;
  if (n == null || isNaN(n)) return '--';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '--%';
  const sign = n >= 0 ? '+' : '';
  return sign + fmtNum(n, 2) + '%';
}

function colorClass(n) {
  if (n == null || isNaN(n)) return '';
  return n >= 0 ? 'gain' : 'loss';
}

/* ── Date helpers ───────────────────────────────────────── */
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
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return iso;
  }
}

/* ── Math – erf / CDF / PDF ─────────────────────────────── */
function erf(x) {
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

/* ── Black-Scholes ──────────────────────────────────────── */
// S=spot, K=strike, T=time to expiry (years), r=risk-free rate, sigma=IV, type='call'|'put'
function blackScholesPrice(S, K, T, r, sigma, type) {
  if (T <= 0) {
    return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

function optionGreeks(S, K, T, r, sigma, type) {
  if (T <= 0) {
    const delta = type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
    return { delta, gamma: 0, theta: 0, vega: 0 };
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const pdf1 = normalPDF(d1);
  const sqrtT = Math.sqrt(T);

  const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = pdf1 / (S * sigma * sqrtT);

  // Theta per calendar day (negative for long positions)
  const thetaBase = -(S * pdf1 * sigma) / (2 * sqrtT);
  const thetaDiscount = r * K * Math.exp(-r * T);
  let theta;
  if (type === 'call') {
    theta = (thetaBase - thetaDiscount * normalCDF(d2)) / 365;
  } else {
    theta = (thetaBase + thetaDiscount * normalCDF(-d2)) / 365;
  }

  const vega = S * pdf1 * sqrtT / 100; // per 1% IV change

  return { delta, gamma, theta, vega };
}

/* ── Transaction Fee Calculators ───────────────────────── */
function calcTWFee(value, direction) {
  const buyFee = Math.max(20, value * 0.001425);
  if (direction === 'buy') return buyFee;
  return buyFee + value * 0.003; // includes securities transaction tax
}

function calcUSFee() {
  return 0;
}

function calcCryptoFee(value) {
  return value * 0.001; // 0.1%
}

function calcTWFuturesFee(contracts) {
  return contracts * 100 * 2; // NT$100/side × 2 sides (round-trip)
}

function calcUSFuturesFee(contracts, fxRate) {
  const usdFee = contracts * 5 * 2;
  return usdFee * (fxRate || 31.5);
}

function calcOptionsFee(contracts, market, fxRate) {
  if (market === 'TW') {
    return contracts * 50;
  } else {
    return contracts * 0.65 * (fxRate || 31.5);
  }
}

/* ── Toast Notifications ────────────────────────────────── */
function showToast(msg, type) {
  if (!type) type = 'info';
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span>' +
                    '<span class="toast-msg">' + msg + '</span>';
  container.appendChild(toast);

  requestAnimationFrame(function() { toast.classList.add('show'); });

  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 400);
  }, 3500);
}

/* ── Unique ID ──────────────────────────────────────────── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
