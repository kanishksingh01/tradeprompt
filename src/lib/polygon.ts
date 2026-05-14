import type { Quote, OHLCV, SearchResult } from '@/types/trading';

interface PolygonAgg { o: number; h: number; l: number; c: number; v: number; vw?: number; t: number; }
interface PolygonTicker { ticker: string; name: string; primary_exchange?: string; type?: string; }

const BASE = 'https://api.polygon.io';

async function get(path: string, revalidate = 60) {
  const key = process.env.POLYGON_API_KEY;
  if (!key) throw new Error('POLYGON_API_KEY not set');
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}apiKey=${key}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Polygon ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function getQuote(ticker: string): Promise<Quote> {
  const sym = ticker.toUpperCase();

  // Use aggs range for last 2 trading days — available on free tier
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const aggs = await get(
    `/v2/aggs/ticker/${sym}/range/1/day/${from}/${to}?adjusted=true&sort=desc&limit=2`,
    60,
  );

  const results: PolygonAgg[] = aggs.results || [];
  if (results.length === 0) throw new Error(`No data for ${sym}`);

  const today = results[0];
  const prev = results[1];

  const change = prev ? today.c - prev.c : 0;
  const changePct = prev && prev.c > 0 ? (change / prev.c) * 100 : 0;

  return {
    ticker: sym,
    price: today.c,
    open: today.o,
    high: today.h,
    low: today.l,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume: today.v,
    vwap: today.vw || today.c,
  };
}

export async function getHistory(ticker: string, days = 250): Promise<OHLCV[]> {
  const sym = ticker.toUpperCase();
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await get(
    `/v2/aggs/ticker/${sym}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=300`,
    3600,
  );
  return (data.results || []).map((r: PolygonAgg) => ({
    date: new Date(r.t).toISOString().split('T')[0],
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v,
  }));
}

export async function getOptionsChain(ticker: string, dteMin = 14, dteMax = 60): Promise<unknown[]> {
  const sym = ticker.toUpperCase();
  const today = new Date();
  const minDate = new Date(today.getTime() + dteMin * 86400000).toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + dteMax * 86400000).toISOString().split('T')[0];
  try {
    const data = await get(
      `/v3/snapshot/options/${sym}?expiration_date.gte=${minDate}&expiration_date.lte=${maxDate}&limit=250`,
      120,
    );
    return data.results || [];
  } catch {
    return [];
  }
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  if (query.length < 1) return [];
  const data = await get(
    `/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&market=stocks&limit=10`,
    86400,
  );
  return (data.results || []).map((r: PolygonTicker) => ({
    ticker: r.ticker,
    name: r.name,
    market: r.primary_exchange || '',
    type: r.type || 'CS',
  }));
}

export interface Mover {
  ticker: string;
  price: number;
  changePct: number;
  change: number;
  volume: number;
}

export async function getMovers(direction: 'gainers' | 'losers'): Promise<Mover[]> {
  try {
    const data = await get(`/v2/snapshot/locale/us/markets/stocks/${direction}`, 300);
    return ((data.tickers as any[]) || []).slice(0, 12).map((t: any) => ({
      ticker: t.ticker,
      price: Math.round((t.day?.c ?? 0) * 100) / 100,
      changePct: Math.round((t.todaysChangePerc ?? 0) * 100) / 100,
      change: Math.round((t.todaysChange ?? 0) * 100) / 100,
      volume: t.day?.v ?? 0,
    }));
  } catch {
    return [];
  }
}
