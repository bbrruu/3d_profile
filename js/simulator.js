// ============================================================
// simulator.js – Paper trading simulator
// ============================================================
import { fmtTWD, fmtUSD, fmtNum, fmtPct, colorClass, today, formatDate, generateId, showToast,
         blackScholesPrice, optionGreeks, calcTWFee, calcUSFee, calcCryptoFee,
         calcTWFuturesFee, calcUSFuturesFee, calcOptionsFee } from './utils.js'
import { fetchQuote, fetchMultipleQuotes, fetchCryptoPrices, getCoinId } from './api.js'
import { getSimAccount, saveSimAccount, resetSimAccount, getSimTrades, addSimTrade,
         getSimHistory, addSimSnapshot } from './storage.js'
import { renderEquityCurve } from './charts.js'

/* ── Main Render ────────────────────────────────────────── */
export async function renderSimulatorTab() {
  checkMonthlyIncome()
  renderSimSummary()
  renderSimLog()

  const account   = getSimAccount()
  const positions = account.positions || []

  if (positions.length === 0) {
    const tbody = document.getElementById('sim-holdings-tbody')
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No open positions.</td></tr>'
    updateSimEquityCurve()
    return
  }

  const stockSymbols = positions.filter(p => p.assetType === 'Stock' || p.assetType === 'ETF').map(p => p.symbol)
  const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const prices = {}

  if (stockSymbols.length > 0) {
    try { Object.assign(prices, await fetchMultipleQuotes(stockSymbols)) } catch (e) { /* ignore */ }
  }

  const cryptoPositions = positions.filter(p => p.assetType === 'Crypto')
  if (cryptoPositions.length > 0) {
    try {
      const coinIds  = cryptoPositions.map(p => getCoinId(p.symbol))
      const cryptoData = await fetchCryptoPrices(coinIds)
      cryptoPositions.forEach(p => {
        const id = getCoinId(p.symbol)
        if (cryptoData[id]) prices[p.symbol] = { price: cryptoData[id].usd, changePct: cryptoData[id].usd_24h_change || 0 }
      })
    } catch (e) { /* ignore */ }
  }

  renderSimHoldings(prices, fxRate)
  renderSimSummary(prices, fxRate)
  updateSimEquityCurve()
}

/* ── Monthly Income ─────────────────────────────────────── */
function checkMonthlyIncome() {
  const account = getSimAccount()
  const now  = new Date()
  const last = new Date(account.lastIncomeDate)
  const monthsElapsed = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth())

  if (monthsElapsed >= 1) {
    const income = 25000 * monthsElapsed
    account.cashNTD         += income
    account.totalDeposited   = (account.totalDeposited || 100000) + income
    account.lastIncomeDate   = now.toISOString().split('T')[0]
    saveSimAccount(account)
    _showIncomeBanner(income, monthsElapsed)
    showToast('Monthly income received: ' + fmtTWD(income), 'success')
  }
}

export function simulateNextMonth() {
  const account = getSimAccount()
  const last = new Date(account.lastIncomeDate)
  last.setMonth(last.getMonth() + 1)
  account.lastIncomeDate = last.toISOString().split('T')[0]
  saveSimAccount(account)
  showToast('Simulated +1 month. Checking income...', 'info')
  checkMonthlyIncome()
  renderSimulatorTab()
}

function _showIncomeBanner(income, months) {
  const banner = document.getElementById('income-banner')
  if (!banner) return
  const msg = document.getElementById('income-banner-msg')
  if (msg) msg.textContent = 'Monthly income received: ' + fmtTWD(income) + ' (' + months + ' month' + (months > 1 ? 's' : '') + ')'
  banner.style.display = 'flex'
  setTimeout(() => { banner.style.display = 'none' }, 6000)
}

/* ── Summary Cards ──────────────────────────────────────── */
function renderSimSummary(prices, fxRate) {
  if (!fxRate) fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const account   = getSimAccount()
  const positions = account.positions || []

  let openValue = 0
  positions.forEach(p => {
    const q = prices && prices[p.symbol]
    if (q && q.price) {
      openValue += (p.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price) * p.quantity
    } else {
      openValue += p.entryCostNTD || 0
    }
  })

  const totalEquity = account.cashNTD + openValue
  const totalDep    = account.totalDeposited || 100000
  const pnl         = totalEquity - totalDep
  const pnlPct      = totalDep > 0 ? (pnl / totalDep) * 100 : 0

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v }
  const cls = (id, n) => { const el = document.getElementById(id); if (el) el.className = 'card-value ' + colorClass(n) }

  set('sim-equity',    fmtTWD(totalEquity))
  set('sim-cash',      fmtTWD(account.cashNTD))
  set('sim-pnl',       fmtTWD(pnl));    cls('sim-pnl', pnl)
  set('sim-pnlpct',    fmtPct(pnlPct)); cls('sim-pnlpct', pnlPct)
  set('sim-positions', positions.length)
  set('sim-deposited', fmtTWD(totalDep))
}

