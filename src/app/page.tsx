import { SearchBar } from '@/components/search-bar';
import { TrendingUp, BarChart2, BookmarkPlus } from 'lucide-react';

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'META', 'MSFT', 'AMZN', 'SPY', 'QQQ'];

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          TradePrompt
        </h1>
        <p className="text-zinc-400 text-lg max-w-md">
          Enter any ticker or company name for a full chart breakdown, options flow, and earnings analysis.
        </p>
      </div>

      <SearchBar autoFocus />

      <div className="flex flex-wrap justify-center gap-2">
        {POPULAR.map((t) => (
          <a
            key={t}
            href={`/ticker/${t}`}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-mono transition-colors"
          >
            {t}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-2xl w-full mt-4">
        {[
          { icon: <BarChart2 className="h-5 w-5 text-emerald-400" />, title: 'Chart Breakdown', desc: 'RSI, MACD, SMAs, support & resistance' },
          { icon: <TrendingUp className="h-5 w-5 text-blue-400" />, title: 'Options Picks', desc: '2–3 scored calls or puts with AI narration' },
          { icon: <BookmarkPlus className="h-5 w-5 text-amber-400" />, title: 'Earnings Tracker', desc: 'Dashboard with upcoming earnings dates' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            {f.icon}
            <div className="font-semibold text-sm text-white">{f.title}</div>
            <div className="text-xs text-zinc-400">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
