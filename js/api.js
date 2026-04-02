// ============================================================
// api.js – Data fetching layer (Yahoo Finance + CoinGecko)
// ============================================================

import { fmtNum, colorClass } from './utils.js'

const _priceCache = {};
const CACHE_TTL = 60000; // 60 seconds

/* ── CORS Proxy helper ──────────────────────────────────── */
async function _fetchWithProxy(url) {
  const proxy1 = 'https://corsproxy.io/?' + encodeURIComponent(url);
  const proxy2 = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);

  try {
    const res = await fetch(proxy1, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      return JSON.parse(text);
    }
    throw new Error('proxy1 failed: ' + res.status);
  } catch (e) {
    // Fallback to allorigins
    const res2 = await fetch(proxy2, { signal: AbortSignal.timeout(8000) });
    if (!res2.ok) throw new Error('Both proxies failed');
    const text2 = await res2.text();
    return JSON.parse(text2);
  }
}

/* ── fetchQuote ─────────────────────────────────────────── */
export async function fetchQuote(symbol) {
  const cacheKey = 'quote_' + symbol;
  const cached = _priceCache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=1d';

  try {
    const data = await _fetchWithProxy(url);
    const result = data.chart && data.chart.result && data.chart.result[0];
    if (!result) throw new Error('No result for ' + symbol);

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const quote = {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      price,
      change,
      changePct,
      currency: meta.currency || 'USD',
      previousClose: prevClose,
      timestamp: Date.now()
    };

    _priceCache[cacheKey] = { ts: Date.now(), data: quote };
    return quote;
  } catch (e) {
    console.warn('fetchQuote error for', symbol, e.message);
    // Return cached stale data if available
    if (cached) return cached.data;
    throw e;
  }
}

/* ── fetchMultipleQuotes ────────────────────────────────── */
export async function fetchMultipleQuotes(symbols) {
  const results = {};
  const promises = symbols.map(async function(sym) {
    try {
      results[sym] = await fetchQuote(sym);
    } catch (e) {
      results[sym] = null;
    }
  });
  await Promise.all(promises);
  return results;
}

/* ── fetchFXRate ────────────────────────────────────────── */
export async function fetchFXRate() {
  try {
    const q = await fetchQuote('TWD=X');
    // TWD=X is USD per TWD, so invert
    if (q && q.price) {
      const twdPerUsd = 1 / q.price;
      return { twdPerUsd, usdPerTwd: q.price };
    }
  } catch (e) {
    // ignore, try TWDUSD
  }

  try {
    const q2 = await fetchQuote('TWDUSD=X');
    if (q2 && q2.price) {
      return { twdPerUsd: 1 / q2.price, usdPerTwd: q2.price };
    }
  } catch (e) {
    // ignore
  }

  // Try direct approach
  try {
    const q3 = await fetchQuote('USDTWD=X');
    if (q3 && q3.price) {
      return { twdPerUsd: q3.price, usdPerTwd: 1 / q3.price };
    }
  } catch (e) {
    // ignore
  }

  return { twdPerUsd: 31.5, usdPerTwd: 1 / 31.5 };
}

/* ── CoinGecko ──────────────────────────────────────────── */
export async function fetchCryptoPrices(coinIds) {
  if (!coinIds || coinIds.length === 0) return {};
  const ids = coinIds.join(',');
  const cacheKey = 'crypto_' + ids;
  const cached = _priceCache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd,twd&include_24hr_change=true';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('CoinGecko error ' + res.status);
    const data = await res.json();
    _priceCache[cacheKey] = { ts: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('fetchCryptoPrices error:', e.message);
    if (cached) return cached.data;
    return {};
  }
}

export async function fetchCryptoPrice(coinId) {
  const data = await fetchCryptoPrices([coinId]);
  const entry = data[coinId];
  if (!entry) return null;
  return {
    symbol: coinId.toUpperCase(),
    name: coinId,
    price: entry.usd,
    priceTWD: entry.twd,
    change: null,
    changePct: entry.usd_24h_change || 0,
    currency: 'USD'
  };
}

/* ── Market Indices ─────────────────────────────────────── */
export const MARKET_INDICES = [
  { symbol: '^TWII',   label: 'TAIEX',        flag: '🇹🇼', market: 'TW'      },
  { symbol: '^GSPC',   label: 'S&P 500',       flag: '🇺🇸', market: 'US'      },
  { symbol: '^IXIC',   label: 'NASDAQ',        flag: '🇺🇸', market: 'US'      },
  { symbol: '^DJI',    label: 'Dow Jones',     flag: '🇺🇸', market: 'US'      },
  { symbol: 'BTC-USD', label: 'Bitcoin',       flag: '₿',  market: 'CRYPTO'  },
  { symbol: 'ETH-USD', label: 'Ethereum',      flag: 'Ξ',  market: 'CRYPTO'  },
  { symbol: 'GC=F',    label: 'Gold',          flag: '🥇', market: 'FUTURES' },
  { symbol: 'CL=F',    label: 'Crude Oil WTI', flag: '🛢', market: 'FUTURES' }
]

/* ── fetchHistory ────────────────────────────────────────── */
// interval: '5m'|'1d'|'1wk'   range: '1d'|'5d'|'3mo'|'1y'
export async function fetchHistory(symbol, interval, range) {
  const key = `hist_${symbol}_${interval}_${range}`
  const cached = _priceCache[key]
  const ttl = range === '1d' ? 5 * 60 * 1000 : 60 * 60 * 1000
  if (cached && Date.now() - cached.ts < ttl) return cached.data

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
  try {
    const data  = await _fetchWithProxy(url)
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('No history for ' + symbol)
    const ts = result.timestamp || []
    const q  = result.indicators?.quote?.[0] || {}
    const points = ts
      .map((t, i) => ({ time: new Date(t * 1000), open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i] }))
      .filter(p => p.close != null)
    _priceCache[key] = { ts: Date.now(), data: points }
    return points
  } catch (e) {
    if (cached) return cached.data
    throw e
  }
};

/* ── Coin ID Map ────────────────────────────────────────── */
export const COIN_ID_MAP = {
  'BTC':  'bitcoin',
  'ETH':  'ethereum',
  'BNB':  'binancecoin',
  'SOL':  'solana',
  'ADA':  'cardano',
  'XRP':  'ripple',
  'DOGE': 'dogecoin',
  'DOT':  'polkadot',
  'AVAX': 'avalanche-2',
  'MATIC':'matic-network',
  'LINK': 'chainlink',
  'UNI':  'uniswap',
  'LTC':  'litecoin',
  'ATOM': 'cosmos',
  'NEAR': 'near',
  'SHIB': 'shiba-inu',
  'TRX':  'tron',
  'BCH':  'bitcoin-cash',
  'ALGO': 'algorand',
  'XLM':  'stellar'
};

export function getCoinId(symbol) {
  const upper = symbol.toUpperCase();
  return COIN_ID_MAP[upper] || symbol.toLowerCase();
}
