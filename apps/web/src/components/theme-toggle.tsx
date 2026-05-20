'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lumen-theme';

function readStored(): Theme {
    if (typeof window === 'undefined') return 'system';
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
    return 'system';
}

function systemPrefersDark(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme): void {
    const wantDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
    document.documentElement.classList.toggle('dark', wantDark);
    document.documentElement.style.colorScheme = wantDark ? 'dark' : 'light';
}

/**
 * Three-state theme switch (light · dark · system) rendered as a segmented
 * pill. Persists the choice in localStorage; an inline `<script>` in the root
 * layout reads the same key pre-hydration to prevent the FOUC flash. The
 * `system` option lives below the OS pref, so users on auto-mode follow it.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = readStored();
        setTheme(stored);
        setMounted(true);
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
            if (readStored() === 'system') applyTheme('system');
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    function choose(next: Theme) {
        setTheme(next);
        if (next === 'system') {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
        applyTheme(next);
    }

    /** Render a stable placeholder until mounted so SSR + first paint match. */
    if (!mounted) {
        return (
            <div
                aria-hidden
                className={cn('rounded-md', compact ? 'h-7 w-[72px]' : 'h-7 w-[78px]')}
            />
        );
    }

    const options: { value: Theme; icon: typeof Sun; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'system', icon: Monitor, label: 'System' },
        { value: 'dark', icon: Moon, label: 'Dark' },
    ];

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className={cn('inline-flex items-center gap-0.5', compact ? 'h-7' : 'h-7')}
        >
            {options.map((o) => {
                const active = theme === o.value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={o.label}
                        title={o.label}
                        onClick={() => choose(o.value)}
                        className={cn(
                            'focus-visible:ring-ring/40 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none',
                            active
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50',
                        )}
                    >
                        <o.icon className="h-3.5 w-3.5" />
                    </button>
                );
            })}
        </div>
    );
}
