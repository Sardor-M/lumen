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
apps/cli/src/store/chunks.ts
@@ -15,10 +15,10 @@
 export function getChunksBySource(sourceId: string, limit?: number): Chunk[] {
-    if (limit === undefined) {
-        return getDb()
-            .prepare('SELECT * FROM chunks WHERE source_id = ? ORDER BY position')
-            .all(sourceId) as Chunk[];
-    }
+    const query = limit === undefined 
+        ? 'SELECT * FROM chunks WHERE source_id = ? ORDER BY position'
+        : 'SELECT * FROM chunks WHERE source_id = ? ORDER BY position LIMIT ?';
+    const params = limit === undefined ? [sourceId] : [sourceId, limit];
     return getDb()
-        .prepare('SELECT * FROM chunks WHERE source_id = ? ORDER BY position LIMIT ?')
-        .all(sourceId, limit) as Chunk[];
+        .prepare(query)
+        .all(...params) as Chunk[];
 }
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
