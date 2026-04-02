// ============================================================
// market.js – Market overview tab  (with history charts)
// ============================================================
import { fmtTWD, fmtUSD, fmtNum, fmtPct, colorClass, showToast, getMarketStatus } from './utils.js'
import { fetchQuote, fetchMultipleQuotes, fetchHistory, MARKET_INDICES } from './api.js'
import { renderPriceChart } from './charts.js'

// Module state
let _detailSymbol    = null
let _detailName      = ''
let _detailTf        = { range: '1d', interval: '5m', label: '1D' }
let _simChartSymbol  = null
let _simChartTf      = { range: '1d', interval: '5m', label: '1D' }

const TF_OPTIONS = [
  { label: '1D', range: '1d',  interval: '5m'  },
  { label: '1W', range: '5d',  interval: '1d'  },
  { label: '3M', range: '3mo', interval: '1d'  },
  { label: '1Y', range: '1y',  interval: '1wk' }
]

/* ── Main Render ────────────────────────────────────────── */
export function renderMarketTab() {
  renderMarketStatus()
  renderMarketIndices()
  renderFXRates()
  setupSearch()
  setupRefTagClicks()
}

/* ── Market Status Badges ────────────────────────────────── */
function renderMarketStatus() {
  const el = document.getElementById('market-status-badges')
  if (!el) return
  const s = getMarketStatus()
  el.innerHTML = `
    <span class="status-badge ${s.tw ? 'open' : 'closed'}">🇹🇼 TW ${s.tw ? 'OPEN' : 'CLOSED'}</span>
    <span class="status-badge ${s.us ? 'open' : 'closed'}">🇺🇸 US ${s.us ? 'OPEN' : 'CLOSED'}</span>
    <span class="status-badge always-open">₿ Crypto 24/7</span>
  `
}

/* ── Market Indices Grid ─────────────────────────────────── */
export async function renderMarketIndices() {
  const grid = document.getElementById('market-indices-grid')
  if (!grid) return

  // Skeleton cards while loading
  grid.innerHTML = MARKET_INDICES.map(idx => {
    const safeId = cardId(idx.symbol)
    return `<div class="index-card" id="${safeId}" data-symbol="${idx.symbol}" data-name="${idx.label}">
      <div class="index-card-top">
        <span class="index-flag">${idx.flag}</span>
        <span class="index-label">${idx.label}</span>
      </div>
      <div class="index-price">—</div>
      <div class="index-change">Loading…</div>
      <div class="index-tf-row" id="tfrow-${safeId}">
        <span class="tf-delta">1W —</span>
        <span class="tf-delta">3M —</span>
        <span class="tf-delta">1Y —</span>
      </div>
    </div>`
  }).join('')

  // Wire click → detail panel
  grid.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
      const sym  = card.dataset.symbol
      const name = card.dataset.name
      openDetailPanel(sym, name)
    })
  })

  // Phase 1: fetch current quotes
  try {
    const quotes = await fetchMultipleQuotes(MARKET_INDICES.map(i => i.symbol))
    MARKET_INDICES.forEach(idx => {
      const q    = quotes[idx.symbol]
      const el   = document.getElementById(cardId(idx.symbol))
      if (!el) return
      if (!q)   { el.querySelector('.index-price').textContent = 'N/A'; return }
      const isCrypto = idx.symbol.includes('-USD')
      el.querySelector('.index-price').textContent   = isCrypto ? fmtUSD(q.price) : fmtNum(q.price, 2)
      el.querySelector('.index-change').textContent  = (q.changePct >= 0 ? '+' : '') + fmtNum(q.changePct, 2) + '%'
      el.querySelector('.index-change').className    = 'index-change ' + colorClass(q.changePct)
    })
  } catch (e) {
    showToast('Market data error: ' + e.message, 'error')
  }

  // Phase 2: load multi-timeframe % changes in background (sequential to spare proxy)
  loadMultiTfChanges()
}

