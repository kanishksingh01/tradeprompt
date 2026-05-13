import { notFound } from 'next/navigation';
import { getQuote, getHistory } from '@/lib/polygon';
import { getOptionsChain } from '@/lib/yahoo-finance';
import { getEarnings, getCompanyOverview } from '@/lib/alpha-vantage';
import { computeTechnicals } from '@/lib/technicals';
import { scoreOptions } from '@/lib/options-screener';
import { computeVolMetrics, generateSyntheticOptions } from '@/lib/vol-analysis';
import { ChartWidget } from '@/components/chart-widget';
import { OptionsCard } from '@/components/options-card';
import { EarningsSection } from '@/components/earnings-section';
import { WatchlistButton } from '@/components/watchlist-button';
import { AnalysisStream } from '@/components/analysis-stream';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ symbol: string }>;
}

export default async function TickerPage({ params }: Props) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();

  const [quoteResult, historyResult, optionsResult, earningsResult, overviewResult] =
    await Promise.allSettled([
      getQuote(ticker),
      getHistory(ticker, 250),
      getOptionsChain(ticker),
      getEarnings(ticker),
      getCompanyOverview(ticker),
    ]);

  if (quoteResult.status === 'rejected') {
    const msg = quoteResult.reason?.message || '';
    if (msg.includes('API key') || msg.includes('not set')) {
      throw new Error('POLYGON_API_KEY is not configured. Add your key to .env.local');
    }
    notFound();
  }

  const quote = quoteResult.value;
  const bars = historyResult.status === 'fulfilled' ? historyResult.value : [];
  const yfData = optionsResult.status === 'fulfilled' ? optionsResult.value : { contracts: [], currentPrice: 0, expirationDates: [] };
  const earnings = earningsResult.status === 'fulfilled' ? earningsResult.value : { recent: [], nextEarnings: undefined };
  const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : {};

  const tech = bars.length >= 20
    ? computeTechnicals(bars)
    : { rsi: 50, macdLine: 0, macdSignal: 0, macdHist: 0, sma20: quote.price, sma50: quote.price, sma200: quote.price, trend: 'neutral' as const, support: quote.low, resistance: quote.high };

  const livePrice = yfData.currentPrice || quote.price;
  const liveOptions = scoreOptions(yfData.contracts, livePrice, tech.trend, {
    support: tech.support,
    resistance: tech.resistance,
  });

  // Fall back to vol-model picks when live options chain is unavailable
  const volMetrics = bars.length >= 20 ? computeVolMetrics(bars, livePrice) : null;
  const topOptions: import('@/types/trading').ScoredOption[] = liveOptions.length > 0
    ? liveOptions
    : volMetrics
      ? generateSyntheticOptions(livePrice, volMetrics, tech.trend).map((s) => ({
          strike: s.strike,
          expiry: s.expiry,
          type: s.type,
          bid: s.estimatedMid * 0.95,
          ask: s.estimatedMid * 1.05,
          midPrice: s.estimatedMid,
          volume: 0,
          openInterest: 0,
          impliedVolatility: s.impliedVolatility,
          delta: s.delta,
          score: 0,
          pricePerContract: s.pricePerContract,
          breakeven: s.breakeven,
          breakevenPct: s.breakevenPct,
          daysToExpiry: s.daysToExpiry,
          isSynthetic: true,
          rationale: s.rationale,
        }))
      : [];
  const isUp = quote.changePct >= 0;

  const TrendIcon = tech.trend === 'bullish' ? TrendingUp : tech.trend === 'bearish' ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-white">{ticker}</h1>
            <Badge variant="outline" className={cn(
              'text-xs',
              tech.trend === 'bullish' ? 'border-emerald-700 text-emerald-400' :
              tech.trend === 'bearish' ? 'border-red-700 text-red-400' : 'border-zinc-600 text-zinc-400',
            )}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {tech.trend.toUpperCase()}
            </Badge>
          </div>
          {overview.name ? <p className="text-zinc-400 text-sm mt-0.5">{overview.name}</p> : null}
          {overview.sector ? <p className="text-xs text-zinc-500">{overview.sector} · {overview.industry}</p> : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-white">${quote.price.toFixed(2)}</div>
            <div className={cn('text-sm font-mono', isUp ? 'text-emerald-400' : 'text-red-400')}>
              {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePct.toFixed(2)}%)
            </div>
          </div>
          <WatchlistButton item={{
            ticker,
            companyName: overview.name || ticker,
            nextEarnings: earnings.nextEarnings,
          }} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Volume', value: quote.volume.toLocaleString() },
          { label: 'VWAP', value: `$${quote.vwap.toFixed(2)}` },
          { label: 'RSI (14)', value: tech.rsi.toString() },
          { label: 'Next Earnings', value: earnings.nextEarnings || '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
            <div className="font-mono text-sm text-white font-medium">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ChartWidget ticker={ticker} />

      {/* SMA levels */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'SMA 20', value: tech.sma20, vs: quote.price },
          { label: 'SMA 50', value: tech.sma50, vs: quote.price },
          { label: 'SMA 200', value: tech.sma200, vs: quote.price },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
            <div className="font-mono text-sm text-white font-medium">${s.value.toFixed(2)}</div>
            <div className={cn('text-xs font-mono mt-0.5', quote.price > s.value ? 'text-emerald-400' : 'text-red-400')}>
              {quote.price > s.value ? 'Price above' : 'Price below'}
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-zinc-800" />

      {/* AI Analysis */}
      <AnalysisStream ticker={ticker} />

      <Separator className="bg-zinc-800" />

      {/* Options Picks */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-3">
          3-Day Swing Picks
        </h2>
        {topOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No liquid options found in the 14–75 DTE window. Options data may require a Polygon paid plan.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topOptions.map((opt, i) => (
              <OptionsCard key={`${opt.type}-${opt.strike}-${opt.expiry}`} option={opt} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-zinc-800" />

      {/* Earnings */}
      <EarningsSection records={earnings.recent} nextEarnings={earnings.nextEarnings} />
    </div>
  );
}
