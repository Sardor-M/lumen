'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const learnTopics = [
    { href: '/dashboard/learn', label: 'Overview', exact: true },
    { href: '/dashboard/learn/algorithms', label: 'Algorithms' },
    { href: '/dashboard/learn/graph-density', label: 'Graph density' },
    { href: '/dashboard/learn/memory', label: 'Memory' },
];

export function LearnNav() {
    const pathname = usePathname();
    return (
        <nav className="border-border flex gap-1 overflow-x-auto border-b">
            {learnTopics.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        className={cn(
                            'relative -mb-px px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                            active
                                ? 'border-foreground text-foreground border-b-2'
                                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
                        )}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </nav>
    );
}
