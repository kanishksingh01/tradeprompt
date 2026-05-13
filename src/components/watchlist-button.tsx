'use client';

import { useState, useEffect } from 'react';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';
import type { WatchlistItem } from '@/types/trading';

interface WatchlistButtonProps {
  item: Omit<WatchlistItem, 'addedAt'>;
}

export function WatchlistButton({ item }: WatchlistButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isInWatchlist(item.ticker));
    function onUpdate() { setSaved(isInWatchlist(item.ticker)); }
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, [item.ticker]);

  function toggle() {
    if (saved) {
      removeFromWatchlist(item.ticker);
    } else {
      addToWatchlist({ ...item, addedAt: new Date().toISOString() });
    }
  }

  return (
    <Button
      variant={saved ? 'secondary' : 'outline'}
      size="sm"
      onClick={toggle}
      className="gap-1.5 border-zinc-700"
    >
      {saved ? (
        <><BookmarkCheck className="h-4 w-4 text-emerald-400" /> Saved</>
      ) : (
        <><BookmarkPlus className="h-4 w-4" /> Add to Dashboard</>
      )}
    </Button>
  );
}
