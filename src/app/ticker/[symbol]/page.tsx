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
      {/* Header card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-3xl font-bold font-mono text-white tracking-tight">{ticker}</h1>
              <Badge variant="outline" className={cn(
                'text-xs font-semibold',
                tech.trend === 'bullish' ? 'border-emerald-700/70 text-emerald-400 bg-emerald-950/40' :
                tech.trend === 'bearish' ? 'border-red-700/70 text-red-400 bg-red-950/40' :
                'border-zinc-600 text-zinc-400',
              )}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {tech.trend.toUpperCase()}
              </Badge>
            </div>
            {overview.name && <p className="text-zinc-300 text-sm font-medium">{overview.name}</p>}
            {overview.sector && (
              <p className="text-xs text-zinc-500">
                {overview.sector}{overview.industry ? ` · ${overview.industry}` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-white tabular-nums">
                ${quote.price.toFixed(2)}
              </div>
              <div className={cn('text-sm font-mono tabular-nums font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
                {isUp ? '+' : ''}{quote.change.toFixed(2)}{' '}
                <span className="text-xs opacity-80">({isUp ? '+' : ''}{quote.changePct.toFixed(2)}%)</span>
              </div>
            </div>
            <WatchlistButton item={{
              ticker,
              companyName: overview.name || ticker,
              nextEarnings: earnings.nextEarnings,
            }} />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Volume', value: quote.volume.toLocaleString(), accent: '' },
          { label: 'VWAP', value: `$${quote.vwap.toFixed(2)}`, accent: '' },
          {
            label: 'RSI (14)',
            value: tech.rsi.toFixed(1),
            accent: tech.rsi > 70 ? 'text-red-400' : tech.rsi < 30 ? 'text-emerald-400' : '',
          },
          { label: 'Next Earnings', value: earnings.nextEarnings || '—', accent: '' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={cn('font-mono text-sm font-semibold tabular-nums', s.accent || 'text-white')}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ChartWidget ticker={ticker} />

      {/* SMA levels */}
      <div>
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2.5">Moving Averages</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'SMA 20', value: tech.sma20 },
            { label: 'SMA 50', value: tech.sma50 },
            { label: 'SMA 200', value: tech.sma200 },
          ].map((s) => {
            const above = quote.price > s.value;
            return (
              <div key={s.label} className={cn(
                'rounded-lg border px-4 py-3',
                above ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-red-900/40 bg-red-950/20',
              )}>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="font-mono text-sm text-white font-semibold tabular-nums">${s.value.toFixed(2)}</div>
                <div className={cn('text-[10px] font-medium mt-1', above ? 'text-emerald-400' : 'text-red-400')}>
                  {above ? '▲ Price above' : '▼ Price below'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* AI Analysis */}
      <AnalysisStream ticker={ticker} />

      <Separator className="bg-zinc-800" />

      {/* Options Picks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
            3-Day Swing Picks
          </h2>
          <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
            3–21 DTE · support/resistance scored
          </span>
        </div>
        {topOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No liquid options found in the 3–21 DTE window. Options data may require a Polygon paid plan.
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