async function loadMultiTfChanges() {
  for (const idx of MARKET_INDICES) {
    try {
      const history = await fetchHistory(idx.symbol, '1d', '1y')
      if (!history || history.length < 5) continue
      const last = history[history.length - 1].close
      const pct  = n => { const ref = history[Math.max(0, history.length - 1 - n)]?.close; return ref ? ((last - ref) / ref) * 100 : null }
      const changes = { '1W': pct(5), '3M': pct(63), '1Y': pct(252) }

      const tfRow = document.getElementById('tfrow-' + cardId(idx.symbol))
      if (tfRow) {
        tfRow.innerHTML = Object.entries(changes).map(([label, val]) => {
          if (val == null) return `<span class="tf-delta">—</span>`
          return `<span class="tf-delta ${colorClass(val)}">${label} ${val >= 0 ? '+' : ''}${fmtNum(val, 1)}%</span>`
        }).join('')
      }
    } catch (e) { /* skip on error */ }
  }
}

/* ── Detail Panel ────────────────────────────────────────── */
export async function openDetailPanel(symbol, name) {
  _detailSymbol = symbol
  _detailName   = name || symbol

  const section = document.getElementById('market-detail-section')
  if (section) section.style.display = 'block'

  document.getElementById('detail-symbol').textContent = symbol
  document.getElementById('detail-name').textContent   = name || ''

  // Market status badge for this specific symbol
  const idx = MARKET_INDICES.find(i => i.symbol === symbol)
  const statusEl = document.getElementById('detail-market-status')
  if (statusEl && idx) statusEl.innerHTML = _marketBadgeFor(idx.market)

  // Wire timeframe buttons
  document.querySelectorAll('#market-detail-section .tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#market-detail-section .tf-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const tf = TF_OPTIONS.find(t => t.label === btn.dataset.tf)
      if (tf) { _detailTf = tf; _loadDetailChart(symbol) }
    })
  })

  // Reset to 1D
  _detailTf = TF_OPTIONS[0]
  document.querySelectorAll('#market-detail-section .tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === '1D'))

  await _loadDetailChart(symbol)
  _loadDetailStats(symbol)  // async, non-blocking
}

async function _loadDetailChart(symbol) {
  const statsEl = document.getElementById('detail-stats')
  if (statsEl) statsEl.innerHTML = '<span class="loading-msg">Loading…</span>'
  try {
    const points = await fetchHistory(symbol, _detailTf.interval, _detailTf.range)
    renderPriceChart('detail-price-chart', points)
    _renderDetailPriceStats(symbol, points, statsEl)
  } catch (e) {
    if (statsEl) statsEl.innerHTML = '<span class="error-msg">Chart unavailable</span>'
  }
}

async function _loadDetailStats(symbol) {
  try {
    const history = await fetchHistory(symbol, '1d', '1y')
    if (!history || history.length < 5) return
    const last = history[history.length - 1].close
    const pct  = n => { const ref = history[Math.max(0, history.length - 1 - n)]?.close; return ref ? ((last - ref) / ref) * 100 : null }
    const hi52 = Math.max(...history.map(p => p.high ?? p.close))
    const lo52 = Math.min(...history.map(p => p.low  ?? p.close))

    const bar = document.getElementById('detail-tf-stats')
    if (!bar) return
    const stats = [
      { label: '1W', val: pct(5) }, { label: '1M', val: pct(21) },
      { label: '3M', val: pct(63) }, { label: '1Y', val: pct(252) }
    ]
    bar.innerHTML = stats.map(s => s.val == null ? '' :
      `<div class="tf-stat-item">
        <span class="tf-stat-label">${s.label}</span>
        <span class="tf-stat-val ${colorClass(s.val)}">${s.val >= 0 ? '+' : ''}${fmtNum(s.val, 2)}%</span>
      </div>`
    ).join('') +
    `<div class="tf-stat-item">
      <span class="tf-stat-label">52W High</span>
      <span class="tf-stat-val">${fmtNum(hi52, 2)}</span>
    </div>
    <div class="tf-stat-item">
      <span class="tf-stat-label">52W Low</span>
      <span class="tf-stat-val">${fmtNum(lo52, 2)}</span>
    </div>`
  } catch (e) { /* non-critical */ }
}

