import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AlgorithmsPage() {
    return (
        <article className="max-w-3xl space-y-8">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold">Algorithms</h2>
                <p className="text-muted-foreground text-sm">
                    Every stage of the Lumen pipeline, in the order data flows through it. Each
                    section names the algorithm, points at the source, and shows the shape of inputs
                    and outputs with a small ASCII diagram.
                </p>
            </header>

            <Section
                title="1. Source detection"
                source="apps/cli/src/ingest/detect.ts"
                badges={['dispatcher', 'O(1)']}
            >
                <p>
                    The first thing{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">lumen add</code> does
                    is decide what kind of input it&apos;s holding. The dispatcher checks URL shape,
                    file extension, and magic bytes, then hands off to the matching extractor.
                </p>
                <Diagram>{`input ──► detect()
            │
            ├── starts with http(s)://  → url
            ├── .pdf                    → pdf
            ├── youtube.com / youtu.be  → youtube
            ├── arxiv.org / arxiv:      → arxiv
            ├── existing file path      → file | folder
            ├── ends .jsonl / .csv      → dataset
            └── ends .png/.jpg/.webp    → image`}</Diagram>
            </Section>

            <Section
                title="2. Format-specific extraction"
                source="apps/cli/src/ingest/*.ts"
                badges={['per-format', 'typed result']}
            >
                <p>
                    Each format has its own extractor; they all return the same{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        ExtractionResult
                    </code>{' '}
                    so downstream code doesn&apos;t need to know what kind of source it started as.
                </p>
                <Diagram>{`url      ─► article-extractor ─┐
pdf      ─► pdf-parse         ─┤
youtube  ─► transcript api    ─┼─► ExtractionResult
arxiv    ─► PDF + abstract    ─┤    { title, body, meta }
code     ─► AST walker        ─┤
markdown ─► read + frontmatter┘`}</Diagram>
            </Section>

            <Section
                title="3. Deduplication"
                source="apps/cli/src/store/sources.ts"
                badges={['SHA-256', 'content addressing']}
            >
                <p>
                    Before we touch chunking or indexing, the extracted body is hashed and checked
                    against existing sources. Same hash → no-op. This is what makes re-running{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">xargs lumen add</code>{' '}
                    on the same list cheap.
                </p>
                <Diagram>{`body
  │
  ▼
SHA-256(body) ──► hash
                    │
            ┌───────┴───────┐
            ▼               ▼
   exists in sources?      no
            │               │
            ▼               ▼
       skip (no-op)    proceed to chunker`}</Diagram>
            </Section>

            <Section
                title="4. Chunking"
                source="apps/cli/src/chunker/"
                badges={['structural', 'token-aware']}
            >
                <p>
                    Markdown is split along structural boundaries, then small fragments merge with
                    neighbors and long walls split at sentence boundaries. Each chunk inherits the
                    most recent heading above it as its section context.
                </p>
                <Diagram>{`markdown
   │
   ▼
split by ATX heading, paragraph, code, list
   │
   ▼
┌────────────────────────────┐
│ for each fragment:         │
│   if tokens < 50 → merge   │
│   if tokens > 1000 → split │
│   inherit nearest heading  │
└────────────┬───────────────┘
             ▼
        chunks[]`}</Diagram>
                <p>
                    Trade-off: structural chunking beats fixed-window on prose, loses to it on
                    code-heavy material. Most ingested content is prose, so we accept the trade.
                </p>
            </Section>

            <Section
                title="5. Storage &amp; FTS5 indexing"
                source="apps/cli/src/store/schema.ts"
                badges={['SQLite WAL', 'trigger-driven']}
            >
                <p>
                    Sources and chunks land in their tables; FTS5 virtual tables stay in sync via
                    triggers so search is incremental — no separate reindex step ever runs.
                </p>
                <Diagram>{`INSERT INTO chunks (id, source_id, content, ...)
       │
       │  trigger AFTER INSERT
       ▼
INSERT INTO chunks_fts (rowid, content)
   tokenized text now searchable

DELETE FROM chunks WHERE id = ?
       │
       │  trigger AFTER DELETE
       ▼
DELETE FROM chunks_fts WHERE rowid = ?`}</Diagram>
            </Section>

            <Section
                title="6. Compilation (LLM concept + edge extraction)"
                source="apps/cli/src/compile/"
                badges={['Claude', 'parallel by default']}
            >
                <p>
                    Compilation is what turns a corpus of chunks into a navigable graph of named
                    ideas. Each uncompiled source is fed to Claude with a structured output schema;
                    concepts and edges come back and get inserted in the same transaction as a
                    journal append.
                </p>
                <Diagram>{`uncompiled sources
        │
        ▼
┌────────────────────────────┐
│ pool size = llm.concurrency│
│ (default 4)                │
└─────────────┬──────────────┘
              ▼
      Claude.extract(chunks)
              │
              ▼
   { concepts[], edges[] }
              │
              ▼  one transaction
   INSERT concepts, INSERT edges
   journal_append('concept_create' × N)
   journal_append('trajectory'/'truth_update' as needed)`}</Diagram>
                <p>
                    Important: edges are extracted <em>within</em> a source. Cross-source edges only
                    emerge when two sources use the same concept slug — see the{' '}
                    <a
                        href="/dashboard/learn/graph-density"
                        className="text-foreground underline underline-offset-2"
                    >
                        Graph density page
                    </a>{' '}
                    for why that matters.
                </p>
            </Section>

            <Section
                title="7. BM25"
                source="apps/cli/src/search/bm25.ts"
                badges={['Okapi BM25', 'FTS5']}
            >
                <p>
                    The retrieval workhorse. SQLite&apos;s FTS5 runs Okapi BM25 natively so the
                    query is a direct{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        SELECT … MATCH …
                    </code>
                    .
                </p>
                <Diagram>{`query "agent memory"
   │
   ▼
tokenize → [agent, memory]
   │
   ▼
for each candidate chunk c:
   tf  = (freq · (k1+1)) / (freq + k1·(1 − b + b·(|c| / avg|c|)))
   idf = log((N − df + 0.5) / (df + 0.5) + 1)
   bm25(c) += Σterms tf · idf
   │
   ▼
ORDER BY bm25 DESC LIMIT k`}</Diagram>
                <p>
                    Great at precision, awful at synonymy. &quot;agent architecture&quot; finds
                    chunks with those exact words; it misses chunks that say &quot;ReAct loop.&quot;
                    That&apos;s why we fuse with TF-IDF.
                </p>
            </Section>

            <Section
                title="8. TF-IDF"
                source="apps/cli/src/search/tfidf.ts"
                badges={['cosine', 'sparse']}
            >
                <p>
                    A simpler model: each chunk and the query become sparse term-weight vectors,
                    scored by cosine similarity. Dumber than BM25 on long documents, more forgiving
                    on short queries.
                </p>
                <Diagram>{`build  q_vec = tfidf(query)
       c_vec = tfidf(chunk)  ← precomputed during ingest

score  cos(q, c) = (q · c) / (|q| · |c|)
                 = Σterms q_t · c_t / sqrt(Σ q² · Σ c²)

rank   chunks by cos desc`}</Diagram>
            </Section>

            <Section
                title="9. Reciprocal Rank Fusion"
                source="apps/cli/src/search/fusion.ts"
                badges={['parameter-free', 'k=60']}
            >
                <p>
                    Don&apos;t pick a winner between BM25 and TF-IDF — combine them. RRF&apos;s one
                    knob is the constant k that prevents top-ranked items from one ranker from
                    dominating.
                </p>
                <Diagram>{`BM25 ranking            TF-IDF ranking
  c1: rank 1              c5: rank 1
  c2: rank 2              c1: rank 2
  c3: rank 3              c2: rank 3
  c5: rank 4              c4: rank 4
     │                       │
     └───────────┬───────────┘
                 ▼
  rrf(c) = Σ over rankers r:  1 / (k + rank_r(c))
                 │
                 ▼  k = 60
            final ranking
            (resilient to either ranker's quirks)`}</Diagram>
            </Section>

            <Section
                title="10. Vector embeddings (optional)"
                source="apps/cli/src/embed/"
                badges={['OpenAI', 'Ollama', 'opt-in']}
            >
                <p>
                    If you wire up an embedding provider, Lumen populates{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        chunk_embeddings
                    </code>{' '}
                    and adds a third lane to RRF. For curated corpora, BM25 + TF-IDF usually wins on
                    cost/quality.
                </p>
                <Diagram>{`chunk text
   │
   ▼
embedder.embed(text)  ──► [f1, f2, ..., fD]
   │
   ▼
INSERT chunk_embeddings (chunk_id, vec)
   │
   ▼  at query time
ANN(top-k by cosine) ──┐
                       ├──► RRF lane 3
BM25, TF-IDF ──────────┘`}</Diagram>
            </Section>

            <Section
                title="11. PageRank"
                source="apps/cli/src/graph/pagerank.ts"
                badges={['power iteration', 'damping 0.85']}
            >
                <p>
                    Which concepts matter <em>structurally</em>? Each concept receives trust from
                    concepts that link to it, weighted by how trusted those sources are.
                </p>
                <Diagram>{`init       PR(c) = 1 / N  for all c

iterate
  for each c:
    PR'(c) = (1 − d) / N
           + d · Σ over c' ∈ in(c):  PR(c') / out_degree(c')

  PR ← PR'
until  Σ |PR(c) − PR'(c)|  <  ε

result     concepts ranked by PR desc
                = "god nodes" on the Graph page`}</Diagram>
            </Section>

            <Section
                title="12. Community detection"
                source="apps/cli/src/graph/cluster.ts"
                badges={['label propagation', 'linear time']}
            >
                <p>
                    Label propagation: every node starts with its own label, then adopts the most
                    common label among its neighbors. Converges in a few passes. Drives the color of
                    nodes on the Graph page.
                </p>
                <Diagram>{`init       label(c) = c.slug

repeat
  shuffle nodes
  for each c:
    label(c) = mode( label(n)  for n in neighbors(c) )

until no labels changed

result     concepts grouped by shared label → communities`}</Diagram>
                <p>
                    Limitation: deterministic only up to tie-breaking. Membership is stable across
                    runs; numbering isn&apos;t.
                </p>
            </Section>

            <Section
                title="13. Alias &amp; concept merge (Tier 3b)"
                source="apps/cli/src/store/aliases.ts"
                badges={['slug similarity', 'consolidation']}
            >
                <p>
                    Per-source compile fragments the graph (different sources name the same idea
                    with different slugs). The alias step finds near-duplicate slugs and merges them
                    into a canonical concept, which is how cross-source edges appear.
                </p>
                <Diagram>{`for each concept pair (a, b):
   sim = lev_ratio(a.slug, b.slug)
       + name_token_overlap(a, b)
       + co-occurrence in same sources

if sim > threshold:
   canonical = older(a, b)
   INSERT concept_aliases (alias_slug=other.slug, canonical_slug=canonical.slug)
   edges referencing the alias slug now resolve to the canonical

result   one canonical concept per real-world idea
         density goes up, communities go down`}</Diagram>
            </Section>

            <Section
                title="14. Concept scoring"
                source="apps/cli/src/store/concepts.ts"
                badges={['append-only', 'cached sum']}
            >
                <p>
                    Feedback (+1 / −1) is stored as append-only rows; the concept&apos;s cached{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">score</code> is
                    recomputed in the same transaction. The append-only design means you can always
                    reconstruct who voted what when.
                </p>
                <Diagram>{`brain_feedback(slug, delta=+1 | -1, reason)
       │
       ▼
INSERT concept_feedback (slug, delta, reason, session_id, created_at)
   │
   ▼  inside the same transaction
UPDATE concepts
   SET score = (SELECT SUM(delta) FROM concept_feedback WHERE slug=?)
   WHERE slug = ?
   │
   ▼  also
journal_append('feedback')
   ─► relay sees an encrypted delta-only row, never the reason text`}</Diagram>
            </Section>

            <Section
                title="15. Concept retirement"
                source="apps/cli/src/store/concepts.ts"
                badges={['staleness', 'reversible']}
            >
                <p>
                    Concepts no source has touched in a long while get a{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">retired_at</code>{' '}
                    timestamp and stop appearing in default search. They&apos;re not deleted;
                    they&apos;re evidence the field moved on.
                </p>
                <Diagram>{`periodic sweep (or on 'compile --enrich'):
   for c in concepts where retired_at IS NULL:
      last_touched = MAX(c.created_at, c.updated_at,
                         latest concept_feedback.created_at)
      if  now − last_touched  >  retire_after:
         UPDATE concepts SET retired_at = now WHERE slug = c.slug
         journal_append('retire')

search default:  WHERE retired_at IS NULL
search --all:    no filter (revive anytime)`}</Diagram>
            </Section>

            <Section
                title="16. PII gate"
                source="apps/cli/src/pii/patterns.ts"
                badges={['regex', 'pre-store']}
            >
                <p>
                    Every captured trajectory passes through a regex scrubber before it lands in
                    storage. Emails, tokens, API keys, obvious local paths get redacted. Cheap,
                    honest, and wired into <em>every</em> capture path so nothing routes around it.
                </p>
                <Diagram>{`trajectory step text
        │
        ▼
for pattern in PATTERNS:
   text = text.replace(pattern, '<redacted:' + label + '>')

PATTERNS:
   email           = /[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i
   api_key_anth    = /sk-ant-[A-Za-z0-9_-]{32,}/
   api_key_openai  = /sk-[A-Za-z0-9]{32,}/
   bearer_token    = /Bearer [A-Za-z0-9._-]{20,}/
   abs_path_macos  = /\\/Users\\/[^\\s]+/
   abs_path_linux  = /\\/home\\/[^\\s]+/

   ▼
sanitized text → store + journal`}</Diagram>
            </Section>

            <Section
                title="17. Sync envelope"
                source="apps/cli/src/sync/crypto.ts"
                badges={['X25519', 'XChaCha20-Poly1305', 'AEAD']}
            >
                <p>
                    Every journal entry is encrypted independently with a fresh ephemeral keypair.
                    The libsodium{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">crypto_box_seal</code>{' '}
                    pattern, with the recipient public key derived from your master key.
                </p>
                <Diagram>{`plaintext  =  JSON(journal_entry)

Kx          (32-byte master key, OS keychain)
   │
   ▼
recipient_pub = X25519_base · SHA256(Kx || "lumen-encryption-pub")

per-entry:
   ephemeral = X25519.keypair()
   shared    = X25519(ephemeral.priv, recipient_pub)
   nonce     = random(24)
   ct        = XChaCha20-Poly1305(key=shared, nonce, plaintext)

envelope   = { v=1, e=ephemeral.pub, n=nonce, c=ct }
   │
   ▼
POST /relay/{Hx}/journal  (relay sees only opaque bytes)`}</Diagram>
            </Section>

            <Section
                title="18. Journal apply &amp; LWW conflict resolution"
                source="apps/cli/src/sync/apply.ts"
                badges={['per-op handlers', 'audit history']}
            >
                <p>
                    Pulled entries land with{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">pulled_at</code> set
                    and{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        applied_at IS NULL
                    </code>
                    . The applier walks them in order and dispatches per op.
                </p>
                <Diagram>{`for entry in sync_journal WHERE pulled_at IS NOT NULL AND applied_at IS NULL:
   switch entry.op:
      'concept_create' → INSERT OR IGNORE concepts
      'trajectory'     → INSERT source (source_type='trajectory')
      'feedback'       → INSERT concept_feedback; recompute score
      'retire'         → UPDATE retired_at = entry.created_at  (idempotent)
      'truth_update'   → ┌─────────────────────────────────────────┐
                        │ if entry.updated_at > existing.updated_at│
                        │   write entry as new truth              │
                        │   prev → concept_truth_history          │
                        │ else                                    │
                        │   entry → concept_truth_history (loser) │
                        └─────────────────────────────────────────┘
   UPDATE applied_at = now`}</Diagram>
                <p>
                    Honest LWW with an audit table. We don&apos;t pretend free-form text is
                    CRDT-mergeable; the loser is preserved so you can read it later.
                </p>
            </Section>
        </article>
    );
}

function Section({
    title,
    source,
    badges,
    children,
}: {
    title: string;
    source: string;
    badges: string[];
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {source}
                    </code>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                        <Badge key={b} variant="outline" className="text-xs">
                            {b}
                        </Badge>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="text-foreground/80 space-y-3 text-sm">{children}</CardContent>
        </Card>
    );
}

function Diagram({ children }: { children: string }) {
    return (
        <pre className="bg-muted/60 text-foreground/85 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug">
            {children}
        </pre>
    );
}
