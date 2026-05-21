import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    ArrowLeft,
    ExternalLink,
    FileText,
    Globe,
    FileCode,
    Video,
    BookOpen,
    Image as ImageIcon,
    Database,
    Folder,
    Code as CodeIcon,
    GitFork,
    Hash,
    Calendar,
    CheckCircle2,
    Clock,
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
import { SourceDetailSkeleton } from '@/components/source-detail-skeleton';
import { source } from '@/lib/lumen';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    url: Globe,
    pdf: FileCode,
    youtube: Video,
    arxiv: BookOpen,
    file: FileText,
    folder: Folder,
    code: CodeIcon,
    dataset: Database,
    image: ImageIcon,
    trajectory: GitFork,
};

function relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
}

function absoluteDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Outer page is a thin shell that resolves params, then hands off to the
 * inner async component inside a Suspense boundary. The boundary is the
 * key mechanism that makes the loading skeleton visible during client
 * navigation — without it the synchronous `better-sqlite3` calls below
 * run in the same microtask as `await params`, finishing before Next.js
 * can flush the route-level `loading.tsx` to the wire.
 */
export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <Suspense key={id} fallback={<SourceDetailSkeleton />}>
            <SourceDetail id={id} />
        </Suspense>
    );
}

async function SourceDetail({ id }: { id: string }) {
    /**
     * Force one microtask yield so the Suspense fallback above is
     * committed before we block on the synchronous SQLite read. Without
     * this, React's reconciler treats the whole subtree as one render
     * pass and the fallback is never shown to the user.
     */
    await Promise.resolve();

    const s = source(id);
    if (!s) notFound();

    const Icon = TYPE_ICONS[s.source_type] ?? FileText;
    const compiled = s.compiled_at !== null;
    const totalTokens = s.chunks.reduce((sum, c) => sum + (c.token_count ?? 0), 0);
    let metadataParsed: Record<string, unknown> | null = null;
    if (s.metadata) {
        try {
            metadataParsed = JSON.parse(s.metadata) as Record<string, unknown>;
        } catch {
            /** Leave as raw string below. */
        }
    }

    return (
        <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
            <Link
                href="/sources"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                All sources
            </Link>

            <header className="min-w-0 space-y-3">
                <div className="flex items-start gap-3">
                    <span className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl leading-tight font-bold tracking-tight break-words">
                            {s.title}
                        </h1>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <Badge variant="outline" className="gap-1 text-xs">
                                <Icon className="h-3 w-3" />
                                {s.source_type}
                            </Badge>
                            <span className="font-mono">
                                {s.scope_kind}:{s.scope_key}
                            </span>
                            <span>·</span>
                            <span>added {relativeTime(s.added_at)}</span>
                            {s.language && (
                                <>
                                    <span>·</span>
                                    <span className="font-mono">{s.language}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {s.url && (
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="bg-card/40 hover:bg-card border-border focus-visible:ring-ring/40 group/url flex w-full max-w-full items-center gap-2 overflow-hidden rounded-md border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <ExternalLink className="text-muted-foreground group-hover/url:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
                        <span className="text-foreground/80 group-hover/url:text-foreground min-w-0 flex-1 truncate font-mono text-xs">
                            {s.url}
                        </span>
                    </a>
                )}
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={FileText}
                    label="Words"
                    value={s.word_count.toLocaleString()}
                    description="Total extracted"
                />
                <StatCard
                    icon={Hash}
                    label="Chunks"
                    value={s.chunk_count.toLocaleString()}
                    description={`${totalTokens.toLocaleString()} tokens`}
                />
                <StatCard
                    icon={GitFork}
                    label="Concepts"
                    value={s.concept_count.toLocaleString()}
                    description="Derived from this source"
                />
                <StatCard
                    icon={compiled ? CheckCircle2 : Clock}
                    label={compiled ? 'Compiled' : 'Pending'}
                    value={compiled ? relativeTime(s.compiled_at) : '—'}
                    description={
                        compiled
                            ? absoluteDate(s.compiled_at)
                            : 'Run `lumen compile` to extract concepts'
                    }
                />
            </div>

            <Card className="min-w-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Lifecycle</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0 space-y-3 text-sm">
                    <LifecycleRow
                        icon={Calendar}
                        label="Added to brain"
                        when={s.added_at}
                        relative={relativeTime(s.added_at)}
                    />
                    <LifecycleRow
                        icon={compiled ? CheckCircle2 : Clock}
                        label={compiled ? 'Compiled into concepts' : 'Compile pending'}
                        when={s.compiled_at}
                        relative={compiled ? relativeTime(s.compiled_at) : '—'}
                        pending={!compiled}
                    />
                    <LifecycleRow
                        icon={Hash}
                        label="Content hash (SHA-256)"
                        mono={s.content_hash}
                    />
                </CardContent>
            </Card>

            {s.derived_concepts.length > 0 && (
                <Card className="min-w-0">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            Concepts derived from this source ({s.derived_concepts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0 overflow-x-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Concept</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                    <TableHead className="text-right">Mentions</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {s.derived_concepts.map((c) => (
                                    <TableRow key={c.slug} className="cursor-pointer">
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/concepts/${c.slug}`}
                                                className="hover:underline"
                                            >
                                                {c.name}
                                            </Link>
                                            <p className="text-muted-foreground mt-0.5 font-mono text-xs break-all">
                                                {c.slug}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {c.score > 0 ? `+${c.score}` : c.score}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {c.mention_count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {c.retired_at ? (
                                                <Badge variant="outline" className="text-xs">
                                                    retired
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                    active
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        Chunks ({s.chunk_count.toLocaleString()})
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                        Showing the first {Math.min(s.chunks.length, 10)} of{' '}
                        {s.chunk_count.toLocaleString()}; query the CLI for the rest.
                    </p>
                </CardHeader>
                <CardContent className="min-w-0 space-y-3">
                    {s.chunks.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            This source has no chunks yet.
                        </p>
                    ) : (
                        s.chunks.slice(0, 10).map((chunk) => (
                            <div
                                key={chunk.id}
                                className="border-border/60 min-w-0 rounded-md border p-3"
                            >
                                <div className="text-muted-foreground mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="min-w-0 font-mono">
                                        #{chunk.position + 1}
                                        {chunk.heading && (
                                            <span className="text-foreground/70 ml-2 font-sans break-words not-italic">
                                                · {chunk.heading}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 font-mono">{chunk.token_count}t</span>
                                </div>
                                <p className="text-foreground/85 line-clamp-3 text-sm leading-relaxed break-words">
                                    {chunk.content}
                                </p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {(metadataParsed || s.metadata) && (
                <Card className="min-w-0">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        <pre className="bg-muted/60 text-foreground/85 max-w-full min-w-0 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug break-all whitespace-pre-wrap">
                            {metadataParsed ? JSON.stringify(metadataParsed, null, 2) : s.metadata}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="truncate text-sm font-medium">{label}</CardTitle>
                <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
            </CardHeader>
            <CardContent className="min-w-0">
                <div className="truncate text-2xl font-bold">{value}</div>
                <p className="text-muted-foreground truncate text-xs">{description}</p>
            </CardContent>
        </Card>
    );
}

function LifecycleRow({
    icon: Icon,
    label,
    when,
    relative,
    mono,
    pending,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    when?: string | null;
    relative?: string;
    mono?: string;
    pending?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon
                className={
                    'mt-0.5 h-4 w-4 shrink-0 ' +
                    (pending ? 'text-muted-foreground' : 'text-emerald-500')
                }
            />
            <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                {when && (
                    <p className="text-muted-foreground text-xs">
                        {absoluteDate(when)} · {relative}
                    </p>
                )}
                {mono && (
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs break-all">
                        {mono}
                    </p>
                )}
                {pending && !when && <p className="text-muted-foreground text-xs">{relative}</p>}
            </div>
        </div>
    );
}
