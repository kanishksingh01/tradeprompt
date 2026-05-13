'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWatchlist, removeFromWatchlist } from '@/lib/watchlist';
import type { WatchlistItem } from '@/types/trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, ExternalLink, Trash2, LayoutDashboard } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO, isBefore, addDays } from 'date-fns';

export default function DashboardPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setWatchlist(getWatchlist());
    function onUpdate() { setWatchlist(getWatchlist()); }
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, []);

  const upcoming = watchlist
    .filter((w) => w.nextEarnings)
    .map((w) => ({ ...w, date: parseISO(w.nextEarnings!) }))
    .filter((w) => w.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const soon = (dateStr: string) => {
    const d = parseISO(dateStr);
    return isBefore(d, addDays(new Date(), 14));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-zinc-400" />
            Dashboard
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Track your watchlist and upcoming earnings dates</p>
        </div>
        <div className="w-full max-w-sm">
          <SearchBar />
        </div>
      </div>

      {/* Earnings Calendar */}
      {upcoming.length > 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              Upcoming Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.map((w) => (
                <div key={w.ticker} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <Link href={`/ticker/${w.ticker}`} className="font-mono font-semibold text-emerald-400 hover:text-emerald-300 w-16 shrink-0">
                    {w.ticker}
                  </Link>
                  <span className="text-sm text-zinc-300 flex-1 truncate">{w.companyName}</span>
                  <span className="font-mono text-sm text-zinc-400">{w.nextEarnings}</span>
                  <Badge variant="outline" className={cn(
                    'text-xs shrink-0',
                    soon(w.nextEarnings!)
                      ? 'border-amber-700 text-amber-400 bg-amber-950/30'
                      : 'border-zinc-700 text-zinc-400',
                  )}>
                    {formatDistanceToNow(parseISO(w.nextEarnings!), { addSuffix: true })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Separator className="bg-zinc-800" />

      {/* Watchlist */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-4">
          Watchlist ({watchlist.length})
        </h2>

        {watchlist.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-zinc-500">No tickers saved yet.</p>
            <p className="text-zinc-600 text-sm">Search for a ticker and click "Add to Dashboard"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((w) => (
              <Card key={w.ticker} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Link href={`/ticker/${w.ticker}`} className="flex items-center gap-1.5 group">
                        <span className="font-mono font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                          {w.ticker}
                        </span>
                        <ExternalLink className="h-3 w-3 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                      </Link>
                      <p className="text-xs text-zinc-400 truncate max-w-[180px]">{w.companyName}</p>
                      {w.nextEarnings ? (
                        <Badge variant="outline" className={cn(
                          'text-xs mt-1',
                          soon(w.nextEarnings)
                            ? 'border-amber-700 text-amber-400 bg-amber-950/30'
                            : 'border-zinc-700 text-zinc-500',
                        )}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {w.nextEarnings}
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 shrink-0"
                      onClick={() => removeFromWatchlist(w.ticker)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-600 mt-3">
                    Added {formatDistanceToNow(parseISO(w.addedAt), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
