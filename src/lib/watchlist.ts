'use client';

import type { WatchlistItem } from '@/types/trading';

const KEY = 'tradeprompt_watchlist';

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToWatchlist(item: WatchlistItem): void {
  const list = getWatchlist().filter((w) => w.ticker !== item.ticker);
  localStorage.setItem(KEY, JSON.stringify([item, ...list]));
  window.dispatchEvent(new Event('watchlist-updated'));
}

export function removeFromWatchlist(ticker: string): void {
  const list = getWatchlist().filter((w) => w.ticker !== ticker);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('watchlist-updated'));
}

export function isInWatchlist(ticker: string): boolean {
  return getWatchlist().some((w) => w.ticker === ticker);
}