function _renderDetailPriceStats(symbol, points, el) {
  if (!el || !points || points.length === 0) return
  const last  = points[points.length - 1].close
  const first = points[0].close
  const chg   = last - first
  const chgPct = first ? (chg / first) * 100 : 0
  el.innerHTML = `
    <span class="detail-current-price">${fmtNum(last, 2)}</span>
    <span class="detail-chg ${colorClass(chgPct)}">${chg >= 0 ? '+' : ''}${fmtNum(chg, 2)} (${fmtPct(chgPct)})</span>
    <span class="detail-period-label">over selected period</span>
  `
}

function _marketBadgeFor(market) {
  const s = getMarketStatus()
  if (market === 'CRYPTO')  return `<span class="status-badge always-open">24/7</span>`
  if (market === 'FUTURES') return `<span class="status-badge always-open">Near 24/5</span>`
  if (market === 'TW')      return `<span class="status-badge ${s.tw ? 'open' : 'closed'}">${s.tw ? 'OPEN' : 'CLOSED'}</span>`
  if (market === 'US')      return `<span class="status-badge ${s.us ? 'open' : 'closed'}">${s.us ? 'OPEN' : 'CLOSED'}</span>`
  return ''
}

/* ── Simulator chart panel ───────────────────────────────── */
export async function loadSimChart(symbol, name) {
  _simChartSymbol = symbol
  const section = document.getElementById('sim-chart-section')
  if (section) section.style.display = 'block'

  document.getElementById('sim-chart-symbol').textContent = symbol
  document.getElementById('sim-chart-name').textContent   = name || ''

  // Wire timeframe buttons
  document.querySelectorAll('#sim-chart-section .tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sim-chart-section .tf-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const tf = TF_OPTIONS.find(t => t.label === btn.dataset.tf)
      if (tf) { _simChartTf = tf; _loadSimChartData(symbol) }
    })
  })

  _simChartTf = TF_OPTIONS[0]
  document.querySelectorAll('#sim-chart-section .tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === '1D'))

  await _loadSimChartData(symbol)
  _loadSimChartStats(symbol)
}

async function _loadSimChartData(symbol) {
  const statsEl = document.getElementById('sim-chart-stats')
  if (statsEl) statsEl.innerHTML = '<span class="loading-msg">Loading…</span>'
  try {
    const points = await fetchHistory(symbol, _simChartTf.interval, _simChartTf.range)
    renderPriceChart('sim-price-chart', points)
    _renderDetailPriceStats(symbol, points, statsEl)
  } catch (e) {
    if (statsEl) statsEl.innerHTML = '<span class="error-msg">Chart unavailable</span>'
  }
}

async function _loadSimChartStats(symbol) {
  try {
    const history = await fetchHistory(symbol, '1d', '1y')
    if (!history || history.length < 5) return
    const last = history[history.length - 1].close
    const pct  = n => { const ref = history[Math.max(0, history.length - 1 - n)]?.close; return ref ? ((last - ref) / ref) * 100 : null }
    const bar = document.getElementById('sim-chart-tf-stats')
    if (!bar) return
    const stats = [
      { label: '1W', val: pct(5) }, { label: '1M', val: pct(21) },
      { label: '3M', val: pct(63) }, { label: '1Y', val: pct(252) }
    ]
    bar.innerHTML = stats.map(s => s.val == null ? '' :
      `<div class="tf-stat-item">
        <span class="tf-stat-label">${s.label}</span>
        <span class="tf-stat-val ${colorClass(s.val)}">${s.val >= 0 ? '+' : ''}${fmtNum(s.val, 2)}%</span>
      </div>`).join('')
  } catch (e) { /* non-critical */ }
}