/* ── Holdings Table ─────────────────────────────────────── */
function renderSimHoldings(prices, fxRate) {
  const tbody = document.getElementById('sim-holdings-tbody')
  if (!tbody) return
  const account   = getSimAccount()
  const positions = account.positions || []

  if (positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No open positions.</td></tr>'
    return
  }

  tbody.innerHTML = positions.map(p => {
    const q = prices && prices[p.symbol]
    let currPriceNTD = null
    if (q && q.price) currPriceNTD = p.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price

    const entryCostNTD = p.entryCostNTD || 0
    const currentVal   = currPriceNTD != null ? currPriceNTD * p.quantity : entryCostNTD
    const pnl          = currentVal - entryCostNTD
    const pnlPct       = entryCostNTD > 0 ? (pnl / entryCostNTD) * 100 : 0
    const qtyStr       = p.assetType === 'Crypto' ? fmtNum(p.quantity, 6) : fmtNum(p.quantity, 0)

    return `<tr>
      <td><strong>${p.symbol}</strong><br><span class="sub">${p.assetType}</span></td>
      <td>${qtyStr}</td>
      <td>${fmtTWD(entryCostNTD / Math.max(p.quantity, 0.000001))}</td>
      <td>${currPriceNTD != null ? fmtTWD(currPriceNTD) : '--'}</td>
      <td>${fmtTWD(currentVal)}</td>
      <td class="${colorClass(pnl)}">${fmtTWD(pnl)}<br><span class="sub">${fmtPct(pnlPct)}</span></td>
      <td><button class="btn btn-sm btn-danger" onclick="window.closeSimPosition('${p.id}')">Close</button></td>
    </tr>`
  }).join('')
}

/* ── Sim Trade Log ──────────────────────────────────────── */
function renderSimLog() {
  const tbody = document.getElementById('sim-log-tbody')
  if (!tbody) return
  const trades = getSimTrades()

  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No trades yet.</td></tr>'
    return
  }

  tbody.innerHTML = trades.slice(0, 50).map(t => {
    const dirClass = t.direction === 'buy' ? 'gain' : 'loss'
    return `<tr>
      <td>${formatDate(t.date)}</td>
      <td><strong>${t.symbol}</strong></td>
      <td>${t.assetType}</td>
      <td class="${dirClass}">${t.direction.toUpperCase()}</td>
      <td>${fmtNum(t.quantity, t.assetType === 'Crypto' ? 6 : 2)}</td>
      <td>${fmtTWD(t.priceNTD)}</td>
      <td>${fmtTWD(t.totalNTD)}</td>
    </tr>`
  }).join('')
}

