import Link from 'next/link';
import { ChevronRight, Cpu, BarChart3, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const topics = [
    {
        href: '/dashboard/learn/algorithms',
        icon: Cpu,
        title: 'Algorithms',
        description:
            'How BM25, TF-IDF, Reciprocal Rank Fusion, PageRank, and label propagation actually work in Lumen.',
    },
    {
        href: '/dashboard/learn/graph-density',
        icon: BarChart3,
        title: 'Graph density & connectivity',
        description:
            'What the density number means, why edges look disconnected, and how to consolidate the graph.',
    },
    {
        href: '/dashboard/learn/memory',
        icon: Brain,
        title: 'Memory & self-improvement',
        description:
            'How agents capture trajectories, why concepts get scored and retired, and what makes the knowledge base improve as it grows.',
    },
];

export default function LearnHubPage() {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-muted-foreground max-w-2xl text-sm">
                    Lumen is a local-first knowledge compiler that turns reading and agent
                    trajectories into a searchable graph. These pages explain the pieces — the
                    retrieval math, the graph geometry, and how the system improves over time as you
                    (and your agents) keep using it.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((t) => (
                    <Link
                        key={t.href}
                        href={t.href}
                        className="hover:border-foreground/20 group/topic block rounded-xl transition-colors"
                    >
                        <Card className="bg-card/40 group-hover/topic:bg-card h-full transition-colors">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="bg-muted text-foreground flex h-8 w-8 items-center justify-center rounded-md">
                                        <t.icon className="h-4 w-4" />
                                    </div>
                                    <ChevronRight className="text-muted-foreground/40 group-hover/topic:text-foreground h-4 w-4 transition-colors" />
                                </div>
                                <CardTitle className="text-base">{t.title}</CardTitle>
                                <CardDescription className="text-sm">
                                    {t.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent />
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
