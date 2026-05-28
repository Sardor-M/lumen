import {
    ArrowLeft,
    ArrowLeftRight,
    ArrowRight,
    BookOpen,
    Code as CodeIcon,
    Database,
    ExternalLink,
    FileCode,
    FileText,
    Folder,
    GitFork,
    Globe,
    Image as ImageIcon,
    Link2,
    ThumbsDown,
    ThumbsUp,
    Video,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { concept } from '@/lib/lumen';

const SOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

export default async function ConceptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const c = concept(slug);
    if (!c) notFound();

    return (
        <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" render={<Link href="/concepts" />}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold tracking-tight">{c.name}</h1>
                    <Badge variant="outline" className="mt-1 font-mono text-xs">
                        {c.slug}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        {c.summary ? (
                            <p className="text-sm leading-relaxed break-words">{c.summary}</p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No summary available. Run{' '}
                                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                                    lumen compile
                                </code>{' '}
                                to generate.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Mentions</dt>
                                <dd className="text-lg font-semibold">{c.mention_count}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Sources</dt>
                                <dd className="text-lg font-semibold">{c.sources.length}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Outgoing edges</dt>
                                <dd className="text-lg font-semibold">{c.outgoing.length}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Incoming edges</dt>
                                <dd className="text-lg font-semibold">{c.incoming.length}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Net feedback</dt>
                                <dd
                                    className={
                                        'text-lg font-semibold tabular-nums ' +
                                        (c.feedback_net > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : c.feedback_net < 0
                                              ? 'text-red-600 dark:text-red-400'
                                              : '')
                                    }
                                >
                                    {c.feedback_net > 0 ? `+${c.feedback_net}` : c.feedback_net}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Backlinks</dt>
                                <dd className="text-lg font-semibold">{c.backlinks.length}</dd>
                            </div>
                            <div className="col-span-2 border-t pt-3">
                                <dt className="text-muted-foreground text-xs">First seen</dt>
                                <dd className="font-mono text-xs">{relativeTime(c.created_at)}</dd>
                            </div>
                            {c.last_enriched_at && (
                                <div className="col-span-2">
                                    <dt className="text-muted-foreground text-xs">Last enriched</dt>
                                    <dd className="font-mono text-xs">
                                        {relativeTime(c.last_enriched_at)} · tier{' '}
                                        {c.enrichment_tier}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </CardContent>
                </Card>
            </div>

            {c.compiled_truth && (
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Compiled truth</CardTitle>
                        <p className="text-muted-foreground mt-1 text-xs">
                            The current best-understanding rewritten by the LLM as evidence
                            accumulates.
                        </p>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        <p className="text-foreground/85 border-l-foreground/20 border-l-2 pl-3 text-sm leading-relaxed break-words">
                            {c.compiled_truth}
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Seen in {c.sources.length} {c.sources.length === 1 ? 'source' : 'sources'}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                        Where this concept was extracted from. Sorted by extraction relevance.
                    </p>
                </CardHeader>
                <CardContent className="min-w-0">
                    {c.sources.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No source attribution recorded. Run{' '}
                            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                                lumen compile
                            </code>{' '}
                            to populate.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {c.sources.map((s) => {
                                const Icon = SOURCE_TYPE_ICONS[s.source_type] ?? FileText;
                                return (
                                    <li key={s.id}>
                                        <Link
                                            href={`/sources/${s.id}`}
                                            className="hover:bg-muted/40 focus-visible:ring-ring/40 group flex min-w-0 items-center gap-3 rounded-md border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        >
                                            <span className="bg-muted text-muted-foreground group-hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-foreground truncate text-sm font-medium">
                                                    {s.title}
                                                </p>
                                                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px]">
                                                    <span>{s.source_type}</span>
                                                    <span>·</span>
                                                    <span>{relativeTime(s.added_at)}</span>
                                                    {s.compiled_at ? (
                                                        <>
                                                            <span>·</span>
                                                            <span>compiled</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>·</span>
                                                            <span className="text-amber-600 dark:text-amber-400">
                                                                pending
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="shrink-0 font-mono text-[10px]"
                                                title="Extraction relevance"
                                            >
                                                {(s.relevance ?? 0).toFixed(2)}
                                            </Badge>
                                            <ExternalLink className="text-muted-foreground/40 group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {c.timeline.length > 0 && (
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Recent mentions ({c.timeline.length})
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Append-only evidence trail — newest first. Each entry is a moment the
                            LLM added or revised information about this concept.
                        </p>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        <ol className="space-y-3">
                            {c.timeline.slice(0, 6).map((entry, i) => (
                                <li
                                    key={`${entry.date}-${entry.source_id ?? ''}-${i}`}
                                    className="border-border/60 min-w-0 border-l-2 pl-3"
                                >
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 font-mono text-[11px]">
                                        <span>{relativeTime(entry.date)}</span>
                                        {entry.source_id && (
                                            <>
                                                <span>·</span>
                                                <Link
                                                    href={`/sources/${entry.source_id}`}
                                                    className="hover:text-foreground hover:underline"
                                                >
                                                    {entry.source_title ||
                                                        entry.source_id.slice(0, 12)}
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-foreground/85 mt-1 text-sm leading-relaxed break-words">
                                        {entry.event}
                                    </p>
                                    {entry.detail && (
                                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed break-words">
                                            {entry.detail}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
            )}

            {c.feedback.length > 0 && (
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Feedback ({c.feedback.length})
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Agent-recorded score adjustments. Net of all deltas is{' '}
                            <span
                                className={
                                    'font-mono ' +
                                    (c.feedback_net > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : c.feedback_net < 0
                                          ? 'text-red-600 dark:text-red-400'
                                          : '')
                                }
                            >
                                {c.feedback_net > 0 ? `+${c.feedback_net}` : c.feedback_net}
                            </span>
                            .
                        </p>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        <ul className="space-y-2.5">
                            {c.feedback.map((f) => (
                                <li key={f.id} className="flex min-w-0 items-start gap-3 text-sm">
                                    <span
                                        className={
                                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' +
                                            (f.delta > 0
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-red-500/10 text-red-600 dark:text-red-400')
                                        }
                                    >
                                        {f.delta > 0 ? (
                                            <ThumbsUp className="h-3 w-3" />
                                        ) : (
                                            <ThumbsDown className="h-3 w-3" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-foreground/85 leading-relaxed break-words">
                                            {f.reason ?? <em>no reason given</em>}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
                                            <span>{relativeTime(f.created_at)}</span>
                                            {f.session_id && (
                                                <>
                                                    <span>·</span>
                                                    <span>
                                                        session{' '}
                                                        <code className="bg-muted rounded px-1">
                                                            {f.session_id.slice(0, 8)}
                                                        </code>
                                                    </span>
                                                </>
                                            )}
                                            {f.device_id && (
                                                <>
                                                    <span>·</span>
                                                    <span>{f.device_id}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {c.backlinks.length > 0 && (
                <Card className="min-w-0">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Link2 className="text-muted-foreground h-4 w-4" />
                            <CardTitle className="text-sm font-medium">
                                Back-linked from ({c.backlinks.length})
                            </CardTitle>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Other concepts whose compiled truth references{' '}
                            <code className="bg-muted rounded px-1 font-mono text-[11px]">
                                {c.slug}
                            </code>
                            . Each backlink is generated automatically when{' '}
                            <code className="bg-muted rounded px-1 font-mono text-[11px]">
                                lumen compile
                            </code>{' '}
                            scans new prose.
                        </p>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        <ul className="space-y-2">
                            {c.backlinks.slice(0, 10).map((link) => (
                                <li key={link.id} className="min-w-0">
                                    <Link
                                        href={`/concepts/${link.from_slug}`}
                                        className="hover:bg-muted/40 group flex min-w-0 items-start gap-3 rounded-md border p-2.5 transition-colors"
                                    >
                                        <Link2 className="text-muted-foreground group-hover:text-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {link.from_slug}
                                            </p>
                                            {link.context && (
                                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs break-words">
                                                    “{link.context}”
                                                </p>
                                            )}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="shrink-0 font-mono text-[10px]"
                                        >
                                            {link.link_type}
                                        </Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Separator />

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <ArrowRight className="text-muted-foreground h-4 w-4" />
                        <CardTitle className="text-sm font-medium">Outgoing edges</CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        {c.outgoing.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No outgoing edges.</p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {c.outgoing.map((e) => (
                                    <li
                                        key={`${e.from_slug}-${e.to_slug}-${e.relation}`}
                                        className="flex min-w-0 items-center justify-between gap-2"
                                    >
                                        <Link
                                            href={`/concepts/${e.to_slug}`}
                                            className="truncate hover:underline"
                                        >
                                            {e.to_slug}
                                        </Link>
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 font-mono text-xs"
                                        >
                                            {e.relation}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <ArrowLeftRight className="text-muted-foreground h-4 w-4" />
                        <CardTitle className="text-sm font-medium">Incoming edges</CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                        {c.incoming.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No incoming edges.</p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {c.incoming.map((e) => (
                                    <li
                                        key={`${e.from_slug}-${e.to_slug}-${e.relation}`}
                                        className="flex min-w-0 items-center justify-between gap-2"
                                    >
                                        <Link
                                            href={`/concepts/${e.from_slug}`}
                                            className="truncate hover:underline"
                                        >
                                            {e.from_slug}
                                        </Link>
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 font-mono text-xs"
                                        >
                                            {e.relation}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