/* ── Asset Type Panel Switcher ──────────────────────────── */
export function handleAssetTypeSwitch(type) {
  document.querySelectorAll('.asset-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type))
  document.querySelectorAll('.trade-panel').forEach(p => { p.style.display = p.dataset.panel === type ? 'block' : 'none' })
}

/* ── Stock/ETF Trade ────────────────────────────────────── */
export async function fetchStockPriceForTrade() {
  const symbol  = document.getElementById('sim-stock-symbol')?.value.trim().toUpperCase()
  if (!symbol) return
  const priceEl = document.getElementById('sim-stock-price-display')
  if (priceEl) priceEl.textContent = 'Loading...'
  try {
    const quote = await fetchQuote(symbol)
    if (priceEl) priceEl.textContent = quote.currency === 'TWD' ? fmtTWD(quote.price) : fmtUSD(quote.price)
    const priceInput = document.getElementById('sim-stock-price')
    if (priceInput) { priceInput.value = quote.price; priceInput.dataset.currency = quote.currency }
    calculateStockFeePreview()
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error'
    showToast('Cannot fetch price for ' + symbol, 'error')
  }
}

export function calculateStockFeePreview() {
  const symbol   = document.getElementById('sim-stock-symbol')?.value.trim().toUpperCase() || ''
  const qty      = parseFloat(document.getElementById('sim-stock-qty')?.value) || 0
  const price    = parseFloat(document.getElementById('sim-stock-price')?.value) || 0
  const dir      = document.getElementById('sim-stock-dir')?.value || 'buy'
  const currency = document.getElementById('sim-stock-price')?.dataset.currency || 'TWD'
  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const feeEl    = document.getElementById('sim-stock-fee-preview')
  if (!feeEl) return
  if (!qty || !price) { feeEl.textContent = 'Fee: --'; return }
  const isTW  = symbol.endsWith('.TW') || symbol.endsWith('.TWO') || currency === 'TWD'
  const value = isTW ? price * qty : price * qty * fxRate.twdPerUsd
  const fee   = isTW ? calcTWFee(value, dir) : calcUSFee()
  const total = value + (dir === 'buy' ? fee : -fee)
  feeEl.innerHTML = `Value: ${fmtTWD(value)} &nbsp;|&nbsp; Fee: ${fmtTWD(fee)} &nbsp;|&nbsp; <strong>Total: ${fmtTWD(total)}</strong>`
}

export async function executeStockTrade() {
  const symbol     = document.getElementById('sim-stock-symbol')?.value.trim().toUpperCase()
  const qty        = parseFloat(document.getElementById('sim-stock-qty')?.value)
  const priceInput = document.getElementById('sim-stock-price')
  const price      = parseFloat(priceInput?.value)
  const dir        = document.getElementById('sim-stock-dir')?.value || 'buy'
  const currency   = priceInput?.dataset.currency || 'TWD'

  if (!symbol || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
    showToast('Please fill in symbol, quantity, and price.', 'warning'); return
  }

  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const isTW     = symbol.endsWith('.TW') || symbol.endsWith('.TWO') || currency === 'TWD'
  const priceNTD = isTW ? price : price * fxRate.twdPerUsd
  const value    = priceNTD * qty
  const fee      = isTW ? calcTWFee(value, dir) : calcUSFee()
  const totalCost = dir === 'buy' ? value + fee : value - fee

  const account = getSimAccount()

  if (dir === 'buy') {
    if (account.cashNTD < totalCost) {
      showToast('Insufficient cash. Need ' + fmtTWD(totalCost) + ', have ' + fmtTWD(account.cashNTD), 'error'); return
    }
    account.cashNTD -= totalCost
    account.positions = account.positions || []
    const existing = account.positions.find(p => p.symbol === symbol && p.assetType === 'Stock')
    if (existing) {
      existing.entryCostNTD += priceNTD * qty
      existing.quantity     += qty
    } else {
      account.positions.push({ id: generateId(), symbol, assetType: 'Stock', quantity: qty, currency, entryPrice: price, entryPriceNTD: priceNTD, entryCostNTD: priceNTD * qty, openDate: today() })
    }
  } else {
    const pos = (account.positions || []).find(p => p.symbol === symbol)
    if (!pos || pos.quantity < qty) { showToast('Insufficient position to sell.', 'error'); return }
    account.cashNTD += totalCost
    pos.entryCostNTD -= (pos.entryCostNTD / (pos.quantity)) * qty
    pos.quantity     -= qty
    if (pos.quantity <= 0) account.positions = account.positions.filter(p => p.id !== pos.id)
  }

  saveSimAccount(account)
  addSimTrade({ symbol, assetType: 'Stock', direction: dir, quantity: qty, priceNTD, fee, totalNTD: totalCost })
  addSimSnapshot(account.cashNTD + _calcOpenValue(account.positions, fxRate))
  showToast(`${dir.toUpperCase()} ${qty} ${symbol} @ ${fmtTWD(priceNTD)}`, 'success')
  renderSimulatorTab()
}

/* ── Crypto Trade ───────────────────────────────────────── */
export async function fetchCryptoPriceForTrade() {
  const symbol  = document.getElementById('sim-crypto-symbol')?.value.trim().toUpperCase()
  if (!symbol) return
  const priceEl = document.getElementById('sim-crypto-price-display')
  if (priceEl) priceEl.textContent = 'Loading...'
  try {
    const coinId = getCoinId(symbol)
    const data   = await fetchCryptoPrices([coinId])
    const entry  = data[coinId]
    if (!entry) throw new Error('Coin not found')
    const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
    if (priceEl) priceEl.textContent = fmtUSD(entry.usd) + ' (' + fmtTWD(entry.twd || entry.usd * fxRate.twdPerUsd) + ')'
    const priceInput = document.getElementById('sim-crypto-price')
    if (priceInput) priceInput.value = entry.usd
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error'
    showToast('Cannot fetch crypto price for ' + symbol, 'error')
  }
}

export async function executeCryptoTrade() {
  const symbol = document.getElementById('sim-crypto-symbol')?.value.trim().toUpperCase()
  const qty    = parseFloat(document.getElementById('sim-crypto-qty')?.value)
  const price  = parseFloat(document.getElementById('sim-crypto-price')?.value)
  const dir    = document.getElementById('sim-crypto-dir')?.value || 'buy'

  if (!symbol || isNaN(qty) || qty <= 0) { showToast('Please enter symbol and quantity.', 'warning'); return }

  let priceUSD = price
  if (!priceUSD || isNaN(priceUSD)) {
    try {
      const data = await fetchCryptoPrices([getCoinId(symbol)])
      priceUSD = data[getCoinId(symbol)]?.usd
    } catch (e) {}
  }
  if (!priceUSD) { showToast('Cannot determine price.', 'error'); return }

  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const priceNTD = priceUSD * fxRate.twdPerUsd
  const value    = priceNTD * qty
  const fee      = calcCryptoFee(value)
  const totalCost = dir === 'buy' ? value + fee : value - fee

  const account = getSimAccount()

  if (dir === 'buy') {
    if (account.cashNTD < totalCost) { showToast('Insufficient cash.', 'error'); return }
    account.cashNTD -= totalCost
    account.positions = account.positions || []
    const existing = account.positions.find(p => p.symbol === symbol && p.assetType === 'Crypto')
    if (existing) { existing.entryCostNTD += priceNTD * qty; existing.quantity += qty }
    else account.positions.push({ id: generateId(), symbol, assetType: 'Crypto', quantity: qty, currency: 'USD', entryPrice: priceUSD, entryCostNTD: priceNTD * qty, openDate: today() })
  } else {
    const pos = (account.positions || []).find(p => p.symbol === symbol && p.assetType === 'Crypto')
    if (!pos || pos.quantity < qty) { showToast('Insufficient position.', 'error'); return }
    account.cashNTD += totalCost
    pos.quantity    -= qty
    if (pos.quantity <= 0.0000001) account.positions = account.positions.filter(p => p.id !== pos.id)
  }

  saveSimAccount(account)
  addSimTrade({ symbol, assetType: 'Crypto', direction: dir, quantity: qty, priceNTD, fee, totalNTD: totalCost })
  showToast(`${dir.toUpperCase()} ${fmtNum(qty, 6)} ${symbol} @ ${fmtUSD(priceUSD)}`, 'success')
  renderSimulatorTab()
}

/* ── Options Trade ──────────────────────────────────────── */
export function calculateOptionPrice() {
  const S       = parseFloat(document.getElementById('opt-spot')?.value)    || 0
  const K       = parseFloat(document.getElementById('opt-strike')?.value)  || 0
  const T       = parseFloat(document.getElementById('opt-expiry')?.value)  || 0
  const r       = parseFloat(document.getElementById('opt-rate')?.value)    || 0.045
  const sigma   = parseFloat(document.getElementById('opt-iv')?.value)      || 0.20
  const type    = document.getElementById('opt-type')?.value   || 'call'
  const market  = document.getElementById('opt-market')?.value || 'US'

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v }

  if (!S || !K || !T) { ['opt-price-display','greek-delta','greek-gamma','greek-theta','greek-vega','opt-total-display'].forEach(id => set(id, '--')); return }

  const Ty    = T / 365
  const price = blackScholesPrice(S, K, Ty, r, sigma, type)
  const g     = optionGreeks(S, K, Ty, r, sigma, type)

  set('opt-price-display', market === 'TW' ? fmtTWD(price) : fmtUSD(price))
  set('greek-delta', fmtNum(g.delta, 4))
  set('greek-gamma', fmtNum(g.gamma, 4))
  set('greek-theta', fmtNum(g.theta, 4))
  set('greek-vega',  fmtNum(g.vega,  4))

  const contracts = parseInt(document.getElementById('opt-contracts')?.value) || 1
  const size      = market === 'TW' ? 50 : 100
  const fxRate    = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const priceNTD  = market === 'TW' ? price : price * fxRate.twdPerUsd
  const fee       = calcOptionsFee(contracts, market, fxRate.twdPerUsd)
  set('opt-total-display', fmtTWD(priceNTD * size * contracts + fee))
}

