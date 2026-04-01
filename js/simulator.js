// ============================================================
// simulator.js – Paper trading simulator
// ============================================================

/* ── Main Render ────────────────────────────────────────── */
async function renderSimulatorTab() {
  checkMonthlyIncome();
  renderSimSummary();
  renderSimLog();

  // Render holdings with prices
  const account = getSimAccount();
  const positions = account.positions || [];

  if (positions.length === 0) {
    const tbody = document.getElementById('sim-holdings-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No open positions.</td></tr>';
    updateSimEquityCurve();
    return;
  }

  // Fetch prices for all positions
  const stockSymbols = positions
    .filter(function(p) { return p.assetType === 'Stock' || p.assetType === 'ETF'; })
    .map(function(p) { return p.symbol; });

  const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const prices = {};

  try {
    if (stockSymbols.length > 0) {
      const quotes = await fetchMultipleQuotes(stockSymbols);
      Object.assign(prices, quotes);
    }
  } catch (e) {
    showToast('Price fetch error: ' + e.message, 'error');
  }

  // Fetch crypto prices
  const cryptoPositions = positions.filter(function(p) { return p.assetType === 'Crypto'; });
  if (cryptoPositions.length > 0) {
    const coinIds = cryptoPositions.map(function(p) { return getCoinId(p.symbol); });
    try {
      const cryptoData = await fetchCryptoPrices(coinIds);
      cryptoPositions.forEach(function(p) {
        const id = getCoinId(p.symbol);
        if (cryptoData[id]) {
          prices[p.symbol] = {
            symbol: p.symbol,
            price: cryptoData[id].usd,
            priceTWD: cryptoData[id].twd,
            changePct: cryptoData[id].usd_24h_change || 0
          };
        }
      });
    } catch (e) {
      // ignore
    }
  }

  renderSimHoldings(prices, fxRate);
  renderSimSummary(prices, fxRate);
  updateSimEquityCurve();
}

/* ── Monthly Income ─────────────────────────────────────── */
function checkMonthlyIncome() {
  const account = getSimAccount();
  const now     = new Date();
  const last    = new Date(account.lastIncomeDate);

  const monthsElapsed = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());

  if (monthsElapsed >= 1) {
    const monthsToAdd = monthsElapsed;
    const income      = 25000 * monthsToAdd;
    account.cashNTD  += income;
    account.totalDeposited = (account.totalDeposited || 100000) + income;
    account.lastIncomeDate = now.toISOString().split('T')[0];
    saveSimAccount(account);

    showIncomeNotification(income, monthsToAdd);
    showToast('Monthly income received: ' + fmtTWD(income), 'success');
  }
}

function simulateNextMonth() {
  const account = getSimAccount();
  const last    = new Date(account.lastIncomeDate);
  last.setMonth(last.getMonth() + 1);
  account.lastIncomeDate = last.toISOString().split('T')[0];
  saveSimAccount(account);

  showToast('Simulated +1 month. Running income check...', 'info');
  checkMonthlyIncome();
  renderSimulatorTab();
}

function showIncomeNotification(income, months) {
  const banner = document.getElementById('income-banner');
  if (!banner) return;
  const msg = document.getElementById('income-banner-msg');
  if (msg) msg.textContent = 'Monthly income received: ' + fmtTWD(income) + ' (' + months + ' month' + (months > 1 ? 's' : '') + ')';
  banner.style.display = 'flex';
  setTimeout(function() {
    banner.style.display = 'none';
  }, 6000);
}

