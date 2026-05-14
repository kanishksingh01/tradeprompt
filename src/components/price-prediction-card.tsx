import type { PredictionResult } from '@/lib/price-prediction';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  prediction: PredictionResult;
  currentPrice: number;
}

export function PricePredictionCard({ prediction, currentPrice }: Props) {
  const { day10, day25, annualisedHV } = prediction;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Price Forecast</h3>
        <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">
          Linear regression · momentum-adjusted
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto">HV: {annualisedHV}%</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[day10, day25].map((pred) => {
          const isUp = pred.changePct >= 0;
          const TrendIcon =
            pred.trend === 'up' ? TrendingUp : pred.trend === 'down' ? TrendingDown : Minus;
          const confidenceColor =
            pred.confidence === 'High'
              ? 'text-emerald-400'
              : pred.confidence === 'Moderate'
              ? 'text-amber-400'
              : 'text-zinc-400';

          const range = pred.bullTarget - pred.bearTarget;
          const currentPct =
            range > 0 ? ((currentPrice - pred.bearTarget) / range) * 100 : 50;
          const targetPct =
            range > 0 ? ((pred.momentumAdjusted - pred.bearTarget) / range) * 100 : 50;

          return (
            <div
              key={pred.horizon}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-300">
                    {pred.horizon}-Day Target
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{pred.targetDate}</span>
              </div>

              <div className="flex items-end gap-3">
                <div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    ${pred.momentumAdjusted}
                  </div>
                  <div
                    className={cn(
                      'text-sm font-mono font-medium tabular-nums',
                      isUp ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {isUp ? '+' : ''}
                    {pred.changePct}%
                  </div>
                </div>
                <TrendIcon
                  className={cn(
                    'h-5 w-5 mb-1',
                    pred.trend === 'up'
                      ? 'text-emerald-400'
                      : pred.trend === 'down'
                      ? 'text-red-400'
                      : 'text-zinc-400',
                  )}
                />
              </div>

              {/* Bull/Bear range */}
              <div className="space-y-1.5">
                <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-700/40 to-emerald-700/40" />
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/40"
                    style={{ left: `${Math.max(2, Math.min(98, currentPct))}%` }}
                  />
                  <div
                    className={cn(
                      'absolute top-0 bottom-0 w-0.5',
                      isUp ? 'bg-emerald-400' : 'bg-red-400',
                    )}
                    style={{ left: `${Math.max(2, Math.min(98, targetPct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>
                    Bear:{' '}
                    <span className="font-mono text-red-400">${pred.bearTarget}</span>
                  </span>
                  <span>
                    Bull:{' '}
                    <span className="font-mono text-emerald-400">${pred.bullTarget}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">R² {pred.rSquared}</span>
                <span className={cn('font-medium', confidenceColor)}>
                  {pred.confidence} confidence
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
