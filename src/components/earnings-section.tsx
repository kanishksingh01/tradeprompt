import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EarningsRecord } from '@/types/trading';
import { cn } from '@/lib/utils';

interface EarningsSectionProps {
  records: EarningsRecord[];
  nextEarnings?: string;
}

export function EarningsSection({ records, nextEarnings }: EarningsSectionProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            Earnings History
          </CardTitle>
          {nextEarnings ? (
            <Badge variant="outline" className="border-amber-700 text-amber-400 bg-amber-950/30 text-xs">
              Next est. {nextEarnings}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-zinc-500">No earnings data available</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 6).map((r) => (
              <EarningsRow key={r.fiscalDateEnding} record={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EarningsRow({ record: r }: { record: EarningsRecord }) {
  const beat = r.surprisePercentage != null ? r.surprisePercentage > 0 : null;
  const Icon = beat === null ? Minus : beat ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
      <Icon className={cn(
        'h-4 w-4 shrink-0',
        beat === null ? 'text-zinc-500' : beat ? 'text-emerald-400' : 'text-red-400',
      )} />
      <span className="font-mono text-xs text-zinc-400 w-24 shrink-0">{r.fiscalDateEnding}</span>
      <div className="flex items-center gap-4 flex-1">
        {r.reportedEPS != null ? (
          <span className="text-sm font-mono text-white">
            EPS {r.reportedEPS > 0 ? '+' : ''}{r.reportedEPS.toFixed(2)}
          </span>
        ) : null}
        {r.estimatedEPS != null ? (
          <span className="text-xs text-zinc-500">est {r.estimatedEPS.toFixed(2)}</span>
        ) : null}
      </div>
      {r.surprisePercentage != null ? (
        <Badge variant="outline" className={cn(
          'text-xs font-mono ml-auto',
          beat
            ? 'border-emerald-700 text-emerald-400 bg-emerald-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30',
        )}>
          {beat ? '+' : ''}{r.surprisePercentage.toFixed(1)}%
        </Badge>
      ) : null}
    </div>
  );
}
