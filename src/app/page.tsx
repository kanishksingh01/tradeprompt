import { SearchBar } from '@/components/search-bar';
import { TrendingUp, BarChart2, BookmarkPlus, Zap } from 'lucide-react';

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'META', 'MSFT', 'AMZN', 'SPY', 'QQQ'];

const FEATURES = [
  {
    icon: BarChart2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-900/50',
    title: 'Chart Breakdown',
    desc: 'RSI, MACD, SMAs, support & resistance levels',
  },
  {
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40',
    border: 'border-blue-900/50',
    title: '3-Day Swing Picks',
    desc: 'Scored calls & puts optimised for 3-day holds',
  },
  {
    icon: BookmarkPlus,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-900/50',
    title: 'Earnings Tracker',
    desc: 'Upcoming dates, EPS history, surprise trends',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 py-10">

      {/* Hero */}
      <div className="text-center space-y-5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 text-xs font-medium mb-2">
          <Zap className="h-3 w-3" />
          AI-powered options analysis
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="text-white">Trade</span>
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Prompt</span>
        </h1>

        <p className="text-zinc-400 text-lg leading-relaxed">
          Enter any ticker for a full chart breakdown, 3-day swing options picks,
          and AI-narrated earnings analysis.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-lg">
        <SearchBar autoFocus />
      </div>

      {/* Quick tickers */}
      <div className="flex flex-wrap justify-center gap-2">
        {POPULAR.map((t) => (
          <a
            key={t}
            href={`/ticker/${t}`}
            className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-600 text-zinc-300 hover:text-white text-sm font-mono transition-all duration-150"
          >
            {t}
          </a>
        ))}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`rounded-xl border ${f.border} ${f.bg} p-5 space-y-3 backdrop-blur-sm`}
          >
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900/80 border border-zinc-800 ${f.color}`}>
              <f.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white mb-1">{f.title}</div>
              <div className="text-xs text-zinc-400 leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