/* ── FX Rates ───────────────────────────────────────────── */
async function renderFXRates() {
  const container = document.getElementById('fx-rates-container')
  if (!container) return
  container.innerHTML = '<div class="loading-msg">Loading FX rates…</div>'

  const pairs = [
    { symbol: 'USDTWD=X', label: 'USD / TWD' },
    { symbol: 'EURUSD=X', label: 'EUR / USD' },
    { symbol: 'GBPUSD=X', label: 'GBP / USD' },
    { symbol: 'USDJPY=X', label: 'USD / JPY' },
    { symbol: 'AUDUSD=X', label: 'AUD / USD' },
    { symbol: 'USDCNH=X', label: 'USD / CNH' }
  ]

  try {
    const quotes = await fetchMultipleQuotes(pairs.map(p => p.symbol))
    container.innerHTML = pairs.map(pair => {
      const q      = quotes[pair.symbol]
      const price  = q ? fmtNum(q.price, 4) : '--'
      const chgPct = q ? q.changePct : 0
      return `<div class="fx-card">
        <div class="fx-pair">${pair.label}</div>
        <div class="fx-rate">${price}</div>
        <div class="fx-change ${colorClass(chgPct)}">${q ? fmtPct(chgPct) : '--'}</div>
      </div>`
    }).join('')
  } catch (e) {
    container.innerHTML = '<div class="error-msg">Failed to load FX rates.</div>'
  }
}

/* ── Symbol Search ──────────────────────────────────────── */
function setupSearch() {
  const btn   = document.getElementById('search-btn')
  const input = document.getElementById('search-input')
  if (btn)   btn.onclick   = () => { const s = input?.value.trim().toUpperCase(); if (s) searchSymbol(s) }
  if (input) input.onkeydown = e => { if (e.key === 'Enter') { const s = input.value.trim().toUpperCase(); if (s) searchSymbol(s) } }
}

async function searchSymbol(symbol) {
  const resultEl = document.getElementById('search-result')
  if (!resultEl) return
  resultEl.innerHTML = `<div class="loading-msg">Searching ${symbol}…</div>`
  try {
    const q = await fetchQuote(symbol)
    if (!q) throw new Error('No data returned')
    const isTW     = q.currency === 'TWD'
    const priceStr = isTW ? fmtTWD(q.price) : fmtUSD(q.price)
    const prevStr  = isTW ? fmtTWD(q.previousClose) : fmtUSD(q.previousClose)
    const sign     = q.changePct >= 0 ? '+' : ''

    resultEl.innerHTML = `
      <div class="search-result-card">
        <div class="search-result-header">
          <div>
            <div class="search-symbol">${q.symbol}</div>
            <div class="search-name">${q.name || ''}</div>
          </div>
          <div class="search-price-block">
            <div class="search-price">${priceStr}</div>
            <div class="search-change ${colorClass(q.changePct)}">${sign}${fmtNum(q.change, 2)} (${fmtPct(q.changePct)})</div>
          </div>
        </div>
        <div class="search-meta">
          <span>Prev Close: ${prevStr}</span>
          <span>Currency: ${q.currency || '--'}</span>
          <button class="btn btn-sm btn-secondary" onclick="window.openDetailPanel('${symbol}','${q.name||symbol}')">View Chart</button>
        </div>
      </div>`
  } catch (e) {
    resultEl.innerHTML = `<div class="error-msg">No data found for "${symbol}". Check the symbol and try again.</div>`
  }
}

/* ── Reference Tag Clicks ───────────────────────────────── */
function setupRefTagClicks() {
  document.querySelectorAll('.ref-tag').forEach(tag => {
    tag.onclick = () => {
      const sym   = tag.dataset.symbol
      const input = document.getElementById('search-input')
      if (input) input.value = sym
      searchSymbol(sym)
    }
  })
}

/* ── Helpers ─────────────────────────────────────────────── */
function cardId(symbol) { return 'idx-' + symbol.replace(/[\^=\-.]/g, '') }

/* ── Window exports (for inline onclick) ─────────────────── */
window.renderMarketIndices = renderMarketIndices
window.openDetailPanel     = openDetailPanel
window.loadSimChart        = loadSimChart
