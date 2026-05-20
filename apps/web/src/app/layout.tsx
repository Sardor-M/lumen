import type { Metadata } from 'next';
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
    title: 'Lumen — Knowledge Compiler',
    description: 'Local-first knowledge graph from your reading.',
};

/**
 * Pre-hydration theme script. Reads the persisted choice (or falls back to
 * the OS preference) and applies the `.dark` class + `color-scheme` before
 * React paints, so there's no light-to-dark flash on dark-mode reloads.
 */
const themeInitScript = `(() => {
  try {
    const stored = window.localStorage.getItem('lumen-theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const wantDark = stored === 'dark' || ((stored === null || stored === 'system') && sysDark);
    document.documentElement.classList.toggle('dark', wantDark);
    document.documentElement.style.colorScheme = wantDark ? 'dark' : 'light';
  } catch {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn('font-sans', geist.variable, geistMono.variable)}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </head>
            <body className="bg-background text-foreground min-h-screen antialiased">
                <TooltipProvider delay={0}>{children}</TooltipProvider>
            </body>
        </html>
    );
}
