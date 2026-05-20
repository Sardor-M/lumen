'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type SearchResult = {
    chunk_id: string;
    source_id: string;
    source_title: string | null;
    snippet: string | null;
    rrf_score: number;
    signals: Record<string, number>;
};

const SAMPLE_QUERIES = [
    'agent orchestration patterns',
    'how does attention work',
    'tradeoffs between RAG and fine-tuning',
    'startup early growth strategy',
    'PageRank intuition',
    'building reliable LLM systems',
] as const;

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    async function runSearch(q: string) {
        if (!q.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.results ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        runSearch(query);
    }

    function onSample(q: string) {
        setQuery(q);
        runSearch(q);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Search</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Hybrid BM25 + TF-IDF search across all ingested content.{' '}
                    <Link
                        href="/dashboard/learn/algorithms"
                        className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                        How this works →
                    </Link>
                </p>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your knowledge base…"
                        className="pl-9"
                    />
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Searching…' : 'Search'}
                </Button>
            </form>

            {!searched && (
                <div className="space-y-3">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Sparkles className="h-3 w-3" />
                        Try a sample query
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SAMPLE_QUERIES.map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => onSample(q)}
                                className="bg-card hover:bg-muted border-border hover:border-foreground/20 focus-visible:ring-ring/40 inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searched && results.length === 0 && !loading && (
                <Card>
                    <CardContent className="text-muted-foreground py-8 text-center text-sm">
                        <p>No results found.</p>
                        <p className="mt-2 text-xs">
                            Try a different phrasing or ingest more sources with{' '}
                            <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                                lumen add &lt;url&gt;
                            </code>
                            .
                        </p>
                    </CardContent>
                </Card>
            )}

            {results.length > 0 && (
                <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </p>
                    {results.map((r) => (
                        <Card key={r.chunk_id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">
                                        {r.source_title ?? r.source_id}
                                    </CardTitle>
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {r.rrf_score.toFixed(3)}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground font-mono text-xs">
                                    {Object.entries(r.signals)
                                        .map(([k, v]) => `${k}:${v.toFixed(2)}`)
                                        .join(' · ')}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground line-clamp-3 text-sm">
                                    {r.snippet ?? ''}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
