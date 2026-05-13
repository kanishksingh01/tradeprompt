import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Clock, Activity } from 'lucide-react';
import type { ScoredOption } from '@/types/trading';
import { cn } from '@/lib/utils';

interface OptionsCardProps {
  option: ScoredOption;
  rank: number;
}

export function OptionsCard({ option, rank }: OptionsCardProps) {
  const isCall = option.type === 'call';
  const spreadPct = option.ask > 0 ? ((option.ask - option.bid) / option.ask) * 100 : 0;

  return (
    <Card className={cn(
      'border bg-zinc-900/50 relative overflow-hidden',
      isCall ? 'border-emerald-800/60' : 'border-red-800/60',
    )}>
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5',
        isCall ? 'bg-emerald-500' : 'bg-red-500',
      )} />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">#{rank}</span>
            <Badge variant="outline" className={cn(
              'font-semibold text-xs',
              isCall
                ? 'border-emerald-600 text-emerald-400 bg-emerald-950/40'
                : 'border-red-600 text-red-400 bg-red-950/40',
            )}>
              {isCall ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {option.type.toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold font-mono text-white">${option.strike}</div>
            <div className="text-xs text-zinc-400">strike</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat icon={<Clock className="h-3 w-3" />} label="Expiry" value={option.expiry} mono />
          <Stat icon={<Clock className="h-3 w-3" />} label="DTE" value={`${option.daysToExpiry}d`} mono />
          <Stat label="Mid Price" value={`$${option.midPrice}`} mono highlight />
          <Stat label="Per Contract" value={`$${option.pricePerContract.toFixed(2)}`} mono />
          <Stat label="Breakeven" value={`$${option.breakeven}${option.breakevenPct != null ? ` (${option.breakevenPct > 0 ? '+' : ''}${option.breakevenPct}%)` : ''}`} mono />
          <Stat label="Delta" value={option.delta.toFixed(3)} mono />
          <Stat label="IV" value={`${option.impliedVolatility}%`} mono />
          <Stat icon={<Activity className="h-3 w-3" />} label="Vol / OI" value={`${option.volume.toLocaleString()} / ${option.openInterest.toLocaleString()}`} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Target className="h-3 w-3 text-zinc-500 shrink-0" />
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
            <div
              className={cn('h-1.5 rounded-full', isCall ? 'bg-emerald-500' : 'bg-red-500')}
              style={{ width: `${Math.round(option.score * 100)}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 font-mono">{Math.round(option.score * 100)}pts</span>
        </div>

        {spreadPct > 15 && (
          <p className="text-xs text-amber-400/80">Wide spread ({spreadPct.toFixed(0)}%) — use limit orders at mid</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label, value, mono = false, highlight = false,
  icon,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-zinc-500 mb-0.5">
        {icon}
        {label}
      </div>
      <div className={cn('text-sm', mono && 'font-mono', highlight ? 'text-white font-semibold' : 'text-zinc-300')}>
        {value}
      </div>
    </div>
  );
}
