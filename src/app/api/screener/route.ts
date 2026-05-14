import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getHistory } from '@/lib/polygon';
import { computeTechnicals } from '@/lib/technicals';
import { computeVolMetrics, generateSyntheticOptions } from '@/lib/vol-analysis';

export const runtime = 'nodejs';

const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'TSLA', 'META', 'MSFT', 'AMZN', 'GOOGL', 'AMD', 'SPY', 'QQQ', 'NFLX', 'COIN'];

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tickers');
  const tickers = param
    ? param.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 20)
    : DEFAULT_TICKERS;

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const [quoteRes, histRes] = await Promise.allSettled([
        getQuote(ticker),
        getHistory(ticker, 90),
      ]);

      if (quoteRes.status === 'rejected') return null;

      const quote = quoteRes.value;
      const bars = histRes.status === 'fulfilled' ? histRes.value : [];

      const tech = bars.length >= 20
        ? computeTechnicals(bars)
        : { rsi: 50, macdLine: 0, macdSignal: 0, macdHist: 0, sma20: quote.price, sma50: quote.price, sma200: quote.price, trend: 'neutral' as const, support: quote.low, resistance: quote.high };

      const vol = bars.length >= 20 ? computeVolMetrics(bars, quote.price) : null;
      const synthetic = vol ? generateSyntheticOptions(quote.price, vol, tech.trend) : [];
      const top = synthetic[0] ?? null;

      return {
        ticker,
        price: quote.price,
        changePct: quote.changePct,
        volume: quote.volume,
        trend: tech.trend,
        rsi: Math.round(tech.rsi * 10) / 10,
        macdHist: tech.macdHist,
        support: tech.support,
        resistance: tech.resistance,
        hv30: vol ? Math.round(vol.hv30) : null,
        expectedSwingMovePct: vol ? Math.round(vol.expectedSwingMovePct * 10) / 10 : null,
        topPick: top ? {
          type: top.type,
          strike: top.strike,
          expiry: top.expiry,
          daysToExpiry: top.daysToExpiry,
          midPrice: top.estimatedMid,
          pricePerContract: top.pricePerContract,
          impliedVolatility: top.impliedVolatility,
          delta: top.delta,
          breakevenPct: top.breakevenPct,
          rationale: top.rationale,
        } : null,
      };
    }),
  );

  const data = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);

  return NextResponse.json(data);
}
