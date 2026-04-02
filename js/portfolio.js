// ============================================================
// portfolio.js – Portfolio tab (real holdings tracker)
// ============================================================
import { fmtTWD, fmtUSD, fmtNum, fmtPct, colorClass, today, formatDate, generateId, showToast } from './utils.js'
import { fetchMultipleQuotes } from './api.js'
import { getPortfolio, savePortfolio, getTransactions, addTransaction, getPortHistory, addPortSnapshot } from './storage.js'
import { renderEquityCurve, renderAllocationChart } from './charts.js'

/* ── Main Render ────────────────────────────────────────── */
export async function renderPortfolioTab() {
  const portfolio = getPortfolio()
  const holdings  = portfolio.holdings || []
  const fxRate    = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }

  renderTransactions()

  if (holdings.length === 0) {
    renderSummaryCards([], {}, fxRate)
    const tbody = document.getElementById('holdings-tbody')
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No positions. Click "Add Position" to start tracking.</td></tr>'
    renderEquityCurve('port-equity-canvas', getPortHistory(), 'Portfolio Value', '#4f9eed')
    renderAllocationChart('port-alloc-canvas', [])
    return
  }

  const symbols = holdings.map(h => h.symbol)
  const prices  = {}
  symbols.forEach(s => { prices[s] = null })
  renderSummaryCards(holdings, prices, fxRate)

  try {
    const quotes = await fetchMultipleQuotes(symbols)
    Object.assign(prices, quotes)
    if (window.APP) window.APP.prices = Object.assign(window.APP.prices || {}, prices)
  } catch (e) {
    showToast('Price fetch failed: ' + e.message, 'error')
  }

  renderSummaryCards(holdings, prices, fxRate)
  renderHoldingsTable(holdings, prices, fxRate)
  renderEquityCurve('port-equity-canvas', getPortHistory(), 'Portfolio Value', '#4f9eed')

  const segments = []
  let totalNTD = 0
  holdings.forEach(h => {
    const q   = prices[h.symbol]
    const pnl = calcHoldingPNL(h, q ? q.price : null, fxRate)
    if (pnl.value > 0) { segments.push({ label: h.symbol, value: pnl.value }); totalNTD += pnl.value }
  })
  if (portfolio.cashNTD > 0) segments.push({ label: 'Cash (NT$)', value: portfolio.cashNTD })
  if (portfolio.cashUSD > 0) segments.push({ label: 'Cash (USD)', value: portfolio.cashUSD * fxRate.twdPerUsd })

  renderAllocationChart('port-alloc-canvas', segments)

  const cashNTD = (portfolio.cashNTD || 0) + (portfolio.cashUSD || 0) * fxRate.twdPerUsd
  addPortSnapshot(totalNTD + cashNTD)
}

/* ── Summary Cards ──────────────────────────────────────── */
function renderSummaryCards(holdings, prices, fxRate) {
  let totalCost = 0, totalValue = 0
  holdings.forEach(h => {
    const q = prices[h.symbol]
    const pnl = calcHoldingPNL(h, q ? q.price : null, fxRate)
    totalCost  += pnl.cost
    totalValue += pnl.value
  })

  const portfolio = getPortfolio()
  const cashNTD   = (portfolio.cashNTD || 0) + (portfolio.cashUSD || 0) * fxRate.twdPerUsd
  const totalPnl  = totalValue - totalCost
  const totalPct  = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const netWorth  = totalValue + cashNTD

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  const cls = (id, n)   => { const el = document.getElementById(id); if (el) el.className = 'card-value ' + colorClass(n) }

  set('port-networth', fmtTWD(netWorth))
  set('port-invested', fmtTWD(totalCost))
  set('port-pnl',      fmtTWD(totalPnl));    cls('port-pnl', totalPnl)
  set('port-pnlpct',   fmtPct(totalPct));    cls('port-pnlpct', totalPct)
  set('port-positions', holdings.length)
}