export function executeOptionTrade() {
  const S         = parseFloat(document.getElementById('opt-spot')?.value)      || 0
  const K         = parseFloat(document.getElementById('opt-strike')?.value)    || 0
  const T         = parseFloat(document.getElementById('opt-expiry')?.value)    || 0
  const r         = parseFloat(document.getElementById('opt-rate')?.value)      || 0.045
  const sigma     = parseFloat(document.getElementById('opt-iv')?.value)        || 0.20
  const type      = document.getElementById('opt-type')?.value      || 'call'
  const market    = document.getElementById('opt-market')?.value    || 'US'
  const contracts = parseInt(document.getElementById('opt-contracts')?.value)   || 1

  if (!S || !K || !T) { showToast('Fill in all option parameters.', 'warning'); return }

  const Ty       = T / 365
  const optPrice = blackScholesPrice(S, K, Ty, r, sigma, type)
  const size     = market === 'TW' ? 50 : 100
  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const priceNTD = market === 'TW' ? optPrice : optPrice * fxRate.twdPerUsd
  const premium  = priceNTD * size * contracts
  const fee      = calcOptionsFee(contracts, market, fxRate.twdPerUsd)
  const totalCost = premium + fee

  const account = getSimAccount()
  if (account.cashNTD < totalCost) { showToast('Insufficient cash for premium + fee: ' + fmtTWD(totalCost), 'error'); return }

  account.cashNTD -= totalCost
  account.positions = account.positions || []
  account.positions.push({
    id: generateId(),
    symbol: `${market === 'TW' ? 'TX' : 'SPX'} ${K}${type.toUpperCase()} ${T}d`,
    assetType: 'Options', quantity: contracts, currency: market === 'TW' ? 'TWD' : 'USD',
    entryPrice: optPrice, entryCostNTD: premium, openDate: today(),
    meta: { S, K, T, r, sigma, type, market, size }
  })

  saveSimAccount(account)
  addSimTrade({ symbol: `${K}${type.toUpperCase()}`, assetType: 'Options', direction: 'buy', quantity: contracts, priceNTD, fee, totalNTD: totalCost })
  showToast('Options trade executed: ' + fmtTWD(totalCost), 'success')
  renderSimulatorTab()
}

