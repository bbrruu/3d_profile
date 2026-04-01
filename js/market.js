// ============================================================
// market.js – Market overview tab
// ============================================================

/* ── Main Render ────────────────────────────────────────── */
function renderMarketTab() {
  renderMarketIndices();
  renderFXRates();
  setupSearch();
  setupRefTagClicks();
}

/* ── Market Indices Grid ────────────────────────────────── */
async function renderMarketIndices() {
  const grid = document.getElementById('market-indices-grid');
  if (!grid) return;

  // Show loading state
  grid.innerHTML = MARKET_INDICES.map(function(idx) {
    return '<div class="index-card" id="idx-' + idx.symbol.replace(/[\^=]/g, '') + '">' +
      '<div class="index-flag">' + idx.flag + '</div>' +
      '<div class="index-label">' + idx.label + '</div>' +
      '<div class="index-price">Loading...</div>' +
      '<div class="index-change">--</div>' +
      '</div>';
  }).join('');

  // Fetch all symbols
  const symbols = MARKET_INDICES.map(function(i) { return i.symbol; });

  try {
    const quotes = await fetchMultipleQuotes(symbols);

    MARKET_INDICES.forEach(function(idx) {
      const q   = quotes[idx.symbol];
      const id  = 'idx-' + idx.symbol.replace(/[\^=]/g, '');
      const card = document.getElementById(id);
      if (!card) return;

      if (!q) {
        card.querySelector('.index-price').textContent  = 'N/A';
        card.querySelector('.index-change').textContent = '--';
        return;
      }

      const priceEl  = card.querySelector('.index-price');
      const changeEl = card.querySelector('.index-change');

      const isCrypto = idx.symbol.includes('-USD');
      priceEl.textContent = isCrypto ? fmtUSD(q.price) : (q.currency === 'TWD' ? fmtTWD(q.price) : fmtNum(q.price, 2));

      const sign = q.changePct >= 0 ? '+' : '';
      changeEl.textContent = sign + fmtNum(q.changePct, 2) + '%';
      changeEl.className   = 'index-change ' + colorClass(q.changePct);
    });
  } catch (e) {
    showToast('Market data error: ' + e.message, 'error');
  }
}

/* ── FX Rates ───────────────────────────────────────────── */
async function renderFXRates() {
  const container = document.getElementById('fx-rates-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-msg">Loading FX rates...</div>';

  const pairs = [
    { symbol: 'USDTWD=X', label: 'USD/TWD', base: 'USD', quote: 'TWD' },
    { symbol: 'EURUSD=X', label: 'EUR/USD', base: 'EUR', quote: 'USD' },
    { symbol: 'GBPUSD=X', label: 'GBP/USD', base: 'GBP', quote: 'USD' },
    { symbol: 'USDJPY=X', label: 'USD/JPY', base: 'USD', quote: 'JPY' },
    { symbol: 'AUDUSD=X', label: 'AUD/USD', base: 'AUD', quote: 'USD' },
    { symbol: 'USDCNH=X', label: 'USD/CNH', base: 'USD', quote: 'CNH' }
  ];

  try {
    const quotes = await fetchMultipleQuotes(pairs.map(function(p) { return p.symbol; }));

    container.innerHTML = pairs.map(function(pair) {
      const q = quotes[pair.symbol];
      const price = q ? fmtNum(q.price, 4) : '--';
      const chgPct = q ? q.changePct : 0;
      const chgStr = q ? fmtPct(chgPct) : '--';
      const chgCls = colorClass(chgPct);
      return '<div class="fx-card">' +
        '<div class="fx-pair">' + pair.label + '</div>' +
        '<div class="fx-rate">' + price + '</div>' +
        '<div class="fx-change ' + chgCls + '">' + chgStr + '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="error-msg">Failed to load FX rates.</div>';
  }
}

/* ── Symbol Search ──────────────────────────────────────── */
function setupSearch() {
  const btn   = document.getElementById('search-btn');
  const input = document.getElementById('search-input');

  if (btn) {
    btn.onclick = function() {
      const sym = (input || {}).value.trim().toUpperCase();
      if (sym) searchSymbol(sym);
    };
  }

  if (input) {
    input.onkeydown = function(e) {
      if (e.key === 'Enter') {
        const sym = input.value.trim().toUpperCase();
        if (sym) searchSymbol(sym);
      }
    };
  }
}

async function searchSymbol(symbol) {
  const resultEl = document.getElementById('search-result');
  if (!resultEl) return;

  resultEl.innerHTML = '<div class="loading-msg">Searching ' + symbol + '...</div>';

  try {
    const quote = await fetchQuote(symbol);
    if (!quote) throw new Error('No data returned');

    const isTW     = quote.currency === 'TWD';
    const priceStr = isTW ? fmtTWD(quote.price) : fmtUSD(quote.price);
    const prevStr  = isTW ? fmtTWD(quote.previousClose) : fmtUSD(quote.previousClose);
    const chgCls   = colorClass(quote.changePct);
    const chgSign  = quote.changePct >= 0 ? '+' : '';

    resultEl.innerHTML =
      '<div class="search-result-card">' +
        '<div class="search-result-header">' +
          '<div>' +
            '<div class="search-symbol">' + quote.symbol + '</div>' +
            '<div class="search-name">' + (quote.name || '') + '</div>' +
          '</div>' +
          '<div class="search-price-block">' +
            '<div class="search-price">' + priceStr + '</div>' +
            '<div class="search-change ' + chgCls + '">' +
              chgSign + fmtNum(quote.change, 2) + ' (' + fmtPct(quote.changePct) + ')' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="search-meta">' +
          '<span>Prev Close: ' + prevStr + '</span>' +
          '<span>Currency: ' + (quote.currency || '--') + '</span>' +
        '</div>' +
      '</div>';
  } catch (e) {
    resultEl.innerHTML = '<div class="error-msg">No data found for "' + symbol + '". Check the symbol and try again.</div>';
  }
}

/* ── Reference Tag Clicks ───────────────────────────────── */
function setupRefTagClicks() {
  document.querySelectorAll('.ref-tag').forEach(function(tag) {
    tag.onclick = function() {
      const sym    = tag.dataset.symbol;
      const input  = document.getElementById('search-input');
      if (input) input.value = sym;
      searchSymbol(sym);
    };
  });
}