/* ── Holdings Table ─────────────────────────────────────── */
function renderHoldingsTable(holdings, prices, fxRate) {
  const tbody = document.getElementById('holdings-tbody')
  if (!tbody) return

  if (holdings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No positions yet.</td></tr>'
    return
  }

  tbody.innerHTML = holdings.map(h => {
    const q   = prices[h.symbol]
    const pnl = calcHoldingPNL(h, q ? q.price : null, fxRate)
    const priceStr = q ? (h.currency === 'TWD' ? fmtTWD(q.price) : fmtUSD(q.price)) : '--'
    const chgClass = q ? colorClass(q.changePct) : ''
    const chgStr   = q ? fmtPct(q.changePct) : '--'

    return `<tr>
      <td><strong>${h.symbol}</strong><br><span class="sub">${h.name || ''}</span></td>
      <td>${h.assetType}</td>
      <td>${fmtNum(h.shares, h.assetType === 'Crypto' ? 6 : 0)}</td>
      <td>${priceStr}</td>
      <td class="${chgClass}">${chgStr}</td>
      <td>${fmtTWD(pnl.value)}</td>
      <td class="${colorClass(pnl.pnl)}">${fmtTWD(pnl.pnl)}<br><span class="sub ${colorClass(pnl.pnlPct)}">${fmtPct(pnl.pnlPct)}</span></td>
      <td><button class="btn btn-sm btn-danger" onclick="window.deletePosition('${h.id}')">Remove</button></td>
    </tr>`
  }).join('')
}

/* ── Transactions Table ─────────────────────────────────── */
function renderTransactions() {
  const tbody = document.getElementById('transactions-tbody')
  if (!tbody) return
  const txns = getTransactions()

  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No transactions yet.</td></tr>'
    return
  }

  tbody.innerHTML = txns.slice(0, 50).map(tx => {
    const dirClass = tx.direction === 'buy' ? 'gain' : 'loss'
    return `<tr>
      <td>${formatDate(tx.date)}</td>
      <td><strong>${tx.symbol}</strong></td>
      <td class="${dirClass}">${tx.direction.toUpperCase()}</td>
      <td>${fmtNum(tx.shares, tx.assetType === 'Crypto' ? 6 : 2)}</td>
      <td>${fmtTWD(tx.priceNTD || 0)}</td>
      <td>${fmtTWD(tx.totalNTD || 0)}</td>
    </tr>`
  }).join('')
}

/* ── Add Position Modal ─────────────────────────────────── */
export function openAddPositionModal() {
  const modal = document.getElementById('add-position-modal')
  if (modal) modal.style.display = 'flex'
}

export function closeModal() {
  const modal = document.getElementById('add-position-modal')
  if (modal) modal.style.display = 'none'
}

export async function saveNewPosition() {
  const symbol    = (document.getElementById('pos-symbol')   || {}).value?.trim().toUpperCase()
  const name      = (document.getElementById('pos-name')     || {}).value?.trim()
  const assetType = (document.getElementById('pos-type')     || {}).value
  const shares    = parseFloat((document.getElementById('pos-shares')  || {}).value)
  const costPer   = parseFloat((document.getElementById('pos-cost')    || {}).value)
  const currency  = (document.getElementById('pos-currency') || {}).value || 'TWD'
  const dateVal   = (document.getElementById('pos-date')     || {}).value || today()

  if (!symbol || isNaN(shares) || isNaN(costPer)) {
    showToast('Please fill in all required fields.', 'warning'); return
  }

  const portfolio = getPortfolio()
  portfolio.holdings = portfolio.holdings || []
  portfolio.holdings.push({ id: generateId(), symbol, name: name || symbol, assetType, shares, costPer, currency, purchaseDate: dateVal })
  savePortfolio(portfolio)

  const fxRate  = window.APP ? window.APP.fxRate : { twdPerUsd: 31.5 }
  const priceNTD = currency === 'USD' ? costPer * fxRate.twdPerUsd : costPer
  addTransaction({ symbol, assetType, direction: 'buy', shares, priceNTD, totalNTD: priceNTD * shares, note: 'Manual entry' })

  closeModal()
  showToast(symbol + ' added to portfolio.', 'success')
  renderPortfolioTab()
}

export function deletePosition(id) {
  const portfolio = getPortfolio()
  portfolio.holdings = (portfolio.holdings || []).filter(h => h.id !== id)
  savePortfolio(portfolio)
  showToast('Position removed.', 'info')
  renderPortfolioTab()
}

/* ── P&L Calculator ─────────────────────────────────────── */
export function calcHoldingPNL(holding, currentPrice, fxRate) {
  const fx    = fxRate ? fxRate.twdPerUsd : 31.5
  const toNTD = price => holding.currency === 'USD' ? price * fx : price

  const costPerNTD = toNTD(holding.costPer)
  const cost       = costPerNTD * holding.shares

  if (currentPrice == null) return { value: cost, cost, pnl: 0, pnlPct: 0 }

  const value  = toNTD(currentPrice) * holding.shares
  const pnl    = value - cost
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
  return { value, cost, pnl, pnlPct }
}

/* ── Expose functions used in inline onclick attrs ───────── */
window.deletePosition       = deletePosition
window.openAddPositionModal = openAddPositionModal
window.saveNewPosition      = saveNewPosition
window.closeModal           = closeModal
