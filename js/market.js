// ============================================================
// market.js – Market overview tab
// ============================================================
import { fmtTWD, fmtUSD, fmtNum, fmtPct, colorClass, showToast } from './utils.js'
import { fetchQuote, fetchMultipleQuotes, MARKET_INDICES } from './api.js'

/* ── Main Render ────────────────────────────────────────── */
export function renderMarketTab() {
  renderMarketIndices()
  renderFXRates()
  setupSearch()
  setupRefTagClicks()
}

/* ── Market Indices Grid ────────────────────────────────── */
async function renderMarketIndices() {
  const grid = document.getElementById('market-indices-grid')
  if (!grid) return

  grid.innerHTML = MARKET_INDICES.map(idx => {
    const safeId = 'idx-' + idx.symbol.replace(/[\^=\-]/g, '')
    return `<div class="index-card" id="${safeId}">
      <div class="index-flag">${idx.flag}</div>
      <div class="index-label">${idx.label}</div>
      <div class="index-price">Loading...</div>
      <div class="index-change">--</div>
    </div>`
  }).join('')

  try {
    const quotes = await fetchMultipleQuotes(MARKET_INDICES.map(i => i.symbol))

    MARKET_INDICES.forEach(idx => {
      const q    = quotes[idx.symbol]
      const safeId = 'idx-' + idx.symbol.replace(/[\^=\-]/g, '')
      const card = document.getElementById(safeId)
      if (!card) return

      const priceEl  = card.querySelector('.index-price')
      const changeEl = card.querySelector('.index-change')

      if (!q) { priceEl.textContent = 'N/A'; changeEl.textContent = '--'; return }

      const isCrypto = idx.symbol.includes('-USD')
      priceEl.textContent = isCrypto ? fmtUSD(q.price) : (q.currency === 'TWD' ? fmtTWD(q.price) : fmtNum(q.price, 2))

      const sign = q.changePct >= 0 ? '+' : ''
      changeEl.textContent = sign + fmtNum(q.changePct, 2) + '%'
      changeEl.className   = 'index-change ' + colorClass(q.changePct)
    })
  } catch (e) {
    showToast('Market data error: ' + e.message, 'error')
  }
}

/* ── FX Rates ───────────────────────────────────────────── */
async function renderFXRates() {
  const container = document.getElementById('fx-rates-container')
  if (!container) return
  container.innerHTML = '<div class="loading-msg">Loading FX rates...</div>'

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
      const chgStr = q ? fmtPct(chgPct) : '--'
      return `<div class="fx-card">
        <div class="fx-pair">${pair.label}</div>
        <div class="fx-rate">${price}</div>
        <div class="fx-change ${colorClass(chgPct)}">${chgStr}</div>
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
  resultEl.innerHTML = `<div class="loading-msg">Searching ${symbol}...</div>`

  try {
    const q = await fetchQuote(symbol)
    if (!q) throw new Error('No data returned')
    const isTW     = q.currency === 'TWD'
    const priceStr = isTW ? fmtTWD(q.price) : fmtUSD(q.price)
    const prevStr  = isTW ? fmtTWD(q.previousClose) : fmtUSD(q.previousClose)
    const chgCls   = colorClass(q.changePct)
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
            <div class="search-change ${chgCls}">${sign}${fmtNum(q.change, 2)} (${fmtPct(q.changePct)})</div>
          </div>
        </div>
        <div class="search-meta">
          <span>Prev Close: ${prevStr}</span>
          <span>Currency: ${q.currency || '--'}</span>
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
