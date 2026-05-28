import Link from 'next/link';
import { Activity, BarChart3, Flame, Search, Sparkles, Terminal, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { hotTopics, recentActivity, savings, status, toolCallStats } from '@/lib/lumen';
import { relativeTime } from '@/lib/time';

export default function AgentActivityPage() {
    const s = status();
    const queries = s.initialized ? recentActivity(50) : [];
    const topics = s.initialized ? hotTopics(12) : [];
    const tools = s.initialized ? toolCallStats() : {};
    const savings7 = savings(7);
    const savings30 = savings(30);
    const totalCalls = Object.values(tools).reduce((sum, n) => sum + n, 0);

    return (
        <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Agent activity</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                    What Claude Code, Cursor, and any MCP client have asked the brain. Every tool
                    call writes a row to{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">query_log</code>; the
                    savings numbers are computed from sessions that ended with a known skill hit
                    versus full exploration.
                </p>
            </div>

            <SavingsCard window="7-day" data={savings7} totalCalls={totalCalls} />
            <SavingsCard window="30-day" data={savings30} totalCalls={totalCalls} compact />

            <div className="grid gap-4 lg:grid-cols-3">
                <RecentActivityCard queries={queries} />
                <HotTopicsCard topics={topics} />
            </div>

            <ToolBreakdownCard tools={tools} total={totalCalls} />
        </div>
    );
}

function SavingsCard({
    window,
    data,
    totalCalls,
    compact,
}: {
    window: string;
    data: ReturnType<typeof savings>;
    totalCalls: number;
    compact?: boolean;
}) {
    const hitPct = Math.round(data.hit_rate * 100);
    return (
        <Card className="bg-card/40 min-w-0">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">{window} window</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                        {data.total_sessions} sessions
                    </Badge>
                </div>
            </CardHeader>
            <CardContent
                className={
                    'grid gap-4 ' + (compact ? 'sm:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4')
                }
            >
                {!compact && (
                    <SavingsStat
                        icon={Activity}
                        label="Tool calls"
                        value={totalCalls.toLocaleString()}
                        description={`${data.total_sessions} sessions ${window}`}
                    />
                )}
                <SavingsStat
                    icon={Sparkles}
                    label="Skill hit rate"
                    value={`${hitPct}%`}
                    description={`${data.skill_aided_sessions} hit · ${data.exploration_sessions} explored`}
                    tone={hitPct >= 50 ? 'good' : undefined}
                    compact={compact}
                />
                <SavingsStat
                    icon={TrendingUp}
                    label="Tokens saved"
                    value={data.estimated_savings_tokens.toLocaleString()}
                    description={`vs ${data.baseline_tokens.toLocaleString()}/session baseline`}
                    tone={data.estimated_savings_tokens > 0 ? 'good' : undefined}
                    compact={compact}
                />
                <SavingsStat
                    icon={BarChart3}
                    label="≈ USD avoided"
                    value={`$${data.estimated_savings_usd.toFixed(2)}`}
                    description={`${window} · conservative blend`}
                    tone={data.estimated_savings_usd > 0 ? 'good' : undefined}
                    compact={compact}
                />
                {compact && (
                    <SavingsStat
                        icon={Activity}
                        label="Sessions"
                        value={data.total_sessions.toLocaleString()}
                        description={`${data.total_sessions === 0 ? 'no activity' : 'logged'}`}
                        compact
                    />
                )}
            </CardContent>
        </Card>
    );
}

function SavingsStat({
    icon: Icon,
    label,
    value,
    description,
    tone,
    compact,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    description: string;
    tone?: 'good';
    compact?: boolean;
}) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <Icon
                    className={
                        'h-4 w-4 ' +
                        (tone === 'good' ? 'text-emerald-500' : 'text-muted-foreground')
                    }
                />
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {label}
                </p>
            </div>
            <p className={'mt-1.5 font-bold tabular-nums ' + (compact ? 'text-xl' : 'text-2xl')}>
                {value}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{description}</p>
        </div>
    );
}

function RecentActivityCard({ queries }: { queries: ReturnType<typeof recentActivity> }) {
    return (
        <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Terminal className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-sm font-medium">
                        Recent calls ({queries.length})
                    </CardTitle>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    Newest first. Click any query to re-run it in search.
                </p>
            </CardHeader>
            <CardContent className="min-w-0">
                {queries.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-xs">
                        No tool calls yet. Run{' '}
                        <code className="bg-muted rounded px-1 font-mono">
                            lumen install claude
                        </code>{' '}
                        to wire an agent to this brain.
                    </p>
                ) : (
                    <ol className="space-y-2">
                        {queries.map((q, i) => (
                            <li
                                key={`${q.timestamp}-${i}`}
                                className="flex min-w-0 items-center gap-3 text-sm"
                            >
                                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                                    {q.tool_name}
                                </Badge>
                                {q.query_text ? (
                                    <Link
                                        href={`/search?q=${encodeURIComponent(q.query_text)}`}
                                        className="hover:text-foreground min-w-0 flex-1 truncate transition-colors"
                                    >
                                        {q.query_text}
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground min-w-0 flex-1 truncate italic">
                                        (no query text)
                                    </span>
                                )}
                                <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                                    {relativeTime(q.timestamp)}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}

function HotTopicsCard({ topics }: { topics: ReturnType<typeof hotTopics> }) {
    const max = topics[0]?.count ?? 1;
    return (
        <Card className="min-w-0">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Flame className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Hot topics</CardTitle>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    What the agent keeps asking about.
                </p>
            </CardHeader>
            <CardContent className="min-w-0">
                {topics.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-xs">No topics yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {topics.map((t, i) => (
                            <li key={`${t.query_text}-${i}`} className="min-w-0 text-sm">
                                <Link
                                    href={`/search?q=${encodeURIComponent(t.query_text)}`}
                                    className="hover:text-foreground group flex min-w-0 items-center justify-between gap-2"
                                >
                                    <span className="min-w-0 flex-1 truncate">{t.query_text}</span>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                        {t.count}×
                                    </span>
                                </Link>
                                <div className="bg-muted/40 mt-1 h-1 w-full overflow-hidden rounded-full">
                                    <div
                                        className="bg-foreground/30 h-full"
                                        style={{
                                            width: `${Math.max(8, (t.count / max) * 100)}%`,
                                        }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function ToolBreakdownCard({ tools, total }: { tools: Record<string, number>; total: number }) {
    const entries = Object.entries(tools).sort((a, b) => b[1] - a[1]);
    return (
        <Card className="min-w-0">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Search className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Tool call distribution</CardTitle>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    Every MCP tool the agent has invoked, lifetime. Total {total.toLocaleString()}.
                </p>
            </CardHeader>
            <CardContent className="min-w-0">
                {entries.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-xs">No tool calls logged yet.</p>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {entries.map(([name, count]) => {
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            return (
                                <div key={name} className="min-w-0">
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                        <span className="truncate font-mono">{name}</span>
                                        <span className="text-muted-foreground font-mono">
                                            {count.toLocaleString()}{' '}
                                            <span className="opacity-60">({pct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                    <div className="bg-muted/40 mt-1 h-1.5 w-full overflow-hidden rounded-full">
                                        <div
                                            className="bg-foreground/40 h-full"
                                            style={{ width: `${Math.max(2, pct)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

