export interface Quote {
  ticker: string;
  companyName?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
  volume: number;
  vwap: number;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Technicals {
  rsi: number;
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  sma20: number;
  sma50: number;
  sma200: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  support: number;
  resistance: number;
}

export interface ScoredOption {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  midPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  score: number;
  pricePerContract: number;
  breakeven: number;
  breakevenPct?: number;
  daysToExpiry: number;
  isSynthetic?: boolean;  // true when generated from historical vol (no live options feed)
  rationale?: string;
  confidence?: number;   // 0–100, computed by Claude from technicals + news + earnings
  confidenceLabel?: string;
}

export interface EarningsRecord {
  fiscalDateEnding: string;
  reportedDate?: string;
  reportedEPS?: number;
  estimatedEPS?: number;
  surprise?: number;
  surprisePercentage?: number;
}

export interface TickerData {
  quote: Quote;
  technicals: Technicals;
  topOptions: ScoredOption[];
  recentEarnings: EarningsRecord[];
  nextEarnings?: string;
  error?: string;
}

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  addedAt: string;
  nextEarnings?: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
}
