import {
    AlertTriangle,
    CheckCircle2,
    Database,
    FileText,
    HardDrive,
    Layers,
    Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { storageSnapshot } from '@/lib/lumen';
import { relativeTime } from '@/lib/time';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

function humanBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < KB) return `${bytes} B`;
    if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
    if (bytes < GB) return `${(bytes / MB).toFixed(2)} MB`;
    return `${(bytes / GB).toFixed(2)} GB`;
}


export default function StoragePage() {
    const snap = storageSnapshot();

    if (!snap.initialized || !snap.database) {
        return (
            <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Workspace not initialized — run{' '}
                        <code className="bg-muted rounded px-1 font-mono text-xs">lumen init</code>{' '}
                        to create the database.
                    </p>
                </div>
            </div>
        );
    }

    const db = snap.database;
    const vec = snap.vector;
    const fts = snap.fts;

    const walOk = db.journal_mode === 'wal';
    const dbBytes = db.file_size_bytes ?? db.page_size * db.page_count;
    const freeBytes = db.page_size * db.freelist_count;
    const freePct = dbBytes > 0 ? (freeBytes / dbBytes) * 100 : 0;

    return (
        <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                    What&apos;s on disk right now. Numbers come straight from{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">PRAGMA</code> reads
                    and <code className="bg-muted rounded px-1 font-mono text-xs">fs.statSync</code>{' '}
                    — no LLM, no network.
                </p>
            </div>

            {/* Headline stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    icon={HardDrive}
                    label="Database size"
                    value={humanBytes(dbBytes)}
                    description={`${db.page_count.toLocaleString()} × ${db.page_size}-byte pages`}
                />
                <StatTile
                    icon={Layers}
                    label="Journal mode"
                    value={db.journal_mode.toUpperCase()}
                    description={walOk ? 'concurrent reads ok' : 'reads block on writes'}
                    tone={walOk ? 'good' : 'warn'}
                />
                <StatTile
                    icon={Sparkles}
                    label="Schema version"
                    value={`v${db.schema_version}`}
                    description={`SQLite ${db.sqlite_version}`}
                />
                <StatTile
                    icon={Database}
                    label="Free pages"
                    value={db.freelist_count.toLocaleString()}
                    description={`${humanBytes(freeBytes)} reclaimable (${freePct.toFixed(1)}%)`}
                />
            </div>

            {/* File path */}
            <Card className="min-w-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <code className="bg-muted block w-full overflow-x-auto rounded px-3 py-2 font-mono text-xs break-all">
                        {db.file_path}
                    </code>
                    <p className="text-muted-foreground mt-2 text-xs">
                        Override with{' '}
                        <code className="bg-muted rounded px-1 font-mono">LUMEN_DIR</code>{' '}
                        environment variable.
                    </p>
                </CardContent>
            </Card>

            {/* Vector store + FTS — two cards side by side */}
            <div className="grid gap-4 lg:grid-cols-2">
                <VectorCard vec={vec} />
                <FtsCard
                    fts={fts}
                    chunkCount={db.tables.find((t) => t.name === 'chunks')?.rows ?? 0}
                />
            </div>

            {/* Per-table row counts */}
            <Card className="min-w-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                        Row counts by table ({db.tables.length})
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                        Anything missing here was added in a newer schema version than your local
                        DB.
                    </p>
                </CardHeader>
                <CardContent className="min-w-0 overflow-x-auto p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Table</TableHead>
                                <TableHead className="text-right">Rows</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {db.tables.map((t) => (
                                <TableRow key={t.name}>
                                    <TableCell className="font-mono text-xs">{t.name}</TableCell>
                                    <TableCell className="text-right font-mono text-sm tabular-nums">
                                        {t.rows.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function StatTile({
    icon: Icon,
    label,
    value,
    description,
    tone,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    description: string;
    tone?: 'good' | 'warn';
}) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="truncate text-sm font-medium">{label}</CardTitle>
                <Icon
                    className={
                        'h-4 w-4 shrink-0 ' +
                        (tone === 'good'
                            ? 'text-emerald-500'
                            : tone === 'warn'
                              ? 'text-amber-500'
                              : 'text-muted-foreground')
                    }
                />
            </CardHeader>
            <CardContent className="min-w-0">
                <div className="truncate text-2xl font-bold tabular-nums">{value}</div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{description}</p>
            </CardContent>
        </Card>
    );
}

function VectorCard({ vec }: { vec: ReturnType<typeof storageSnapshot>['vector'] }) {
    const enabled = vec && vec.extension_loaded && vec.table_present;
    return (
        <Card className="min-w-0">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Vector store</CardTitle>
                    {enabled ? (
                        <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                            sqlite-vec loaded
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px]">
                            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                            not active
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="min-w-0 text-sm">
                {enabled && vec ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                            <dt className="text-muted-foreground text-xs">Embeddings</dt>
                            <dd className="font-mono text-sm font-medium tabular-nums">
                                {(vec.rows ?? 0).toLocaleString()}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs">Dimensions</dt>
                            <dd className="font-mono text-sm font-medium tabular-nums">
                                {vec.dimensions ?? '—'}
                            </dd>
                        </div>
                        <div className="col-span-2 border-t pt-2">
                            <dt className="text-muted-foreground text-xs">Last embedding run</dt>
                            <dd className="font-mono text-xs">
                                {relativeTime(vec.last_embedded_at)}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        sqlite-vec isn&apos;t loaded on this build, so the third search lane is off
                        — BM25 + TF-IDF still work and the fused RRF result is just 2-signal instead
                        of 3. Run{' '}
                        <code className="bg-muted rounded px-1 font-mono">lumen embed</code> after
                        installing a build with sqlite-vec to populate the vector lane.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function FtsCard({
    fts,
    chunkCount,
}: {
    fts: ReturnType<typeof storageSnapshot>['fts'];
    chunkCount: number;
}) {
    const consistent = fts ? fts.rows === chunkCount : false;
    const healthy = fts && fts.triggers_healthy && consistent;
    return (
        <Card className="min-w-0">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-sm font-medium">FTS5 index</CardTitle>
                    {healthy ? (
                        <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                            healthy
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px]">
                            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                            check
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="min-w-0 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                        <dt className="text-muted-foreground text-xs">chunks_fts rows</dt>
                        <dd className="font-mono text-sm font-medium tabular-nums">
                            {(fts?.rows ?? 0).toLocaleString()}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs">chunks rows</dt>
                        <dd className="font-mono text-sm font-medium tabular-nums">
                            {chunkCount.toLocaleString()}
                        </dd>
                    </div>
                    <div className="col-span-2 border-t pt-2">
                        <dt className="text-muted-foreground text-xs">Triggers</dt>
                        <dd className="font-mono text-xs">
                            {fts?.triggers_healthy
                                ? 'chunks_ai · chunks_au · chunks_ad — all wired'
                                : 'missing — rebuild via lumen migrate'}
                        </dd>
                    </div>
                </dl>
                {!consistent && fts && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Row count mismatch: FTS index has {Math.abs(fts.rows - chunkCount)} rows
                        more/less than chunks. Re-run{' '}
                        <code className="bg-muted rounded px-1 font-mono">lumen sync</code> or check
                        trigger health.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