/* ── Summary Cards ──────────────────────────────────────── */
function renderSimSummary(prices, fxRate) {
  if (!fxRate) fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const account   = getSimAccount();
  const positions = account.positions || [];

  let openValue = 0;
  positions.forEach(function(p) {
    const q = prices && prices[p.symbol];
    if (q && q.price) {
      const px = p.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price;
      openValue += px * p.quantity;
    } else {
      // Use entry price as fallback
      openValue += p.entryCostNTD || 0;
    }
  });

  const totalEquity = account.cashNTD + openValue;
  const totalDep    = account.totalDeposited || 100000;
  const pnl         = totalEquity - totalDep;
  const pnlPct      = totalDep > 0 ? (pnl / totalDep) * 100 : 0;

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setClass(id, n) {
    const el = document.getElementById(id);
    if (el) el.className = 'card-value ' + colorClass(n);
  }

  setEl('sim-equity',     fmtTWD(totalEquity));
  setEl('sim-cash',       fmtTWD(account.cashNTD));
  setEl('sim-pnl',        fmtTWD(pnl));
  setClass('sim-pnl',     pnl);
  setEl('sim-pnlpct',     fmtPct(pnlPct));
  setClass('sim-pnlpct',  pnlPct);
  setEl('sim-positions',  positions.length);
  setEl('sim-deposited',  fmtTWD(totalDep));
}

/* ── Holdings Table ─────────────────────────────────────── */
function renderSimHoldings(prices, fxRate) {
  const tbody = document.getElementById('sim-holdings-tbody');
  if (!tbody) return;

  const account   = getSimAccount();
  const positions = account.positions || [];

  if (positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No open positions.</td></tr>';
    return;
  }

  tbody.innerHTML = positions.map(function(p) {
    const q        = prices && prices[p.symbol];
    let currPrice  = null;
    if (q && q.price) {
      currPrice = p.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price;
    }

    const entryCostNTD = p.entryCostNTD || 0;
    const currentVal   = currPrice != null ? currPrice * p.quantity : entryCostNTD;
    const pnl          = currentVal - entryCostNTD;
    const pnlPct       = entryCostNTD > 0 ? (pnl / entryCostNTD) * 100 : 0;

    const qtyStr = p.assetType === 'Crypto' ? fmtNum(p.quantity, 6) :
                   (p.assetType === 'Options' ? fmtNum(p.quantity, 0) + ' cts' :
                   fmtNum(p.quantity, 0));

    return '<tr>' +
      '<td><strong>' + p.symbol + '</strong><br><span class="sub">' + p.assetType + '</span></td>' +
      '<td>' + qtyStr + '</td>' +
      '<td>' + fmtTWD(entryCostNTD / Math.max(p.quantity, 0.000001)) + '</td>' +
      '<td>' + (currPrice != null ? fmtTWD(currPrice) : '--') + '</td>' +
      '<td>' + fmtTWD(currentVal) + '</td>' +
      '<td class="' + colorClass(pnl) + '">' + fmtTWD(pnl) + '<br><span class="sub">' + fmtPct(pnlPct) + '</span></td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="closeSimPosition(\'' + p.id + '\')">Close</button></td>' +
      '</tr>';
  }).join('');
}

/* ── Sim Trade Log ──────────────────────────────────────── */
function renderSimLog() {
  const tbody = document.getElementById('sim-log-tbody');
  if (!tbody) return;
  const trades = getSimTrades();

  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No trades yet.</td></tr>';
    return;
  }

  tbody.innerHTML = trades.slice(0, 50).map(function(t) {
    const dirClass = t.direction === 'buy' ? 'gain' : 'loss';
    return '<tr>' +
      '<td>' + formatDate(t.date) + '</td>' +
      '<td><strong>' + t.symbol + '</strong></td>' +
      '<td>' + t.assetType + '</td>' +
      '<td class="' + dirClass + '">' + t.direction.toUpperCase() + '</td>' +
      '<td>' + fmtNum(t.quantity, t.assetType === 'Crypto' ? 6 : 2) + '</td>' +
      '<td>' + fmtTWD(t.priceNTD) + '</td>' +
      '<td>' + fmtTWD(t.totalNTD) + '</td>' +
      '</tr>';
  }).join('');
}

/* ── Asset Type Panel Switcher ──────────────────────────── */
function handleAssetTypeSwitch(type) {
  document.querySelectorAll('.asset-type-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.type === type);
  });
  document.querySelectorAll('.trade-panel').forEach(function(p) {
    p.style.display = p.dataset.panel === type ? 'block' : 'none';
  });
}

