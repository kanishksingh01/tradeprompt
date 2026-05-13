'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, LayoutDashboard, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', icon: BarChart2, label: 'Analyze' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-900/60 group-hover:border-emerald-700/80 transition-colors">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">
            Trade<span className="text-emerald-400">Prompt</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, icon: Icon, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