/* ── Futures Trade ──────────────────────────────────────── */
export async function fetchFuturesPrice() {
  const symbol  = document.getElementById('fut-symbol')?.value.trim().toUpperCase()
  if (!symbol) return
  const priceEl  = document.getElementById('fut-price-display')
  const marginEl = document.getElementById('fut-margin-display')
  if (priceEl) priceEl.textContent = 'Loading...'

  const futMap = { TX: 'TXF=F', ES: 'ES=F', NQ: 'NQ=F', CL: 'CL=F', GC: 'GC=F' }
  try {
    const quote    = await fetchQuote(futMap[symbol] || symbol + '=F')
    const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
    const isTW     = symbol === 'TX'
    const priceNTD = isTW ? quote.price : quote.price * fxRate.twdPerUsd
    const mults    = { TX: 200, ES: 50, NQ: 20, CL: 1000, GC: 100 }
    const mult     = mults[symbol] || 50
    const margin   = priceNTD * mult * 0.10

    if (priceEl)  priceEl.textContent  = isTW ? fmtTWD(quote.price) : fmtUSD(quote.price)
    if (marginEl) marginEl.textContent = `Contract Value: ${fmtTWD(priceNTD * mult)} | Margin (10%): ${fmtTWD(margin)}`

    const priceInput = document.getElementById('fut-price')
    if (priceInput) { priceInput.value = quote.price; priceInput.dataset.currency = isTW ? 'TWD' : 'USD' }
  } catch (e) {
    if (priceEl) priceEl.textContent = 'Error'
    showToast('Cannot fetch futures price', 'error')
  }
}