/* ── Stock/ETF Trade ────────────────────────────────────── */
async function fetchStockPriceForTrade() {
  const symbol = (document.getElementById('sim-stock-symbol') || {}).value.trim().toUpperCase();
  if (!symbol) return;

  const priceEl = document.getElementById('sim-stock-price-display');
  const feeEl   = document.getElementById('sim-stock-fee-preview');
  if (priceEl) priceEl.textContent = 'Loading...';

  try {
    const quote = await fetchQuote(symbol);
    if (!quote) throw new Error('No data');

    if (priceEl) priceEl.textContent = (quote.currency === 'TWD' ? fmtTWD(quote.price) : fmtUSD(quote.price));

    // Store for fee calc
    const priceInput = document.getElementById('sim-stock-price');
    if (priceInput) {
      priceInput.value = quote.price;
      priceInput.dataset.currency = quote.currency;
    }

    calculateStockFeePreview();
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error';
    showToast('Cannot fetch price for ' + symbol, 'error');
  }
}

function calculateStockFeePreview() {
  const symbol   = (document.getElementById('sim-stock-symbol')  || {}).value.trim().toUpperCase();
  const qty      = parseFloat((document.getElementById('sim-stock-qty')   || {}).value) || 0;
  const price    = parseFloat((document.getElementById('sim-stock-price') || {}).value) || 0;
  const dir      = (document.getElementById('sim-stock-dir')     || {}).value || 'buy';
  const priceInput = document.getElementById('sim-stock-price');
  const currency = priceInput ? (priceInput.dataset.currency || 'TWD') : 'TWD';
  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };

  const feeEl = document.getElementById('sim-stock-fee-preview');
  if (!feeEl) return;

  if (!qty || !price) { feeEl.textContent = 'Fee: --'; return; }

  const isTW   = symbol.endsWith('.TW') || symbol.endsWith('.TWO') || currency === 'TWD';
  const value  = isTW ? price * qty : price * qty * fxRate.twdPerUsd;
  const fee    = isTW ? calcTWFee(value, dir) : calcUSFee();
  const total  = value + (dir === 'buy' ? fee : -fee);

  feeEl.innerHTML = 'Value: ' + fmtTWD(value) + ' &nbsp;|&nbsp; Fee: ' + fmtTWD(fee) + ' &nbsp;|&nbsp; <strong>Total: ' + fmtTWD(total) + '</strong>';
}

async function executeStockTrade() {
  const symbol   = (document.getElementById('sim-stock-symbol')  || {}).value.trim().toUpperCase();
  const qty      = parseFloat((document.getElementById('sim-stock-qty')   || {}).value);
  const priceInput = document.getElementById('sim-stock-price');
  const price    = parseFloat((priceInput || {}).value);
  const dir      = (document.getElementById('sim-stock-dir')     || {}).value || 'buy';
  const currency = priceInput ? (priceInput.dataset.currency || 'TWD') : 'TWD';

  if (!symbol || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
    showToast('Please fill in symbol, quantity, and price.', 'warning');
    return;
  }

  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const isTW     = symbol.endsWith('.TW') || symbol.endsWith('.TWO') || currency === 'TWD';
  const priceNTD = isTW ? price : price * fxRate.twdPerUsd;
  const value    = priceNTD * qty;
  const fee      = isTW ? calcTWFee(value, dir) : calcUSFee();
  const totalCost = dir === 'buy' ? value + fee : value - fee;

  const account  = getSimAccount();

  if (dir === 'buy') {
    if (account.cashNTD < totalCost) {
      showToast('Insufficient cash. Need ' + fmtTWD(totalCost) + ', have ' + fmtTWD(account.cashNTD), 'error');
      return;
    }
    account.cashNTD -= totalCost;
    account.positions = account.positions || [];

    // Check if position exists
    const existing = account.positions.find(function(p) { return p.symbol === symbol && p.assetType === (symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'Stock' : 'Stock'); });
    if (existing) {
      // Average up/down
      const prevCost  = existing.entryCostNTD;
      const newCost   = priceNTD * qty;
      existing.quantity    += qty;
      existing.entryCostNTD = prevCost + newCost;
    } else {
      account.positions.push({
        id: generateId(),
        symbol,
        assetType: 'Stock',
        quantity: qty,
        currency,
        entryPrice: price,
        entryPriceNTD: priceNTD,
        entryCostNTD: priceNTD * qty,
        openDate: today()
      });
    }
  } else {
    // Sell
    const pos = (account.positions || []).find(function(p) { return p.symbol === symbol; });
    if (!pos || pos.quantity < qty) {
      showToast('Insufficient position to sell.', 'error');
      return;
    }
    account.cashNTD += totalCost;
    pos.quantity -= qty;
    pos.entryCostNTD -= (pos.entryCostNTD / (pos.quantity + qty)) * qty;
    if (pos.quantity <= 0) {
      account.positions = account.positions.filter(function(p) { return p.id !== pos.id; });
    }
  }

  saveSimAccount(account);
  addSimTrade({ symbol, assetType: 'Stock', direction: dir, quantity: qty, priceNTD, fee, totalNTD: totalCost });
  addSimSnapshot(account.cashNTD + _calcOpenPositionValue(account.positions, fxRate));
  showToast(dir.toUpperCase() + ' ' + qty + ' ' + symbol + ' @ ' + fmtTWD(priceNTD), 'success');
  renderSimulatorTab();
}

