import { NextResponse } from 'next/server';
import { getMovers, getHistory } from '@/lib/polygon';
import { computeTechnicals } from '@/lib/technicals';
import { computeVolMetrics } from '@/lib/vol-analysis';

export const runtime = 'nodejs';

async function enrich(ticker: string, price: number, changePct: number, change: number, volume: number, direction: 'up' | 'down') {
  const bars = await getHistory(ticker, 60).catch(() => []);
  const tech = bars.length >= 20
    ? computeTechnicals(bars)
    : { rsi: 50, trend: 'neutral' as const };
  const vol = bars.length >= 20 ? computeVolMetrics(bars, price) : null;
  return {
    ticker, price, changePct, change, volume, direction,
    trend: tech.trend,
    rsi: Math.round(tech.rsi),
    hv30: vol ? Math.round(vol.hv30) : null,
    expectedDailyMovePct: vol ? Math.round(vol.expectedDailyMovePct * 10) / 10 : null,
  };
}

export async function GET() {
  const [gainersRes, losersRes] = await Promise.allSettled([
    getMovers('gainers'),
    getMovers('losers'),
  ]);

  const rawGainers = gainersRes.status === 'fulfilled' ? gainersRes.value.slice(0, 8) : [];
  const rawLosers = losersRes.status === 'fulfilled' ? losersRes.value.slice(0, 8) : [];

  const [enrichedGainers, enrichedLosers] = await Promise.all([
    Promise.allSettled(rawGainers.map((m) => enrich(m.ticker, m.price, m.changePct, m.change, m.volume, 'up'))),
    Promise.allSettled(rawLosers.map((m) => enrich(m.ticker, m.price, m.changePct, m.change, m.volume, 'down'))),
  ]);

  const gainers = enrichedGainers.map((r) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  const losers = enrichedLosers.map((r) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);

  return NextResponse.json({ gainers, losers });
}
