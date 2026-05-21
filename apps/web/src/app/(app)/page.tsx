import Link from 'next/link';
import {
    Activity,
    BarChart3,
    BookOpen,
    Boxes,
    ChevronRight,
    FileText,
    GitFork,
    Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { graphSnapshot, profile, status, syncActivity } from '@/lib/lumen';
import { KnowledgeGraph } from '@/components/knowledge-graph';

export default function DashboardPage() {
    const s = status();
    const p = s.initialized ? profile() : null;
    const density = p?.static.graph_density ?? 0;
    const pending = p?.dynamic.pending_compilation ?? 0;
    const activity = s.initialized
        ? syncActivity({ limit: 5 })
        : {
              entries: [],
              devices_seen: 0,
              entries_total: 0,
              entries_24h: 0,
              pending_push: 0,
              pending_apply: 0,
          };
    const snapshot = s.initialized ? graphSnapshot({ limit: 120 }) : null;
    const hasMemory = (snapshot?.nodes.length ?? 0) > 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    {s.initialized
                        ? 'Your knowledge graph at a glance.'
                        : 'Workspace not initialized — run `lumen init` in your terminal to get started.'}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    icon={FileText}
                    label="Sources"
                    value={s.initialized ? String(s.sources) : '—'}
                    description="Articles ingested"
                    href="/sources"
                />
                <StatCard
                    icon={Boxes}
                    label="Concepts"
                    value={s.initialized ? String(s.concepts) : '—'}
                    description="Extracted nodes"
                    href="/concepts"
                />
                <StatCard
                    icon={GitFork}
                    label="Edges"
                    value={s.initialized ? String(s.edges) : '—'}
                    description="Relationships"
                    href="/graph"
                />
                <StatCard
                    icon={BarChart3}
                    label="Graph Density"
                    value={s.initialized ? density.toFixed(4) : '—'}
                    description="2·E / (N·(N−1))"
                    href="/learn/graph-density"
                />
                <StatCard
                    icon={Activity}
                    label="Pending"
                    value={s.initialized ? String(pending) : '—'}
                    description="Sources awaiting compile"
                    href="/sources"
                />
                <StatCard
                    icon={Sparkles}
                    label="Sync activity"
                    value={s.initialized ? String(activity.entries_24h) : '—'}
                    description={`${activity.devices_seen} ${
                        activity.devices_seen === 1 ? 'device' : 'devices'
                    } · last 24h`}
                    href="/activity"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div>
                            <CardTitle className="text-base">Memory</CardTitle>
                            <p className="text-muted-foreground mt-1 text-xs">
                                A live preview of your knowledge graph. Drag a node, or open the
                                full view.
                            </p>
                        </div>
                        <Link
                            href="/graph"
                            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/40 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            aria-label="Open the full memory graph"
                        >
                            Open
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {hasMemory && snapshot ? (
                            <div className="px-4 pb-4">
                                <KnowledgeGraph
                                    snapshot={snapshot}
                                    variant="preview"
                                    href="/graph"
                                    height={340}
                                />
                            </div>
                        ) : (
                            <EmptyMemory />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="text-muted-foreground h-4 w-4" />
                            <CardTitle className="text-base">How Lumen works</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <LearnLink href="/learn/algorithms" label="Algorithms" />
                        <LearnLink
                            href="/learn/graph-density"
                            label="Graph density & connectivity"
                        />
                        <LearnLink href="/learn/memory" label="Memory & self-improvement" />
                        <LearnLink href="/learn" label="All topics" muted />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function EmptyMemory() {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <GitFork className="text-muted-foreground/30 mb-3 h-10 w-10" />
            <h3 className="text-sm font-semibold">No memory compiled yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                Run{' '}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                    lumen add &lt;url&gt;
                </code>{' '}
                then <code className="bg-muted rounded px-1.5 py-0.5 font-mono">lumen compile</code>{' '}
                to populate the graph.
            </p>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    description,
    href,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="hover:border-foreground/20 group/stat hover:bg-card focus-visible:ring-ring/40 focus-visible:border-foreground/30 block rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
            <Card className="bg-card/40 group-hover/stat:bg-card h-full transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                    <Icon className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-2xl font-bold">{value}</div>
                            <p className="text-muted-foreground text-xs">{description}</p>
                        </div>
                        <ChevronRight className="text-muted-foreground/40 group-hover/stat:text-foreground h-4 w-4 transition-colors" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function LearnLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
    return (
        <Link
            href={href}
            className={
                'hover:bg-muted -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ' +
                (muted ? 'text-muted-foreground text-xs' : '')
            }
        >
            <span>{label}</span>
            <ChevronRight className="text-muted-foreground/60 h-4 w-4" />
        </Link>
    );
}