/* ── Crypto Trade ───────────────────────────────────────── */
async function fetchCryptoPriceForTrade() {
  const symbol = (document.getElementById('sim-crypto-symbol') || {}).value.trim().toUpperCase();
  if (!symbol) return;

  const priceEl = document.getElementById('sim-crypto-price-display');
  if (priceEl) priceEl.textContent = 'Loading...';

  try {
    const coinId = getCoinId(symbol);
    const data   = await fetchCryptoPrices([coinId]);
    const entry  = data[coinId];
    if (!entry) throw new Error('Coin not found');

    const priceUSD = entry.usd;
    if (priceEl) priceEl.textContent = fmtUSD(priceUSD) + ' (' + fmtTWD(entry.twd) + ')';

    const priceInput = document.getElementById('sim-crypto-price');
    if (priceInput) priceInput.value = priceUSD;

    const feeEl = document.getElementById('sim-crypto-fee-preview');
    const qtyEl = document.getElementById('sim-crypto-qty');
    if (feeEl && qtyEl) {
      const qty   = parseFloat(qtyEl.value) || 0;
      const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
      const value = priceUSD * qty * fxRate.twdPerUsd;
      const fee   = calcCryptoFee(value);
      feeEl.textContent = 'Fee: ' + fmtTWD(fee);
    }
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error';
    showToast('Cannot fetch crypto price for ' + symbol, 'error');
  }
}

async function executeCryptoTrade() {
  const symbol = (document.getElementById('sim-crypto-symbol') || {}).value.trim().toUpperCase();
  const qty    = parseFloat((document.getElementById('sim-crypto-qty')   || {}).value);
  const price  = parseFloat((document.getElementById('sim-crypto-price') || {}).value);
  const dir    = (document.getElementById('sim-crypto-dir') || {}).value || 'buy';

  if (!symbol || isNaN(qty) || qty <= 0) {
    showToast('Please enter symbol and quantity.', 'warning');
    return;
  }

  let priceUSD = price;
  if (!priceUSD || isNaN(priceUSD)) {
    try {
      const coinId = getCoinId(symbol);
      const data   = await fetchCryptoPrices([coinId]);
      priceUSD     = data[coinId] ? data[coinId].usd : null;
    } catch (e) {}
  }

  if (!priceUSD) { showToast('Cannot determine price.', 'error'); return; }

  const fxRate    = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const priceNTD  = priceUSD * fxRate.twdPerUsd;
  const value     = priceNTD * qty;
  const fee       = calcCryptoFee(value);
  const totalCost = dir === 'buy' ? value + fee : value - fee;

  const account = getSimAccount();

  if (dir === 'buy') {
    if (account.cashNTD < totalCost) {
      showToast('Insufficient cash.', 'error');
      return;
    }
    account.cashNTD -= totalCost;
    account.positions = account.positions || [];
    const existing = account.positions.find(function(p) { return p.symbol === symbol && p.assetType === 'Crypto'; });
    if (existing) {
      existing.entryCostNTD += priceNTD * qty;
      existing.quantity     += qty;
    } else {
      account.positions.push({
        id: generateId(),
        symbol,
        assetType: 'Crypto',
        quantity: qty,
        currency: 'USD',
        entryPrice: priceUSD,
        entryCostNTD: priceNTD * qty,
        openDate: today()
      });
    }
  } else {
    const pos = (account.positions || []).find(function(p) { return p.symbol === symbol && p.assetType === 'Crypto'; });
    if (!pos || pos.quantity < qty) { showToast('Insufficient position.', 'error'); return; }
    account.cashNTD += totalCost;
    pos.quantity    -= qty;
    if (pos.quantity <= 0.0000001) {
      account.positions = account.positions.filter(function(p) { return p.id !== pos.id; });
    }
  }

  saveSimAccount(account);
  addSimTrade({ symbol, assetType: 'Crypto', direction: dir, quantity: qty, priceNTD, fee, totalNTD: totalCost });
  showToast(dir.toUpperCase() + ' ' + fmtNum(qty, 6) + ' ' + symbol + ' @ ' + fmtUSD(priceUSD), 'success');
  renderSimulatorTab();
}

