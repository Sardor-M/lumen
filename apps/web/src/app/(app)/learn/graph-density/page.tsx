import { profile, status } from '@/lib/lumen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function GraphDensityPage() {
    const s = status();
    const p = s.initialized ? profile() : null;
    const density = p?.static.graph_density ?? 0;
    const nodes = s.initialized ? s.concepts : 0;
    const edges = s.initialized ? s.edges : 0;
    const maxEdges = nodes > 1 ? (nodes * (nodes - 1)) / 2 : 0;
    const avgDegree = nodes > 0 ? (2 * edges) / nodes : 0;

    return (
        <article className="max-w-3xl space-y-6">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold">Graph density &amp; connectivity</h2>
                <p className="text-muted-foreground text-sm">
                    What the number on your dashboard actually means, why your graph might look
                    fragmented even with hundreds of edges, and what to do about it.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Your graph right now</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Concepts (N)" value={String(nodes)} />
                        <Stat label="Edges (E)" value={String(edges)} />
                        <Stat label="Density" value={density.toFixed(4)} />
                        <Stat label="Avg degree (2E/N)" value={avgDegree.toFixed(2)} />
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs">
                        Max possible edges on an undirected simple graph of this size is{' '}
                        <code className="bg-muted rounded px-1 font-mono">
                            N·(N−1)/2 = {maxEdges.toLocaleString()}
                        </code>
                        . Density is the fraction of those that actually exist.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">The formula</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <Diagram>{`           2 · E
density = ─────────────
          N · (N − 1)

   N = number of concepts (nodes)
   E = number of edges (connections)

   range  0 ..... 1
          │       │
          │       └── complete graph: every concept linked to every other
          └────────── empty graph: no connections at all`}</Diagram>
                    <p>
                        Real knowledge graphs are sparse by construction. Density above{' '}
                        <code className="bg-muted rounded px-1 font-mono">0.05</code> usually means
                        either a small corpus or an over-eager extractor. Below{' '}
                        <code className="bg-muted rounded px-1 font-mono">0.001</code> usually means
                        the graph has fragmented faster than concepts have been merged.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Why so many concepts look disconnected
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        If you opened the Graph page and saw a tight cluster surrounded by orbiting
                        singletons, this is the explanation.{' '}
                        <strong>Compilation is per-source.</strong> Claude reads each source
                        independently and extracts concepts and edges <em>within that source</em>.
                        Cross-source edges only happen as a side effect — when two sources mention
                        the same concept with the same slug.
                    </p>
                    <Diagram>{`SOURCE A                       SOURCE B
─────────                       ─────────
[react-hooks] ──┐               ┌── [react-state-hooks]
                ▼               ▼
       [component-state]   [render-cycle]
                            │
                            ▼
                       [virtual-dom]

   ▼  compile output

   subgraph A                     subgraph B
   ┌─────────────────┐            ┌──────────────────────┐
   │ react-hooks ●──●│            │ react-state-hooks ●──●│
   │ component-state │            │ render-cycle  virtual-dom
   └─────────────────┘            └──────────────────────┘
            │                              │
            └── different slugs ────────── ┘
                ▶  no edge between them
                ▶  shows as TWO communities, not one`}</Diagram>
                    <p>
                        With <code className="bg-muted rounded px-1 font-mono">{nodes}</code>{' '}
                        concepts and{' '}
                        <code className="bg-muted rounded px-1 font-mono">{edges}</code> edges,
                        average degree is{' '}
                        <code className="bg-muted rounded px-1 font-mono">
                            {avgDegree.toFixed(2)}
                        </code>
                        . Concepts unique to one source live as singletons until alias merging
                        bridges them.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">How to consolidate the graph</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>Three mechanisms exist; from cheapest to most invasive:</p>
                    <ol className="list-inside list-decimal space-y-2">
                        <li>
                            <strong>Concept merge (Tier 3b).</strong> The CLI&apos;s slug normalizer
                            detects near-duplicates by similarity and adds aliases.
                        </li>
                        <li>
                            <strong>Add cross-domain sources.</strong> Two technical papers from the
                            same field share more concepts than a paper plus a personal essay.
                        </li>
                        <li>
                            <strong>Re-compile with broader hints.</strong>{' '}
                            <code className="bg-muted rounded px-1 font-mono">
                                lumen compile --enrich
                            </code>{' '}
                            asks the LLM to consider canonical-slug suggestions from neighboring
                            concepts.
                        </li>
                    </ol>
                    <Diagram>{`fragmented graph              alias merge step              consolidated graph
──────────────────            ───────────────────           ──────────────────
                                     │
[react-hooks] ●               for each pair (a, b):         [react-hooks] ●
                                  sim = lev_ratio(a.slug, b.slug)        │
[react-state-hooks] ●     ──►     + name_token_overlap     ──►           │
                                  + co-source signal                     ●
                                                                         │
                              if sim > threshold:                        ●
                                  canonical = older(a, b)        [component-state]
                                  INSERT concept_aliases
                                  edges rewrite to canonical
                                                              one cluster
                                                              avg degree ↑
                                                              communities ↓`}</Diagram>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-2">
                    <CardTitle className="text-base">
                        What density means as the graph grows
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                            sparse by design
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            scales sub-linearly
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Density mechanically decreases as N grows, even if you keep adding edges at
                        the same rate per source — the denominator{' '}
                        <code className="bg-muted rounded px-1 font-mono">N·(N−1)/2</code> grows
                        quadratically. A &quot;dropping&quot; density isn&apos;t a sign of
                        degradation; it&apos;s normal scaling.
                    </p>
                    <Diagram>{`N         max edges (N·(N−1)/2)     edges grown linearly         resulting density
─────     ──────────────────────    ────────────────────         ─────────────────
  20              190                       40                          0.21
  50            1,225                      100                          0.08
 100            4,950                      200                          0.04
 500          124,750                    1,000                          0.008
1000          499,500                    2,000                          0.004

   ▲                                                                       ▲
   linear edge growth                                          density falls
   (per-source compile rate)                                  but the graph
                                                          is just as useful`}</Diagram>
                    <p>
                        What you should care about instead: <strong>average degree</strong> (
                        <code className="bg-muted rounded px-1 font-mono">2E / N</code>) and the
                        number of distinct communities.
                    </p>
                    <Diagram>{`watch this, not density:

   avg degree drifting up   → graph is consolidating
   avg degree flat          → compile keeps producing isolated concepts
   avg degree falling       → time to run alias merge

   communities shrinking    → cross-source bridges forming
   communities multiplying  → new sources too unrelated to existing graph`}</Diagram>
                </CardContent>
            </Card>
        </article>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-border rounded-md border p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
        </div>
    );
}

function Diagram({ children }: { children: string }) {
    return (
        <pre className="bg-muted/60 text-foreground/85 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug">
            {children}
        </pre>
    );
}
