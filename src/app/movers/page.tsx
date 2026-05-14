import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Flame, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getMovers, getHistory, type Mover } from '@/lib/polygon';
import { computeTechnicals } from '@/lib/technicals';
import { computeVolMetrics } from '@/lib/vol-analysis';
import { cn } from '@/lib/utils';

interface EnrichedMover extends Mover {
  direction: 'up' | 'down';
  trend: 'bullish' | 'bearish' | 'neutral';
  rsi: number;
  hv30: number | null;
  expectedDailyMovePct: number | null;
}

async function enrich(m: Mover, direction: 'up' | 'down'): Promise<EnrichedMover> {
  const bars = await getHistory(m.ticker, 60).catch(() => []);
  const tech = bars.length >= 20
    ? computeTechnicals(bars)
    : { rsi: 50, trend: 'neutral' as const };
  const vol = bars.length >= 20 ? computeVolMetrics(bars, m.price) : null;
  return {
    ...m,
    direction,
    trend: tech.trend,
    rsi: Math.round(tech.rsi),
    hv30: vol ? Math.round(vol.hv30) : null,
    expectedDailyMovePct: vol ? Math.round(vol.expectedDailyMovePct * 10) / 10 : null,
  };
}

export default async function MoversPage() {
  const [gainersRes, losersRes] = await Promise.allSettled([
    getMovers('gainers'),
    getMovers('losers'),
  ]);

  const rawGainers = gainersRes.status === 'fulfilled' ? gainersRes.value.slice(0, 8) : [];
  const rawLosers = losersRes.status === 'fulfilled' ? losersRes.value.slice(0, 8) : [];

  const allEnriched = await Promise.allSettled([
    ...rawGainers.map((m) => enrich(m, 'up')),
    ...rawLosers.map((m) => enrich(m, 'down')),
  ]);

  const gainers = allEnriched
    .slice(0, rawGainers.length)
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((x): x is EnrichedMover => x !== null);

  const losers = allEnriched
    .slice(rawGainers.length)
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((x): x is EnrichedMover => x !== null);

  const noData = gainers.length === 0 && losers.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-400" />
            Market Movers
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Today&apos;s top gainers &amp; losers with directional bias</p>
        </div>
        <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] self-start mt-1">
          <Activity className="h-3 w-3 mr-1" />
          Delayed data · Polygon.io
        </Badge>
      </div>

      {noData ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-6 py-12 text-center space-y-3">
          <p className="text-zinc-400 text-sm">Live snapshot data requires a Polygon paid plan.</p>
          <p className="text-zinc-600 text-xs">Search for a specific ticker to get full analysis.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors mt-2">
            Go to Analyze →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gainers */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Top Gainers
            </h2>
            <div className="flex flex-col gap-2">
              {gainers.map((m) => (
                <MoverCard key={m.ticker} mover={m} />
              ))}
              {gainers.length === 0 && (
                <p className="text-zinc-600 text-sm py-4 text-center">No gainer data available</p>
              )}
            </div>
          </section>

          {/* Losers */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              <TrendingDown className="h-4 w-4 text-red-400" />
              Top Losers
            </h2>
            <div className="flex flex-col gap-2">
              {losers.map((m) => (
                <MoverCard key={m.ticker} mover={m} />
              ))}
              {losers.length === 0 && (
                <p className="text-zinc-600 text-sm py-4 text-center">No loser data available</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Callout */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">
          Track these stocks and get earnings alerts from the dashboard.
        </p>
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Open Dashboard →
        </Link>
      </div>
    </div>
  );
}

function MoverCard({ mover: m }: { mover: EnrichedMover }) {
  const isGainer = m.direction === 'up';
  const TrendIcon = m.trend === 'bullish' ? TrendingUp : m.trend === 'bearish' ? TrendingDown : Minus;

  return (
    <Link
      href={`/ticker/${m.ticker}`}
      className={cn(
        'block rounded-xl border px-4 py-3.5 hover:border-zinc-600 transition-colors space-y-2',
        isGainer
          ? 'border-emerald-900/40 bg-emerald-950/10 hover:bg-emerald-950/20'
          : 'border-red-900/40 bg-red-950/10 hover:bg-red-950/20',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-white text-base">{m.ticker}</span>
        <span className={cn('font-mono font-semibold text-sm tabular-nums', isGainer ? 'text-emerald-400' : 'text-red-400')}>
          {isGainer ? '+' : ''}{m.changePct.toFixed(2)}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-mono">
          ${m.price.toFixed(2)} · vol {(m.volume / 1_000_000).toFixed(1)}M
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5',
            m.trend === 'bullish' ? 'border-emerald-700/60 text-emerald-400 bg-emerald-950/30' :
            m.trend === 'bearish' ? 'border-red-700/60 text-red-400 bg-red-950/30' :
            'border-zinc-600 text-zinc-400',
          )}
        >
          <TrendIcon className="h-2.5 w-2.5 mr-0.5" />
          {m.trend.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
        <span className={cn(m.rsi > 70 ? 'text-red-400' : m.rsi < 30 ? 'text-emerald-400' : '')}>
          RSI {m.rsi}
        </span>
        {m.hv30 != null && <span>HV {m.hv30}%</span>}
        {m.expectedDailyMovePct != null && <span>±{m.expectedDailyMovePct}%/day</span>}
      </div>
    </Link>
  );
}
