import type { Metadata } from 'next';
import { Geist, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    style: ['normal', 'italic'],
    variable: '--font-display',
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-mono',
});

export const metadata: Metadata = {
    title: 'Lumen — The persistent brain for your agent.',
    description:
        'A local-first knowledge substrate for AI agents. Articles, papers, repos, and trajectories — queryable by Claude Code, Cursor, and any MCP client. One SQLite file. E2E-encrypted sync across your devices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
        >
            <body>{children}</body>
        </html>
    );
}
