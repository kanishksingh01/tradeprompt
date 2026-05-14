'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ScanLine, TrendingUp, TrendingDown, Minus, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRESETS: Record<string, string[]> = {
  'Mega Cap': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META'],
  'FAANG+': ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL', 'TSLA', 'AMD'],
  Growth: ['COIN', 'PLTR', 'SNOW', 'CRWD', 'DDOG', 'NET', 'MDB'],
  ETFs: ['SPY', 'QQQ', 'IWM', 'XLK', 'XLE', 'GLD', 'TLT'],
};

interface ScreenerRow {
  ticker: string;
  price: number;
  changePct: number;
  volume: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  rsi: number;
  expectedSwingMovePct: number | null;
  topPick: {
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    daysToExpiry: number;
  } | null;
}

export default function ScreenerPage() {
  const [activePreset, setActivePreset] = useState<string | null>('Mega Cap');
  const [customInput, setCustomInput] = useState('');
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [results, setResults] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const currentTickers = activePreset
    ? PRESETS[activePreset]
    : customTickers.length > 0
    ? customTickers
    : PRESETS['Mega Cap'];

  const addCustom = () => {
    const parsed = customInput
      .toUpperCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    setCustomTickers((prev) => [...new Set([...prev, ...parsed])].slice(0, 20));
    setCustomInput('');
    setActivePreset(null);
  };

  const removeCustom = (t: string) => {
    setCustomTickers((prev) => prev.filter((x) => x !== t));
  };

  const scan = useCallback(async () => {
    const tickers = activePreset ? PRESETS[activePreset] : customTickers;
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/screener?tickers=${tickers.join(',')}`);
      if (!res.ok) throw new Error('Scan failed');
      const data: ScreenerRow[] = await res.json();
      const sorted = [...data].sort((a, b) => {
        const order = { bullish: 0, neutral: 1, bearish: 2 };
        if (order[a.trend] !== order[b.trend]) return order[a.trend] - order[b.trend];
        return Math.abs(b.changePct) - Math.abs(a.changePct);
      });
      setResults(sorted);
      setScanned(true);
    } catch {
      setError('Failed to fetch screener data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [activePreset, customTickers]);

  const trendBadge = (trend: string) => {
    if (trend === 'bullish') return (
      <Badge variant="outline" className="border-emerald-700/60 text-emerald-400 bg-emerald-950/30 text-[10px] px-1.5">
        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />BULL
      </Badge>
    );
    if (trend === 'bearish') return (
      <Badge variant="outline" className="border-red-700/60 text-red-400 bg-red-950/30 text-[10px] px-1.5">
        <TrendingDown className="h-2.5 w-2.5 mr-0.5" />BEAR
      </Badge>
    );
    return (
      <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-[10px] px-1.5">
        <Minus className="h-2.5 w-2.5 mr-0.5" />NEUT
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-zinc-400" />
          Options Screener
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Scan tickers for 3-day swing setups</p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => { setActivePreset(name); setCustomTickers([]); }}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150',
              activePreset === name
                ? 'bg-zinc-700 border-zinc-600 text-white'
                : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
            )}
          >
            {name}
          </button>
        ))}
        <button
          onClick={() => setActivePreset(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150',
            activePreset === null
              ? 'bg-zinc-700 border-zinc-600 text-white'
              : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
          )}
        >
          Custom
        </button>
      </div>

      {/* Custom ticker input */}
      {activePreset === null && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
              placeholder="AAPL, NVDA, TSLA..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={addCustom}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Add
            </button>
          </div>
          {customTickers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customTickers.map((t) => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">
                  {t}
                  <button onClick={() => removeCustom(t)} className="text-zinc-500 hover:text-zinc-200">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={scan}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-sm transition-all duration-150"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning {currentTickers.length} tickers…
          </>
        ) : (
          <>
            <ScanLine className="h-4 w-4" />
            Scan {currentTickers.length} Tickers
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Results table */}
      {scanned && !loading && results.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['TICKER', 'PRICE', 'CHANGE', 'TREND', 'RSI', '3D SWING', 'TOP PICK', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.ticker} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/ticker/${row.ticker}`} className="font-mono font-bold text-white hover:text-emerald-400 transition-colors">
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-200">${row.price.toFixed(2)}</td>
                  <td className={cn('px-4 py-3 font-mono font-medium tabular-nums', row.changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">{trendBadge(row.trend)}</td>
                  <td className={cn('px-4 py-3 font-mono tabular-nums', row.rsi > 70 ? 'text-red-400' : row.rsi < 30 ? 'text-emerald-400' : 'text-zinc-300')}>
                    {row.rsi.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400 tabular-nums">
                    {row.expectedSwingMovePct != null ? `±${row.expectedSwingMovePct}%` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.topPick ? (
                      <span className={row.topPick.type === 'call' ? 'text-emerald-400' : 'text-red-400'}>
                        {row.topPick.type.toUpperCase()} ${row.topPick.strike} · {row.topPick.expiry}
                      </span>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ticker/${row.ticker}`} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors whitespace-nowrap">
                      Analyze →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scanned && !loading && results.length === 0 && (
        <p className="text-center text-zinc-500 py-12">No results returned. Check your API key or try again.</p>
      )}
    </div>
  );
}
