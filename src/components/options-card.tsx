import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, Target, Clock, Activity, Zap, AlertCircle,
} from 'lucide-react';
import type { ScoredOption } from '@/types/trading';
import { cn } from '@/lib/utils';

interface OptionsCardProps {
  option: ScoredOption;
  rank: number;
}

export function OptionsCard({ option, rank }: OptionsCardProps) {
  const isCall = option.type === 'call';
  const spreadPct = option.ask > 0 ? ((option.ask - option.bid) / option.ask) * 100 : 0;
  const score = Math.round(option.score * 100);

  // Visual ring colour based on score
  const scoreColor =
    score >= 70 ? 'text-emerald-400' :
    score >= 45 ? 'text-amber-400' :
    'text-zinc-400';

  return (
    <Card className={cn(
      'relative overflow-hidden border transition-colors',
      isCall
        ? 'border-emerald-800/50 bg-gradient-to-b from-emerald-950/30 to-zinc-900/60'
        : 'border-red-800/50 bg-gradient-to-b from-red-950/30 to-zinc-900/60',
    )}>
      {/* Top accent bar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5',
        isCall ? 'bg-gradient-to-r from-emerald-500 to-emerald-700' : 'bg-gradient-to-r from-red-500 to-red-700',
      )} />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono tabular-nums">#{rank}</span>
              <Badge variant="outline" className={cn(
                'font-semibold text-xs px-2 py-0.5',
                isCall
                  ? 'border-emerald-600/70 text-emerald-400 bg-emerald-950/50'
                  : 'border-red-600/70 text-red-400 bg-red-950/50',
              )}>
                {isCall
                  ? <TrendingUp className="h-3 w-3 mr-1" />
                  : <TrendingDown className="h-3 w-3 mr-1" />
                }
                {option.type.toUpperCase()}
              </Badge>
              {option.isSynthetic && (
                <Badge variant="outline" className="text-[10px] px-1.5 border-zinc-600 text-zinc-400">
                  model
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">${option.strike}</span>
              <span className="text-xs text-zinc-500">strike</span>
            </div>
          </div>

          {/* Score ring */}
          <div className="text-center">
            <div className={cn('text-2xl font-bold font-mono tabular-nums', scoreColor)}>
              {score}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Stat icon={<Clock className="h-3 w-3" />} label="Expiry" value={option.expiry} mono />
          <Stat icon={<Zap className="h-3 w-3" />} label="DTE" value={`${option.daysToExpiry}d`} mono
            highlight={option.daysToExpiry <= 7} />
          <Stat label="Mid" value={`$${option.midPrice}`} mono highlight />
          <Stat label="Per Contract" value={`$${option.pricePerContract.toFixed(2)}`} mono />
          <Stat label="Breakeven" value={`$${option.breakeven}`} mono />
          <Stat
            label="Move Needed"
            value={option.breakevenPct != null
              ? `${option.breakevenPct > 0 ? '+' : ''}${option.breakevenPct}%`
              : '—'}
            mono
            highlight={Math.abs(option.breakevenPct ?? 0) < 3}
          />
          <Stat label="Delta" value={option.delta.toFixed(3)} mono />
          <Stat label="IV" value={`${option.impliedVolatility}%`} mono />
        </div>

        {/* Volume / OI */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Activity className="h-3 w-3 shrink-0" />
          <span className="font-mono">
            Vol <span className="text-zinc-300">{option.volume.toLocaleString()}</span>
            {' / '}
            OI <span className="text-zinc-300">{option.openInterest.toLocaleString()}</span>
          </span>
        </div>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Swing Score</span>
            <span className={cn('font-mono', scoreColor)}>{score}/100</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                score >= 70
                  ? (isCall ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400')
                  : 'bg-zinc-600',
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Rationale */}
        {option.rationale && (
          <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
            {option.rationale}
          </p>
        )}

        {/* Warnings */}
        {spreadPct > 15 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Wide spread ({spreadPct.toFixed(0)}%) — use limit at mid
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label, value, mono = false, highlight = false, icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className={cn(
        'text-sm leading-tight',
        mono && 'font-mono tabular-nums',
        highlight ? 'text-white font-semibold' : 'text-zinc-300',
      )}>
        {value}
      </div>
    </div>
  );
}
