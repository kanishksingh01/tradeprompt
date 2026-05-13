import type { OHLCV, Technicals } from '@/types/trading';

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeMACD(closes: number[]): { line: number; signal: number; hist: number } {
  if (closes.length < 35) return { line: 0, signal: 0, hist: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const len = Math.min(ema12.length, ema26.length);
  const macdLine = ema12.slice(-len).map((v, i) => v - ema26[ema26.length - len + i]);
  const signalLine = ema(macdLine, 9);
  const line = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { line, signal, hist: line - signal };
}

function findSupportResistance(bars: OHLCV[]): { support: number; resistance: number } {
  const recent = bars.slice(-20);
  const lows = recent.map((b) => b.low);
  const highs = recent.map((b) => b.high);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

export function computeTechnicals(bars: OHLCV[]): Technicals {
  const closes = bars.map((b) => b.close);

  const rsi = computeRSI(closes);
  const { line: macdLine, signal: macdSignal, hist: macdHist } = computeMACD(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const { support, resistance } = findSupportResistance(bars);

  const bullish = [
    rsi > 50,
    macdLine > macdSignal,
    macdHist > 0,
    sma20 > sma50,
    closes[closes.length - 1] > sma50,
  ].filter(Boolean).length;

  const trend: Technicals['trend'] = bullish >= 4 ? 'bullish' : bullish <= 1 ? 'bearish' : 'neutral';

  return {
    rsi: Math.round(rsi * 10) / 10,
    macdLine: Math.round(macdLine * 1000) / 1000,
    macdSignal: Math.round(macdSignal * 1000) / 1000,
    macdHist: Math.round(macdHist * 1000) / 1000,
    sma20: Math.round(sma20 * 100) / 100,
    sma50: Math.round(sma50 * 100) / 100,
    sma200: Math.round(sma200 * 100) / 100,
    trend,
    support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100,
  };
}
