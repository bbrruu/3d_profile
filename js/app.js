// ============================================================
// app.js – Application entry point and orchestration
// ============================================================

window.APP = {
  fxRate:     { twdPerUsd: 31.5, usdPerTwd: 1 / 31.5 },
  refreshing: false,
  prices:     {},
  activeTab:  'portfolio'
};

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initChartDefaults();
  setupTabs();
  setupRefreshButton();
  setupIncomeBannerClose();

  // Load FX rate then render active tab
  fetchFXRate().then(function(rate) {
    if (rate) window.APP.fxRate = rate;
    updateFXDisplay();
  }).catch(function() {}).finally(function() {
    renderTab(window.APP.activeTab);
  });

  // Auto-refresh every 60 seconds
  setInterval(refreshAll, 60000);
});

/* ── Tab Switching ──────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
    });
  });
}

function setActiveTab(tab) {
  window.APP.activeTab = tab;

  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tab-' + tab);
  });

  renderTab(tab);
}

function renderTab(tab) {
  if (tab === 'portfolio') {
    renderPortfolioTab();
  } else if (tab === 'simulator') {
    renderSimulatorTab();
  } else if (tab === 'market') {
    renderMarketTab();
  }
}

/* ── Refresh ────────────────────────────────────────────── */
async function refreshAll() {
  if (window.APP.refreshing) return;
  window.APP.refreshing = true;

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;
  }

  try {
    const rate = await fetchFXRate();
    if (rate) {
      window.APP.fxRate = rate;
      updateFXDisplay();
    }
  } catch (e) {
    // Keep existing rate
  }

  try {
    renderTab(window.APP.activeTab);
  } catch (e) {
    console.error('Render error:', e);
  }

  window.APP.refreshing = false;
  if (refreshBtn) {
    refreshBtn.classList.remove('spinning');
    refreshBtn.disabled = false;
  }
}

function setupRefreshButton() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.addEventListener('click', refreshAll);
}

function updateFXDisplay() {
  const el = document.getElementById('fx-display');
  if (el) {
    el.textContent = '1 USD = NT$' + fmtNum(window.APP.fxRate.twdPerUsd, 2);
  }
}

/* ── Income Banner Close ────────────────────────────────── */
function setupIncomeBannerClose() {
  const closeBtn = document.getElementById('income-banner-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      const banner = document.getElementById('income-banner');
      if (banner) banner.style.display = 'none';
    };
  }
}
