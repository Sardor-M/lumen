import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MemoryPage() {
    return (
        <article className="max-w-3xl space-y-6">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold">Memory &amp; self-improvement</h2>
                <p className="text-muted-foreground text-sm">
                    How Lumen turns one-shot LLM conversations into accumulating knowledge, and why
                    that knowledge gets sharper rather than noisier over time.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">The substrate, in one paragraph</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Every concept-touching write — a new source, a feedback vote, an edited
                        truth, a retired concept, a captured trajectory — appends a row to{' '}
                        <code className="bg-muted rounded px-1 font-mono text-xs">
                            sync_journal
                        </code>{' '}
                        inside the same transaction as the underlying entity write. The journal is
                        the only authoritative record of change. Everything else — search indexes,
                        the graph, concept scoring — is downstream and can be rebuilt from the
                        journal. This is what makes &quot;memory&quot; durable and inspectable
                        rather than an opaque LLM context window.
                    </p>
                    <Diagram>{`every store mutator
   │
   ▼
BEGIN TRANSACTION
   write entity row(s)        ← concepts, edges, feedback, ...
   journal_append(op, payload) ← sync_journal row
COMMIT
   │
   ▼
search index trigger, score cache, daemon push — all downstream`}</Diagram>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">How agents write to memory</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Lumen exposes a Model Context Protocol (MCP) server with about 23 tools. An
                        MCP-capable client — Claude Code, Cursor, any compatible agent — can call
                        them within a session. The write-shaped tools matter most for memory.
                    </p>
                    <Diagram>{`agent session (Claude Code, Cursor, ...)
   │
   ▼  MCP tool call over stdio
┌─────────────────────────────────────┐
│ lumen MCP server                    │
│  - add                              │
│  - capture / capture_trajectory     │
│  - brain_feedback                   │
│  - brain_ops (update_truth, retire) │
└──────────────┬──────────────────────┘
               │ same store mutators humans use
               ▼
   PII gate ──► store transaction ──► sync_journal append
                                            │
                                            ▼  daemon picks up
                                      sync push (encrypted)
                                            │
                                            ▼
                                  visible on Activity page
                                  visible on other devices`}</Diagram>
                    <p>
                        Agent writes can&apos;t bypass the journal or the PII scrubber — they flow
                        through the same store functions a human invocation uses. Every write is
                        auditable from{' '}
                        <code className="bg-muted rounded px-1 font-mono text-xs">/activity</code>.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-2">
                    <CardTitle className="text-base">
                        Why memory gets sharper, not noisier
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                            scoring
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            retirement
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            scope routing
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            PII gate
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Bigger memory only helps if signal scales faster than noise. Four mechanisms
                        keep that ratio improving.
                    </p>

                    <p className="font-medium">1 · Concept scoring</p>
                    <Diagram>{`feedback comes in       (delta = +1 or -1)
   │
   ▼
INSERT concept_feedback (append-only)
   │
   ▼
score(c) = SUM(delta) over all feedback for c
   │
   ▼  cached, ordered desc
search ranks higher-scored concepts first
   │
   └──► next session: agent is more likely to lean on
        concepts that already worked`}</Diagram>

                    <p className="font-medium">2 · Retirement</p>
                    <Diagram>{`every concept tracks  last_touched
   │
   ▼  periodic sweep
last_touched < now − retire_after  ?
                  │
            ┌─────┴─────┐
            ▼           ▼
        mark           ignore
   retired_at = now
            │
            ▼  default search filters this out
   knowledge ages out without being lost
   (revive with 'lumen concept revive <slug>')`}</Diagram>

                    <p className="font-medium">3 · Scope routing</p>
                    <Diagram>{`every source + concept carries  scope_kind:scope_key
   examples:
      personal:me
      framework:react
      language:typescript
      codebase:lumen

sync layer:  scope_routing_tag = HMAC(Kx, scope_kind || ":" || scope_key)

device A pulls relay:
   filter to scope_tags this device cares about
   └─► only personal + checked-out codebases materialize
       irrelevant scopes never leave the relay`}</Diagram>

                    <p className="font-medium">4 · PII gate</p>
                    <Diagram>{`captured text
   │
   ▼
regex scrubber  (apps/cli/src/pii/patterns.ts)
   ├── emails       → <redacted:email>
   ├── api keys     → <redacted:api_key>
   ├── bearer tok.  → <redacted:token>
   └── abs paths    → <redacted:path>
   │
   ▼
sanitized text → store + journal`}</Diagram>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Last-write-wins, honestly</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Two devices can edit a concept&apos;s{' '}
                        <code className="bg-muted rounded px-1 font-mono">compiled_truth</code> at
                        roughly the same time. We resolve by{' '}
                        <code className="bg-muted rounded px-1 font-mono">updated_at</code> and
                        append the loser to{' '}
                        <code className="bg-muted rounded px-1 font-mono">
                            concept_truth_history
                        </code>{' '}
                        with the device id.
                    </p>
                    <Diagram>{`device A:  truth_update at T₁
device B:  truth_update at T₂   (T₂ > T₁)

both push to relay, both pull each other's entry.

apply on either device:
   incoming.updated_at  >  existing.updated_at  ?
            │                       │
            ▼                       ▼
        winner wins             loser preserved
   UPDATE concepts SET     INSERT concept_truth_history
      truth = winner          (slug, truth, updated_at, device_id)
                                       │
                                       ▼
                              audit row visible later
                              for manual reconciliation`}</Diagram>
                    <p>
                        We chose this over pretending free-form text is CRDT-mergeable because
                        debuggability matters more than the appearance of magic. When the truth
                        looks wrong, you can trace exactly who wrote what when.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">The self-improving loop</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Put the parts together and you get a loop where every session leaves the
                        knowledge base a little sharper than it found it.
                    </p>
                    <Diagram>{`           ┌──────────────────────────────────────────┐
           │                                          │
           ▼                                          │
   ingest source   ─►  compile (concepts + edges)    │
           │                       │                  │
           │                       ▼                  │
           │             search lane indexed          │
           │                       │                  │
           │                       ▼                  │
           │             agent retrieves              │
           │                       │                  │
           │                       ▼                  │
           │             agent acts, captures         │
           │             trajectory                   │
           │                       │                  │
           │                       ▼                  │
           │             feedback (+1/-1)             │
           │                       │                  │
           │              ┌────────┴────────┐         │
           │              ▼                 ▼         │
           │       useful → +score      unused → ages out
           │              │                 │         │
           │              ▼                 ▼         │
           │       surfaces earlier    retired       │
           │       next session         (still revivable)
           │                       │                  │
           │                       ▼                  │
           └───── next session has a smaller, ────────┘
                  higher-signal working set`}</Diagram>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What the dashboard tells you</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        If you want a single read on whether memory is improving, watch four
                        numbers:
                    </p>
                    <ul className="list-inside list-disc space-y-1.5">
                        <li>
                            <strong>Concepts</strong> — should grow roughly with sources, then slow
                            as merging takes over.
                        </li>
                        <li>
                            <strong>Average degree (2E/N)</strong> — drifting up means the graph is
                            consolidating; dropping means new sources aren&apos;t connecting.
                        </li>
                        <li>
                            <strong>Sync activity / 24h</strong> on the Activity page — non-zero
                            means agents and devices are actively writing, not just reading.
                        </li>
                        <li>
                            <strong>Pending compile</strong> — should trend toward zero. If it keeps
                            climbing, the LLM rate is slower than your ingest rate, and new concepts
                            aren&apos;t available to retrieval yet.
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </article>
    );
}

function Diagram({ children }: { children: string }) {
    return (
        <pre className="bg-muted/60 text-foreground/85 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug">
            {children}
        </pre>
    );
}
