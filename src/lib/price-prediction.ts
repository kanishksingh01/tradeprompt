import type { OHLCV } from '@/types/trading';

export interface PricePrediction {
  horizon: 10 | 25;
  targetDate: string;
  baseTarget: number;       // linear regression extrapolation
  bullTarget: number;       // +1 sigma
  bearTarget: number;       // -1 sigma
  changeFromCurrent: number;
  changePct: number;
  rSquared: number;         // regression fit quality 0-1
  confidence: 'High' | 'Moderate' | 'Low';
  trend: 'up' | 'down' | 'flat';
  momentumAdjusted: number; // target after RSI/MACD momentum adjustment
}

export interface PredictionResult {
  day10: PricePrediction;
  day25: PricePrediction;
  annualisedHV: number;
  regressionSlope: number;  // $ per day
  slopePct: number;         // % per day
}

function addTradingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function linReg(y: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - meanX) * (y[i] - meanY);
    ssXX += (x[i] - meanX) ** 2;
    ssYY += (y[i] - meanY) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const rSquared = ssYY === 0 ? 0 : Math.min(1, (ssXY ** 2) / (ssXX * ssYY));

  return { slope, intercept, rSquared };
}

function annualisedHV(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0.20; // fallback 20%
  const slice = closes.slice(-window - 1);
  const logRet = slice.slice(1).map((c, i) => Math.log(c / slice[i]));
  const mean = logRet.reduce((a, b) => a + b, 0) / logRet.length;
  const variance = logRet.reduce((a, b) => a + (b - mean) ** 2, 0) / (logRet.length - 1);
  return Math.sqrt(variance * 252);
}

function momentumAdjust(base: number, currentPrice: number, rsi: number, macdHist: number): number {
  // RSI adjustment: overbought pulls target down, oversold pushes up
  const rsiAdj = rsi > 70 ? -0.015 : rsi < 30 ? +0.015 : 0;
  // MACD hist direction gives a small nudge
  const macdAdj = macdHist > 0 ? +0.005 : macdHist < 0 ? -0.005 : 0;
  return base * (1 + rsiAdj + macdAdj);
}

export function computePredictions(
  bars: OHLCV[],
  currentPrice: number,
  rsi: number,
  macdHist: number,
): PredictionResult {
  const closes = bars.map((b) => b.close);
  const hv = annualisedHV(closes, 30);

  // Use last 40 bars for regression (enough signal, not too much noise)
  const window = Math.min(40, closes.length);
  const recentCloses = closes.slice(-window);
  const { slope, intercept, rSquared } = linReg(recentCloses);

  const slopePct = currentPrice > 0 ? (slope / currentPrice) * 100 : 0;

  const today = new Date();

  function makePrediction(horizon: 10 | 25): PricePrediction {
    const targetDate = addTradingDays(today, horizon);
    const x = window - 1 + horizon; // project `horizon` steps beyond last observation
    const base = intercept + slope * x;

    // 1-sigma band = HV × price × sqrt(horizon / 252)
    const sigma = currentPrice * hv * Math.sqrt(horizon / 252);
    const bullTarget = base + sigma;
    const bearTarget = base - sigma;

    const momentumAdjustedTarget = momentumAdjust(base, currentPrice, rsi, macdHist);

    const changePct = currentPrice > 0 ? ((momentumAdjustedTarget - currentPrice) / currentPrice) * 100 : 0;

    const confidence: PricePrediction['confidence'] =
      rSquared > 0.65 ? 'High' : rSquared > 0.35 ? 'Moderate' : 'Low';

    const trend: PricePrediction['trend'] =
      Math.abs(slopePct) < 0.05 ? 'flat' : slopePct > 0 ? 'up' : 'down';

    return {
      horizon,
      targetDate: targetDate.toISOString().split('T')[0],
      baseTarget: Math.round(base * 100) / 100,
      bullTarget: Math.round(bullTarget * 100) / 100,
      bearTarget: Math.round(bearTarget * 100) / 100,
      changeFromCurrent: Math.round((momentumAdjustedTarget - currentPrice) * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
      confidence,
      trend,
      momentumAdjusted: Math.round(momentumAdjustedTarget * 100) / 100,
    };
  }

  return {
    day10: makePrediction(10),
    day25: makePrediction(25),
    annualisedHV: Math.round(hv * 1000) / 10,
    regressionSlope: Math.round(slope * 1000) / 1000,
    slopePct: Math.round(slopePct * 1000) / 1000,
  };
}
