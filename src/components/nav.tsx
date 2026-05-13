'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, LayoutDashboard, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <span>TradePrompt</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              path === '/' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
            )}
          >
            <BarChart2 className="h-4 w-4" />
            Analyze
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              path === '/dashboard' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