/* ── Options Trade ──────────────────────────────────────── */
function calculateOptionPrice() {
  const S      = parseFloat((document.getElementById('opt-spot')    || {}).value) || 0;
  const K      = parseFloat((document.getElementById('opt-strike')  || {}).value) || 0;
  const T      = parseFloat((document.getElementById('opt-expiry')  || {}).value) || 0;
  const r      = parseFloat((document.getElementById('opt-rate')    || {}).value) || 0.045;
  const sigma  = parseFloat((document.getElementById('opt-iv')      || {}).value) || 0.20;
  const type   = (document.getElementById('opt-type')    || {}).value || 'call';
  const market = (document.getElementById('opt-market')  || {}).value || 'US';

  if (!S || !K || !T) {
    clearGreeks();
    return;
  }

  const Tyears = T / 365;
  const price  = blackScholesPrice(S, K, Tyears, r, sigma, type);
  const greeks = optionGreeks(S, K, Tyears, r, sigma, type);

  function setEl(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

  setEl('opt-price-display', (market === 'TW' ? fmtTWD(price) : fmtUSD(price)));
  setEl('greek-delta', fmtNum(greeks.delta, 4));
  setEl('greek-gamma', fmtNum(greeks.gamma, 4));
  setEl('greek-theta', fmtNum(greeks.theta, 4));
  setEl('greek-vega',  fmtNum(greeks.vega,  4));

  const contracts = parseInt((document.getElementById('opt-contracts') || {}).value) || 1;
  const size      = market === 'TW' ? 50 : 100;
  const fxRate    = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const priceNTD  = market === 'TW' ? price : price * fxRate.twdPerUsd;
  const totalVal  = priceNTD * size * contracts;
  const fee       = calcOptionsFee(contracts, market, fxRate.twdPerUsd);

  setEl('opt-total-display', fmtTWD(totalVal + fee));
}

function clearGreeks() {
  ['opt-price-display','greek-delta','greek-gamma','greek-theta','greek-vega','opt-total-display']
    .forEach(function(id) { const el = document.getElementById(id); if (el) el.textContent = '--'; });
}

function executeOptionTrade() {
  const S         = parseFloat((document.getElementById('opt-spot')      || {}).value) || 0;
  const K         = parseFloat((document.getElementById('opt-strike')    || {}).value) || 0;
  const T         = parseFloat((document.getElementById('opt-expiry')    || {}).value) || 0;
  const r         = parseFloat((document.getElementById('opt-rate')      || {}).value) || 0.045;
  const sigma     = parseFloat((document.getElementById('opt-iv')        || {}).value) || 0.20;
  const type      = (document.getElementById('opt-type')     || {}).value || 'call';
  const market    = (document.getElementById('opt-market')   || {}).value || 'US';
  const contracts = parseInt((document.getElementById('opt-contracts')   || {}).value) || 1;
  const dir       = (document.getElementById('opt-dir')      || {}).value || 'buy';

  if (!S || !K || !T) { showToast('Fill in all option parameters.', 'warning'); return; }

  const Tyears    = T / 365;
  const optPrice  = blackScholesPrice(S, K, Tyears, r, sigma, type);
  const size      = market === 'TW' ? 50 : 100;
  const fxRate    = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const priceNTD  = market === 'TW' ? optPrice : optPrice * fxRate.twdPerUsd;
  const premium   = priceNTD * size * contracts;
  const fee       = calcOptionsFee(contracts, market, fxRate.twdPerUsd);
  const totalCost = dir === 'buy' ? premium + fee : premium - fee;

  const account   = getSimAccount();

  if (dir === 'buy') {
    if (account.cashNTD < totalCost) {
      showToast('Insufficient cash for premium + fee: ' + fmtTWD(totalCost), 'error');
      return;
    }
    account.cashNTD -= totalCost;
    account.positions = account.positions || [];
    account.positions.push({
      id: generateId(),
      symbol: (market === 'TW' ? 'TX' : 'SPX') + ' ' + K + type.toUpperCase() + ' ' + T + 'd',
      assetType: 'Options',
      quantity: contracts,
      currency: market === 'TW' ? 'TWD' : 'USD',
      entryPrice: optPrice,
      entryCostNTD: premium,
      openDate: today(),
      meta: { S, K, T, r, sigma, type, market, size }
    });
  } else {
    showToast('Short options not supported in simulator.', 'warning');
    return;
  }

  saveSimAccount(account);
  addSimTrade({ symbol: K + type.toUpperCase(), assetType: 'Options', direction: dir, quantity: contracts, priceNTD, fee, totalNTD: totalCost });
  showToast('Options trade executed: ' + fmtTWD(totalCost), 'success');
  renderSimulatorTab();
}

/* ── Futures Trade ──────────────────────────────────────── */
async function fetchFuturesPrice() {
  const symbol  = (document.getElementById('fut-symbol') || {}).value.trim().toUpperCase();
  if (!symbol) return;

  const priceEl  = document.getElementById('fut-price-display');
  const marginEl = document.getElementById('fut-margin-display');
  if (priceEl) priceEl.textContent = 'Loading...';

  const futSymbolMap = {
    'TX':  'TXF=F',
    'ES':  'ES=F',
    'NQ':  'NQ=F',
    'CL':  'CL=F',
    'GC':  'GC=F'
  };

  const yahooSym = futSymbolMap[symbol] || symbol + '=F';

  try {
    const quote   = await fetchQuote(yahooSym);
    const fxRate  = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
    const isTW    = symbol === 'TX';
    const priceNTD = isTW ? quote.price : quote.price * fxRate.twdPerUsd;

    // Multiplier: TX=200, ES=50, NQ=20, CL=1000, GC=100
    const multipliers = { TX: 200, ES: 50, NQ: 20, CL: 1000, GC: 100 };
    const mult = multipliers[symbol] || 50;
    const contractValue = priceNTD * mult;
    const margin = contractValue * 0.10; // 10%

    if (priceEl) priceEl.textContent = (isTW ? fmtTWD(quote.price) : fmtUSD(quote.price));
    if (marginEl) marginEl.textContent = 'Contract Value: ' + fmtTWD(contractValue) + ' | Margin (10%): ' + fmtTWD(margin);

    const priceInput = document.getElementById('fut-price');
    if (priceInput) {
      priceInput.value = quote.price;
      priceInput.dataset.currency = isTW ? 'TWD' : 'USD';
    }
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error';
    showToast('Cannot fetch futures price', 'error');
  }
}

function executeFuturesTrade() {
  const symbol     = (document.getElementById('fut-symbol')    || {}).value.trim().toUpperCase();
  const contracts  = parseInt((document.getElementById('fut-contracts') || {}).value) || 1;
  const priceInput = document.getElementById('fut-price');
  const price      = parseFloat((priceInput || {}).value);
  const dir        = (document.getElementById('fut-dir')       || {}).value || 'buy';
  const currency   = priceInput ? (priceInput.dataset.currency || 'USD') : 'USD';

  if (!symbol || isNaN(price) || price <= 0) {
    showToast('Please fetch price first.', 'warning');
    return;
  }

  const fxRate     = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  const isTW       = symbol === 'TX';
  const priceNTD   = isTW ? price : price * fxRate.twdPerUsd;
  const multipliers= { TX: 200, ES: 50, NQ: 20, CL: 1000, GC: 100 };
  const mult       = multipliers[symbol] || 50;
  const contractVal= priceNTD * mult;
  const margin     = contractVal * contracts * 0.10;
  const fee        = isTW ? calcTWFuturesFee(contracts) : calcUSFuturesFee(contracts, fxRate.twdPerUsd);

  const account    = getSimAccount();

  if (account.cashNTD < margin + fee) {
    showToast('Insufficient margin. Need ' + fmtTWD(margin + fee), 'error');
    return;
  }

  account.cashNTD -= margin + fee;
  account.positions = account.positions || [];
  account.positions.push({
    id: generateId(),
    symbol: symbol + (dir === 'buy' ? ' LONG' : ' SHORT') + ' x' + contracts,
    assetType: 'Futures',
    quantity: contracts,
    currency: isTW ? 'TWD' : 'USD',
    entryPrice: price,
    entryCostNTD: margin,
    openDate: today(),
    meta: { symbol, contracts, multiplier: mult, margin, dir }
  });

  saveSimAccount(account);
  addSimTrade({ symbol, assetType: 'Futures', direction: dir, quantity: contracts, priceNTD, fee, totalNTD: margin + fee });
  showToast(dir.toUpperCase() + ' ' + contracts + ' ' + symbol + ' futures. Margin: ' + fmtTWD(margin), 'success');
  renderSimulatorTab();
}

/* ── Close Position ─────────────────────────────────────── */
async function closeSimPosition(id) {
  const account = getSimAccount();
  const pos = (account.positions || []).find(function(p) { return p.id === id; });
  if (!pos) return;

  const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 };
  let returnedNTD = pos.entryCostNTD; // default: return cost

  // Try to get live price for stocks/crypto
  try {
    if (pos.assetType === 'Stock' || pos.assetType === 'ETF') {
      const q = await fetchQuote(pos.symbol);
      const priceNTD = pos.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price;
      returnedNTD = priceNTD * pos.quantity;
    } else if (pos.assetType === 'Crypto') {
      const coinId = getCoinId(pos.symbol);
      const data   = await fetchCryptoPrices([coinId]);
      if (data[coinId]) returnedNTD = data[coinId].usd * fxRate.twdPerUsd * pos.quantity;
    } else if (pos.assetType === 'Futures') {
      // For simplicity, return margin (no P&L simulation for futures close)
      returnedNTD = pos.entryCostNTD;
    }
  } catch (e) {
    // Use entry cost as fallback
  }

  account.cashNTD += returnedNTD;
  account.positions = account.positions.filter(function(p) { return p.id !== id; });
  saveSimAccount(account);

  const pnl = returnedNTD - pos.entryCostNTD;
  addSimTrade({ symbol: pos.symbol, assetType: pos.assetType, direction: 'sell', quantity: pos.quantity, priceNTD: returnedNTD / Math.max(pos.quantity, 0.000001), fee: 0, totalNTD: returnedNTD });
  showToast('Closed ' + pos.symbol + '. P&L: ' + fmtTWD(pnl), pnl >= 0 ? 'success' : 'warning');
  renderSimulatorTab();
}

/* ── Equity Curve Update ────────────────────────────────── */
function updateSimEquityCurve() {
  const hist = getSimHistory();
  if (hist.length === 0) {
    const account = getSimAccount();
    hist.push({ date: account.startDate || today(), value: account.totalDeposited || 100000 });
  }
  renderEquityCurve('sim-equity-canvas', hist, 'Simulator Equity', '#3fb950');
}

/* ── Helper ─────────────────────────────────────────────── */
function _calcOpenPositionValue(positions, fxRate) {
  let total = 0;
  (positions || []).forEach(function(p) {
    total += p.entryCostNTD || 0;
  });
  return total;
}

/* ── Reset Simulator ────────────────────────────────────── */
function resetSimulator() {
  if (!confirm('Reset the entire simulator? All trades and positions will be lost. This cannot be undone.')) return;
  resetSimAccount();
  showToast('Simulator reset to NT$100,000.', 'info');
  renderSimulatorTab();
}
