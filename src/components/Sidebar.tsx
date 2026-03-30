'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const links = [
    { href: '/', label: 'Home', icon: '⌂' },
    { href: '/knowledge', label: 'Knowledge', icon: '📚' },
    { href: '/mind', label: 'Josh\'s Mind', icon: '🧠' },
    { href: '/thoughts', label: 'Thoughts', icon: '💭' },
    { href: '/dispatch', label: 'Dispatch', icon: '📨' },
    { href: '/tasks', label: 'Tasks', icon: '✓' },
    { href: '/drift', label: 'Drift Gauge', icon: '⚖' },
  ];

  return (
    <aside className="w-64 bg-neutral-800 border-r border-neutral-700 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-neutral-700">
        <div className="text-2xl font-bold text-amber-500 mb-1">PEQUENO</div>
        <div className="text-xs text-neutral-400 uppercase tracking-wide">The Human Door</div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(link.href)
                ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-500'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/50'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-700 text-xs text-neutral-500">
        <div className="mb-2">Owner: Josh</div>
        <div>System: Pequeno</div>
      </div>
    </aside>
  );
}
