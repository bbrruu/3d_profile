// ============================================================
// app.js – Application entry point
// ============================================================
import { fmtNum } from './utils.js'
import { fetchFXRate } from './api.js'
import { initChartDefaults } from './charts.js'
import { renderPortfolioTab } from './portfolio.js'
import { renderSimulatorTab } from './simulator.js'
import { renderMarketTab } from './market.js'

window.APP = {
  fxRate:     { twdPerUsd: 31.5, usdPerTwd: 1 / 31.5 },
  refreshing: false,
  prices:     {},
  activeTab:  'portfolio'
}

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults()
  setupTabs()
  setupRefreshButton()
  setupIncomeBannerClose()

  // Handle ?tab= URL param (PWA shortcuts)
  const urlTab = new URLSearchParams(window.location.search).get('tab')
  if (urlTab && ['portfolio', 'simulator', 'market'].includes(urlTab)) {
    window.APP.activeTab = urlTab
  }

  fetchFXRate()
    .then(rate => { if (rate) { window.APP.fxRate = rate; updateFXDisplay() } })
    .catch(() => {})
    .finally(() => renderTab(window.APP.activeTab))

  setInterval(refreshAll, 60000)
})

/* ── Tab Switching ──────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab-btn, .bnav-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab))
  })
}

function setActiveTab(tab) {
  window.APP.activeTab = tab
  document.querySelectorAll('.tab-btn, .bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab))
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab))
  renderTab(tab)
}

function renderTab(tab) {
  if (tab === 'portfolio')  renderPortfolioTab()
  else if (tab === 'simulator') renderSimulatorTab()
  else if (tab === 'market')    renderMarketTab()
}

/* ── Refresh ────────────────────────────────────────────── */
async function refreshAll() {
  if (window.APP.refreshing) return
  window.APP.refreshing = true
  const btn = document.getElementById('refresh-btn')
  if (btn) { btn.classList.add('spinning'); btn.disabled = true }

  try {
    const rate = await fetchFXRate()
    if (rate) { window.APP.fxRate = rate; updateFXDisplay() }
  } catch (e) {}

  try { renderTab(window.APP.activeTab) } catch (e) { console.error('Render error:', e) }

  window.APP.refreshing = false
  if (btn) { btn.classList.remove('spinning'); btn.disabled = false }
}

function setupRefreshButton() {
  const btn = document.getElementById('refresh-btn')
  if (btn) btn.addEventListener('click', refreshAll)
}

function updateFXDisplay() {
  const el = document.getElementById('fx-display')
  if (el) el.textContent = '1 USD = NT$' + fmtNum(window.APP.fxRate.twdPerUsd, 2)
}

function setupIncomeBannerClose() {
  const btn = document.getElementById('income-banner-close')
  if (btn) btn.onclick = () => { const b = document.getElementById('income-banner'); if (b) b.style.display = 'none' }
}
