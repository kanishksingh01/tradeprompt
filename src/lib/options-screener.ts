import type { ScoredOption } from '@/types/trading';
import type { YFContract } from './yahoo-finance';

// Zelen & Severo approximation of the standard normal CDF
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function blackScholesDelta(S: number, K: number, T: number, sigma: number, isCall: boolean, r = 0.045): number {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    return isCall ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
  }
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  return isCall ? normalCDF(d1) : normalCDF(d1) - 1;
}

function normalize(v: number, min: number, max: number): number {
  return max === min ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export function scoreOptions(
  contracts: YFContract[],
  currentPrice: number,
  trend: 'bullish' | 'bearish' | 'neutral',
): ScoredOption[] {
  const today = Date.now();

  const parsed: (ScoredOption & { rawScore: number })[] = [];

  for (const c of contracts) {
    const dte = Math.ceil((c.expiration * 1000 - today) / 86400000);
    const T = dte / 365;
    const iv = c.impliedVolatility || 0;
    const vol = c.volume ?? 0;
    const oi = c.openInterest ?? 0;
    const bid = c.bid ?? 0;
    const ask = c.ask ?? bid * 1.05;
    const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : c.lastPrice ?? 0;
    const strike = c.strike;

    // Next-day focus: tighter DTE window, near-ATM emphasis
    if (dte < 1 || dte > 21) continue;
    if (vol < 20) continue;
    if (oi < 50) continue;
    if (mid <= 0) continue;
    if (iv <= 0.05 || iv > 3.0) continue; // skip garbage IV

    const delta = blackScholesDelta(currentPrice, strike, T, iv, c.optionType === 'call');
    const absDelta = Math.abs(delta);

    // For next-day plays we want near-ATM (delta 0.30–0.65) for gamma leverage
    if (absDelta < 0.25 || absDelta > 0.70) continue;

    // Distance from ATM as fraction of price (lower = closer = better)
    const atmDistance = Math.abs(strike - currentPrice) / currentPrice;

    const atmScore = 1 - normalize(atmDistance, 0, 0.06); // within 6% of price
    const volOiScore = oi > 0 ? normalize(Math.min(vol / oi, 3), 0, 3) : 0;
    const dteScore = 1 - normalize(dte, 1, 21);            // shorter DTE = more gamma
    const liquidityScore = normalize(vol, 20, 3000);
    const ivScore = 1 - normalize(iv, 0.15, 1.5);           // penalise very high IV (expensive premium)

    const rawScore =
      atmScore * 0.35 +
      volOiScore * 0.25 +
      dteScore * 0.20 +
      liquidityScore * 0.12 +
      ivScore * 0.08;

    const breakeven = c.optionType === 'call'
      ? Math.round((strike + mid) * 100) / 100
      : Math.round((strike - mid) * 100) / 100;

    const breakevenPct = currentPrice > 0
      ? Math.round(((breakeven - currentPrice) / currentPrice) * 10000) / 100
      : 0;

    parsed.push({
      strike,
      expiry: new Date(c.expiration * 1000).toISOString().split('T')[0],
      type: c.optionType,
      bid,
      ask,
      midPrice: Math.round(mid * 100) / 100,
      volume: vol,
      openInterest: oi,
      impliedVolatility: Math.round(iv * 1000) / 10,
      delta: Math.round(delta * 1000) / 1000,
      score: Math.round(rawScore * 1000) / 1000,
      pricePerContract: Math.round(mid * 100 * 100) / 100,
      breakeven,
      daysToExpiry: dte,
      rawScore,
      breakevenPct,
    } as any);
  }

  // Bias toward trend direction; fall back to mixed if not enough picks
  const preferred = trend === 'bullish' ? 'call' : trend === 'bearish' ? 'put' : null;
  const directional = preferred ? parsed.filter((c) => c.type === preferred) : parsed;
  const pool = directional.length >= 2 ? directional : parsed;

  return pool
    .sort((a, b) => (b as any).rawScore - (a as any).rawScore)
    .slice(0, 3)
    .map(({ rawScore: _, ...c }) => c as ScoredOption);
}
