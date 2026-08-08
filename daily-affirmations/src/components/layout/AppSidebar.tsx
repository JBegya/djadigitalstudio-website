'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Grid2x2, PlusSquare, FolderOutput, Clapperboard, PieChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brand', label: 'Brand Manager', icon: Grid2x2 },
  { href: '/create', label: 'Create Advertisement', icon: PlusSquare },
  { href: '/exports', label: 'Marketing Library', icon: FolderOutput },
  { href: '/storyboards', label: 'Storyboards', icon: Clapperboard },
  { href: '/coverage', label: 'Marketing Coverage', icon: PieChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-6">
      <div className="mb-8 px-3">
        <p className="font-display text-sm font-semibold tracking-tight text-foreground">DJ&amp;A Ad Studio</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Marketing assets, in a minute.</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
