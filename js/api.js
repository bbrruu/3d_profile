// api.js - Data fetching layer for InvestSim

// ─── Cache ────────────────────────────────────────────────────────────────────

const _priceCache = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

function _cacheGet(key) {
  const entry = _priceCache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    delete _priceCache[key];
    return null;
  }
  return entry.data;
}

function _cacheSet(key, data) {
  _priceCache[key] = { ts: Date.now(), data };
}

// ─── CORS Proxy Fetch ─────────────────────────────────────────────────────────

async function _fetchWithProxy(url) {
  const proxies = [
    'https://corsproxy.io/?' + encodeURIComponent(url),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.trim() === '') continue;
      return JSON.parse(text);
    } catch (e) {
      // try next proxy
    }
  }
  throw new Error('All proxies failed for: ' + url);
}

// ─── Yahoo Finance Quote ──────────────────────────────────────────────────────

async function fetchQuote(symbol) {
  const cached = _cacheGet('quote:' + symbol);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  try {
    const data = await _fetchWithProxy(url);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta in response');

    const price = meta.regularMarketPrice ?? meta.previousClose ?? null;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price !== null && prevClose !== null ? price - prevClose : null;
    const changePct = prevClose && prevClose !== 0 ? (change / prevClose) * 100 : null;

    const result = {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      price,
      change,
      changePct,
      currency: meta.currency || 'USD',
      previousClose: prevClose
    };

    _cacheSet('quote:' + symbol, result);
    return result;
  } catch (e) {
    console.warn(`fetchQuote(${symbol}) failed:`, e.message);
    return { symbol, name: symbol, price: null, change: null, changePct: null, currency: 'USD', previousClose: null };
  }
}

async function fetchMultipleQuotes(symbols) {
  const results = await Promise.allSettled(symbols.map(s => fetchQuote(s)));
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : {
    symbol: symbols[i], name: symbols[i], price: null, change: null, changePct: null, currency: 'USD', previousClose: null
  });
}

// ─── FX Rate ──────────────────────────────────────────────────────────────────

async function fetchFXRate() {
  const cached = _cacheGet('fx:TWDUSD');
  if (cached) return cached;

  try {
    const q = await fetchQuote('TWDUSD=X');
    if (q.price) {
      // TWDUSD=X gives TWD per USD (how many TWD to buy 1 USD)
      const twdPerUsd = q.price;
      const result = { twdPerUsd, usdPerTwd: 1 / twdPerUsd };
      _cacheSet('fx:TWDUSD', result);
      return result;
    }
  } catch (e) {
    console.warn('fetchFXRate failed, using fallback', e.message);
  }

  // Fallback
  return { twdPerUsd: 31.5, usdPerTwd: 1 / 31.5 };
}

// ─── CoinGecko ────────────────────────────────────────────────────────────────

const COIN_ID_MAP = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'NEAR': 'near',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'FTM': 'fantom',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'XLM': 'stellar',
  'ETC': 'ethereum-classic',
  'HBAR': 'hedera-hashgraph',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism'
};

async function fetchCryptoPrices(coinIds) {
  const cacheKey = 'crypto:' + coinIds.join(',');
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd,twd&include_24hr_change=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('CoinGecko status: ' + res.status);
    const data = await res.json();
    _cacheSet(cacheKey, data);
    return data;
  } catch (e) {
    console.warn('fetchCryptoPrices failed:', e.message);
    return {};
  }
}

async function fetchCryptoPrice(coinId) {
  const data = await fetchCryptoPrices([coinId]);
  const entry = data[coinId];
  if (!entry) return { coinId, priceUsd: null, priceTwd: null, change24h: null };
  return {
    coinId,
    priceUsd: entry.usd ?? null,
    priceTwd: entry.twd ?? null,
    change24h: entry.usd_24h_change ?? null
  };
}

// ─── Market Indices ───────────────────────────────────────────────────────────

const MARKET_INDICES = [
  { symbol: '^TWII',  label: 'TAIEX',      category: 'equity' },
  { symbol: '^GSPC',  label: 'S&P 500',    category: 'equity' },
  { symbol: '^IXIC',  label: 'NASDAQ',     category: 'equity' },
  { symbol: '^DJI',   label: 'Dow Jones',  category: 'equity' },
  { symbol: '^HSI',   label: 'Hang Seng',  category: 'equity' },
  { symbol: '^N225',  label: 'Nikkei 225', category: 'equity' },
  { symbol: 'GC=F',   label: 'Gold',       category: 'commodity' },
  { symbol: 'CL=F',   label: 'WTI Oil',    category: 'commodity' },
  { symbol: 'SI=F',   label: 'Silver',     category: 'commodity' },
  { symbol: 'BTC-USD',label: 'Bitcoin',    category: 'crypto' },
  { symbol: 'ETH-USD',label: 'Ethereum',   category: 'crypto' },
  { symbol: 'TWDUSD=X', label: 'TWD/USD',  category: 'fx' },
  { symbol: 'EURUSD=X', label: 'EUR/USD',  category: 'fx' },
  { symbol: 'JPYUSD=X', label: 'JPY/USD',  category: 'fx' }
];
