'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const nav = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/actions', label: 'Actions', icon: '◈' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-surface-1">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-accent-purple text-2xl">◈</span>
          <div>
            <p className="font-display font-bold text-sm text-white leading-tight tracking-wider">AGENTIC</p>
            <p className="font-display font-bold text-sm text-accent-cyan leading-tight tracking-wider">WALLET</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">devnet observer</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
              pathname === item.href
                ? 'bg-accent-purple/20 text-white border border-accent-purple/40 glow-purple'
                : 'text-slate-400 hover:text-white hover:bg-surface-3'
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-mono">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-green status-live" />
          <span className="text-xs text-slate-500 font-mono">devnet</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">⚠ prototype only</p>
      </div>
    </aside>
  );
}