export function executeFuturesTrade() {
  const symbol    = document.getElementById('fut-symbol')?.value.trim().toUpperCase()
  const contracts = parseInt(document.getElementById('fut-contracts')?.value) || 1
  const priceInput = document.getElementById('fut-price')
  const price     = parseFloat(priceInput?.value)
  const dir       = document.getElementById('fut-dir')?.value || 'long'

  if (!symbol || isNaN(price) || price <= 0) { showToast('Please fetch price first.', 'warning'); return }

  const fxRate   = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const isTW     = symbol === 'TX'
  const priceNTD = isTW ? price : price * fxRate.twdPerUsd
  const mults    = { TX: 200, ES: 50, NQ: 20, CL: 1000, GC: 100 }
  const mult     = mults[symbol] || 50
  const margin   = priceNTD * mult * contracts * 0.10
  const fee      = isTW ? calcTWFuturesFee(contracts) : calcUSFuturesFee(contracts, fxRate.twdPerUsd)

  const account = getSimAccount()
  if (account.cashNTD < margin + fee) { showToast('Insufficient margin. Need ' + fmtTWD(margin + fee), 'error'); return }

  account.cashNTD -= margin + fee
  account.positions = account.positions || []
  account.positions.push({
    id: generateId(),
    symbol: `${symbol} ${dir.toUpperCase()} x${contracts}`,
    assetType: 'Futures', quantity: contracts, currency: isTW ? 'TWD' : 'USD',
    entryPrice: price, entryCostNTD: margin, openDate: today(),
    meta: { symbol, contracts, multiplier: mult, margin, dir }
  })

  saveSimAccount(account)
  addSimTrade({ symbol, assetType: 'Futures', direction: dir, quantity: contracts, priceNTD, fee, totalNTD: margin + fee })
  showToast(`${dir.toUpperCase()} ${contracts} ${symbol} futures. Margin: ${fmtTWD(margin)}`, 'success')
  renderSimulatorTab()
}

/* ── Close Position ─────────────────────────────────────── */
export async function closeSimPosition(id) {
  const account = getSimAccount()
  const pos = (account.positions || []).find(p => p.id === id)
  if (!pos) return

  const fxRate = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  let returnedNTD = pos.entryCostNTD

  try {
    if (pos.assetType === 'Stock' || pos.assetType === 'ETF') {
      const q = await fetchQuote(pos.symbol.split(' ')[0])
      returnedNTD = (pos.currency === 'USD' ? q.price * fxRate.twdPerUsd : q.price) * pos.quantity
    } else if (pos.assetType === 'Crypto') {
      const data = await fetchCryptoPrices([getCoinId(pos.symbol)])
      const entry = data[getCoinId(pos.symbol)]
      if (entry) returnedNTD = entry.usd * fxRate.twdPerUsd * pos.quantity
    }
  } catch (e) { /* fallback to cost */ }

  account.cashNTD += returnedNTD
  account.positions = account.positions.filter(p => p.id !== id)
  saveSimAccount(account)

  const pnl = returnedNTD - pos.entryCostNTD
  addSimTrade({ symbol: pos.symbol, assetType: pos.assetType, direction: 'sell', quantity: pos.quantity, priceNTD: returnedNTD / Math.max(pos.quantity, 0.000001), fee: 0, totalNTD: returnedNTD })
  showToast('Closed ' + pos.symbol + '. P&L: ' + fmtTWD(pnl), pnl >= 0 ? 'success' : 'warning')
  renderSimulatorTab()
}

export function resetSimulator() {
  if (!confirm('Reset the entire simulator? All trades and positions will be lost.')) return
  resetSimAccount()
  showToast('Simulator reset to NT$100,000.', 'info')
  renderSimulatorTab()
}

/* ── Equity Curve ───────────────────────────────────────── */
function updateSimEquityCurve() {
  const hist = getSimHistory()
  if (hist.length === 0) {
    const account = getSimAccount()
    hist.push({ date: account.startDate || today(), value: account.totalDeposited || 100000 })
  }
  renderEquityCurve('sim-equity-canvas', hist, 'Simulator Equity', '#3fb950')
}

function _calcOpenValue(positions, fxRate) {
  return (positions || []).reduce((sum, p) => sum + (p.entryCostNTD || 0), 0)
}

/* ── Expose functions used in inline onclick attrs ───────── */
window.closeSimPosition      = closeSimPosition
window.resetSimulator        = resetSimulator
window.handleAssetTypeSwitch = handleAssetTypeSwitch
window.fetchStockPriceForTrade   = fetchStockPriceForTrade
window.calculateStockFeePreview  = calculateStockFeePreview
window.executeStockTrade         = executeStockTrade
window.fetchCryptoPriceForTrade  = fetchCryptoPriceForTrade
window.executeCryptoTrade        = executeCryptoTrade
window.calculateOptionPrice      = calculateOptionPrice
window.executeOptionTrade        = executeOptionTrade
window.fetchFuturesPrice         = fetchFuturesPrice
window.executeFuturesTrade       = executeFuturesTrade
window.simulateNextMonth         = simulateNextMonth
