import type { OHLCV } from '@/types/trading';

export interface VolMetrics {
  hv10: number;   // 10-day historical vol (annualised, %)
  hv30: number;   // 30-day
  hv60: number;   // 60-day
  expectedDailyMove: number;   // $ next-day 1-sigma move
  expectedDailyMovePct: number; // as % of price
  ivProxy: number; // best HV window to use as IV proxy
  ivProxyLabel: string;
}

export interface SyntheticOption {
  type: 'call' | 'put';
  strike: number;
  expiry: string;     // YYYY-MM-DD
  daysToExpiry: number;
  estimatedMid: number;
  pricePerContract: number;
  breakeven: number;
  breakevenPct: number;
  delta: number;      // approx from BS
  impliedVolatility: number; // = ivProxy used
  rationale: string;
}

function annualisedHV(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
  const slice = closes.slice(-window - 1);
  const logReturns = slice.slice(1).map((c, i) => Math.log(c / slice[i]));
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (logReturns.length - 1);
  return Math.sqrt(variance * 252) * 100; // annualised %
}

// Abramowitz & Stegun normal CDF approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1 - poly * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function bsDelta(S: number, K: number, T: number, sigma: number, isCall: boolean, r = 0.045): number {
  if (T <= 0 || sigma <= 0) return isCall ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T));
  return isCall ? normalCDF(d1) : normalCDF(d1) - 1;
}

// Black-Scholes call/put price
function bsPrice(S: number, K: number, T: number, sigma: number, isCall: boolean, r = 0.045): number {
  if (T <= 0) return Math.max(0, isCall ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const disc = Math.exp(-r * T);
  return isCall
    ? S * normalCDF(d1) - K * disc * normalCDF(d2)
    : K * disc * normalCDF(-d2) - S * normalCDF(-d1);
}

// Next trading day date (skip weekends)
function nextTradingDay(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

// Next Friday on or after `from`
function nextFriday(from = new Date(), weeksOut = 0): Date {
  const d = new Date(from);
  const day = d.getDay();
  const daysToFriday = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToFriday + weeksOut * 7);
  return d;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function computeVolMetrics(bars: OHLCV[], currentPrice: number): VolMetrics {
  const closes = bars.map((b) => b.close);
  const hv10 = annualisedHV(closes, 10);
  const hv30 = annualisedHV(closes, 30);
  const hv60 = annualisedHV(closes, 60);

  // Use 10-day HV as IV proxy for next-day trades (short-term vol is most relevant)
  const ivProxy = hv10 > 0 ? hv10 : hv30;
  const ivProxyLabel = hv10 > 0 ? 'HV10' : 'HV30';

  const dailySigma = ivProxy / 100 / Math.sqrt(252);
  const expectedDailyMove = currentPrice * dailySigma;

  return {
    hv10: Math.round(hv10 * 10) / 10,
    hv30: Math.round(hv30 * 10) / 10,
    hv60: Math.round(hv60 * 10) / 10,
    expectedDailyMove: Math.round(expectedDailyMove * 100) / 100,
    expectedDailyMovePct: Math.round((dailySigma * 100) * 100) / 100,
    ivProxy: Math.round(ivProxy * 10) / 10,
    ivProxyLabel,
  };
}

export function generateSyntheticOptions(
  currentPrice: number,
  vol: VolMetrics,
  trend: 'bullish' | 'bearish' | 'neutral',
): SyntheticOption[] {
  const sigma = vol.ivProxy / 100;
  const today = new Date();

  // Two expiry targets: this Friday and next Friday
  const expiries = [
    { date: nextFriday(today, 0), label: 'this Friday' },
    { date: nextFriday(today, 1), label: 'next Friday' },
  ];

  const options: SyntheticOption[] = [];

  for (const exp of expiries) {
    const dte = Math.max(1, Math.ceil((exp.date.getTime() - today.getTime()) / 86400000));
    const T = dte / 365;

    // Strike selection: slight OTM, biased by trend
    // Calls: price + 0.3× daily move (slight OTM)
    // Puts: price - 0.3× daily move
    const nudge = vol.expectedDailyMove * 0.3;

    const candidates: { type: 'call' | 'put'; rawStrike: number }[] = [];
    if (trend !== 'bearish') candidates.push({ type: 'call', rawStrike: currentPrice + nudge });
    if (trend !== 'bullish') candidates.push({ type: 'put', rawStrike: currentPrice - nudge });

    for (const { type, rawStrike } of candidates) {
      // Round to nearest standard strike interval
      const interval = currentPrice < 50 ? 1 : currentPrice < 200 ? 2.5 : 5;
      const strike = Math.round(rawStrike / interval) * interval;

      const mid = bsPrice(currentPrice, strike, T, sigma, type === 'call');
      if (mid <= 0.01) continue;

      const delta = bsDelta(currentPrice, strike, T, sigma, type === 'call');
      const breakeven = type === 'call' ? strike + mid : strike - mid;
      const breakevenPct = Math.round(((breakeven - currentPrice) / currentPrice) * 10000) / 100;

      const rationale = type === 'call'
        ? `Slight OTM call targeting continued upside. Needs +${Math.abs(breakevenPct)}% move to break even at expiry; profitable if price moves above $${breakeven.toFixed(2)} by ${exp.label}.`
        : `Slight OTM put targeting downside. Needs -${Math.abs(breakevenPct)}% move to break even at expiry; profitable if price falls below $${breakeven.toFixed(2)} by ${exp.label}.`;

      options.push({
        type,
        strike,
        expiry: fmt(exp.date),
        daysToExpiry: dte,
        estimatedMid: Math.round(mid * 100) / 100,
        pricePerContract: Math.round(mid * 100 * 100) / 100,
        breakeven: Math.round(breakeven * 100) / 100,
        breakevenPct,
        delta: Math.round(delta * 1000) / 1000,
        impliedVolatility: vol.ivProxy,
        rationale,
      });
    }
  }

  // Return top 3: prioritise shorter DTE and trend-aligned
  const preferred = trend === 'bullish' ? 'call' : trend === 'bearish' ? 'put' : null;
  const sorted = [...options].sort((a, b) => {
    const aMatch = preferred ? (a.type === preferred ? 0 : 1) : 0;
    const bMatch = preferred ? (b.type === preferred ? 0 : 1) : 0;
    return aMatch - bMatch || a.daysToExpiry - b.daysToExpiry;
  });

  return sorted.slice(0, 3);
}
