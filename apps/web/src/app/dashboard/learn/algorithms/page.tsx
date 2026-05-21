import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'daily' | 'occasional' | 'sub-mechanism' | 'not-wired';

export default function AlgorithmsPage() {
    return (
        <article className="max-w-3xl space-y-8">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold">Algorithms</h2>
                <p className="text-muted-foreground text-sm">
                    Every algorithm in Lumen with its source file, academic reference where one
                    exists, and an ASCII flow diagram. This page mirrors the table at the bottom of
                    the root <code className="bg-muted rounded px-1 font-mono">README.md</code> and
                    the longer treatment in{' '}
                    <code className="bg-muted rounded px-1 font-mono">docs/ALGORITHMS.md</code>.
                </p>
            </header>

            <AuditSummary />

            <SectionHeader>Daily — runs on every search and ingest</SectionHeader>

            <Section
                step="1"
                title="Source detection"
                source="apps/cli/src/ingest/detect.ts"
                badges={['dispatcher', 'O(1)']}
                status="daily"
            >
                <p>
                    The first thing{' '}
                    <code className="bg-muted rounded px-1 font-mono">lumen add</code> does is
                    decide what kind of source it&apos;s looking at. The dispatcher checks URL
                    shape, file extension, and magic bytes, then hands off to the matching
                    extractor.
                </p>
                <Diagram>{`input ──► detectSourceType()
            │
            ├── starts with http(s)://  → url
            ├── .pdf                    → pdf
            ├── youtube.com / youtu.be  → youtube
            ├── arxiv.org / arxiv:NNNN  → arxiv
            ├── existing file path      → file | folder
            ├── ends .jsonl / .csv      → dataset
            └── ends .png / .jpg        → image`}</Diagram>
            </Section>

            <Section
                step="2"
                title="Format-specific extraction"
                source="apps/cli/src/ingest/*.ts"
                badges={['per-format', 'no LLM']}
                status="daily"
            >
                <p>
                    Each format has its own extractor; all return the same{' '}
                    <code className="bg-muted rounded px-1 font-mono">ExtractionResult</code> so
                    downstream code never branches on input type. Zero LLM calls during ingest.
                </p>
                <Diagram>{`url      ─► @extractus/article-extractor  ─┐
pdf      ─► pdf-parse                     ─┤
youtube  ─► Innertube captions API        ─┤
arxiv    ─► Atom feed + PDF               ─┼─► ExtractionResult
code     ─► shallow git clone +           ─┤    { title, body, meta }
            .gitignore walk +              │
            per-language signatures        │
dataset  ─► schema table + 20-row preview ─┤
image    ─► optional Tesseract OCR         ┘
            (--no-ocr to skip)`}</Diagram>
            </Section>

            <Section
                step="3"
                title="Content-addressed deduplication"
                source="apps/cli/src/store/chunks.ts"
                badges={['SHA-256', 'O(1) per insert']}
                reference="Quinlan & Dorward, Venti: a new approach to archival storage, FAST 2002"
                status="daily"
            >
                <p>
                    Every chunk is hashed over <em>whitespace-normalized</em> content before
                    storage. The <code className="bg-muted rounded px-1 font-mono">chunks</code>{' '}
                    table has{' '}
                    <code className="bg-muted rounded px-1 font-mono">UNIQUE(content_hash)</code> so
                    identical chunks from different sources collapse to one row, joined to their
                    sources via a many-to-many table.
                </p>
                <Diagram>{`chunk_content
   │
   ▼  normalize_whitespace
   │
   ▼  SHA-256
content_hash
   │
   ▼  UNIQUE constraint
   ┌──── exists? ─────┐
   ▼                  ▼
 join existing      INSERT new chunk
 chunk_id           chunk_id assigned

result: same quote across 5 articles costs 1 row, not 5
        boilerplate footer across 200 files costs 1 row, not 200`}</Diagram>
            </Section>

            <Section
                step="4"
                title="Markdown-aware chunking"
                source="apps/cli/src/chunker/markdown.ts"
                badges={['structural', 'token-aware', 'O(L)']}
                status="daily"
            >
                <p>
                    Splits on structural boundaries — the unit a reader would call self-contained —
                    rather than fixed character count. Default thresholds:{' '}
                    <code className="bg-muted rounded px-1 font-mono">min_chunk_tokens=50</code>,{' '}
                    <code className="bg-muted rounded px-1 font-mono">max_chunk_tokens=1000</code>.
                </p>
                <Diagram>
                    {`markdown
   │
   ▼  split rules (in order)
   ├── # / ## / ### headings  → new chunk
   ├── code fence ` +
                        '```' +
                        `       → atomic, kept whole
   ├── lists                  → atomic when under max
   ├── blank-line paragraphs  → default split
   │
   ▼  post-pass
   ├── tokens < 50 → merge forward into neighbor
   └── tokens > 1000 → split at sentence boundary
   │
   ▼  inherit nearest heading above as section context
chunks[]`}
                </Diagram>
            </Section>

            <Section
                step="5"
                title="Storage & FTS5 indexing"
                source="apps/cli/src/store/schema.ts"
                badges={['SQLite WAL', 'trigger-driven', 'incremental']}
                status="daily"
            >
                <p>
                    Sources and chunks land in their tables; FTS5 virtual tables stay in sync via
                    triggers so search is always incremental — no separate reindex step ever runs.
                </p>
                <Diagram>{`INSERT INTO chunks (id, source_id, content, ...)
       │
       │  AFTER INSERT trigger
       ▼
INSERT INTO chunks_fts (rowid, content)
   tokenized + Porter-stemmed text now searchable

DELETE FROM chunks WHERE id = ?
       │
       │  AFTER DELETE trigger
       ▼
DELETE FROM chunks_fts WHERE rowid = ?`}</Diagram>
            </Section>

            <Section
                step="6"
                title="BM25 full-text ranking"
                source="apps/cli/src/search/bm25.ts"
                badges={['Okapi BM25', 'FTS5', 'Porter stemmed', 'O(k log N)']}
                reference="Robertson & Zaragoza, The Probabilistic Relevance Framework: BM25 and Beyond, 2009"
                status="daily"
            >
                <p>
                    BM25 is delegated to SQLite FTS5&apos;s built-in{' '}
                    <code className="bg-muted rounded px-1 font-mono">bm25()</code> function — the
                    query is a direct{' '}
                    <code className="bg-muted rounded px-1 font-mono">SELECT … MATCH …</code>.
                    FTS5&apos;s rank returns negative log-odds; Lumen normalizes it to{' '}
                    <code className="bg-muted rounded px-1 font-mono">[0, 1]</code> so it fuses
                    cleanly with TF-IDF.
                </p>
                <Diagram>{`query "agent memory"
   │
   ▼  quote each term individually so FTS5 doesn't
   │  misinterpret AND / OR / NOT / *
SELECT chunk_id, snippet(...,200), rank
  FROM chunks_fts
  WHERE chunks_fts MATCH '"agent" "memory"'
  ORDER BY rank
   │
   ▼  rank is negative (more negative = more relevant)
score_bm25(d) = (rank(d) - min) / (max - min)   ∈ [0, 1]

great at precision, terrible at synonymy.
"agent architecture" misses chunks that say "ReAct loop".`}</Diagram>
            </Section>

            <Section
                step="7"
                title="TF-IDF cosine similarity"
                source="apps/cli/src/search/tfidf.ts"
                badges={['cosine', 'in-memory inverted index', 'sublinear tf', 'lazy build']}
                reference="Salton & Buckley, Term-weighting approaches in automatic text retrieval, 1988"
                status="daily"
            >
                <p>
                    Pure-TypeScript TF-IDF over an in-memory inverted index, built lazily on first
                    search and cached until the chunk count changes. Tokenization splits on
                    non-alphanumeric <em>and</em> camelCase boundaries (
                    <code className="bg-muted rounded px-1 font-mono">getUserProfile</code> →{' '}
                    <code className="bg-muted rounded px-1 font-mono">get user profile</code>),
                    dropping tokens shorter than 2 chars.
                </p>
                <Diagram>{`index build  (O(N · L), lazy)
   for each chunk d, for each term t:
      tf(t, d)  = 1 + log( raw_freq(t, d) )        ← sublinear
      idf(t)    = log( N / df(t) )
      weight    = tf · idf
      append to inverted index[t]
   precompute |d|² for cosine norm

query scoring  (O(Q · M))
   for each query term t in q:
      walk inverted index[t] — only touched docs score
      accumulate dot product q · d

   cos(q, d) = (q · d) / (|q| · |d|)

sort chunks by cosine desc, limit k.

complement to BM25 — TF-IDF picks up rarer-term overlap
where BM25's length normalization buries it.`}</Diagram>
            </Section>

            <Section
                step="8"
                title="Reciprocal Rank Fusion"
                source="apps/cli/src/search/fusion.ts"
                badges={['parameter-free', 'k=60', 'rank-only', 'weighted']}
                reference="Cormack, Clarke & Büttcher, Reciprocal Rank Fusion outperforms Condorcet, SIGIR 2009"
                status="daily"
            >
                <p>
                    Two ranked lists (BM25, TF-IDF) are merged via weighted RRF. The constant{' '}
                    <code className="bg-muted rounded px-1 font-mono">k = 60</code> is the value
                    from the original paper; per-signal weights{' '}
                    <code className="bg-muted rounded px-1 font-mono">w_i</code> are configured in{' '}
                    <code className="bg-muted rounded px-1 font-mono">search/index.ts</code>.
                </p>
                <Diagram>{`                          weight  rank_i(d)
                            │       │
                            ▼       ▼
   rrf_score(d) = Σ over signals i:   w_i / ( k + rank_i(d) )

   k = 60

BM25 ranking         TF-IDF ranking
  c1: rank 1           c5: rank 1
  c2: rank 2           c1: rank 2
  c3: rank 3           c2: rank 3
  c5: rank 4           c4: rank 4
       └────────────────┘
                │
                ▼  rank-only — no score-scale calibration needed
          final ranking`}</Diagram>
            </Section>

            <Section
                step="9"
                title="Relevance-density budget cut"
                source="apps/cli/src/search/budget.ts"
                badges={['greedy', 'token-aware', 'O(N log N)']}
                status="daily"
            >
                <p>
                    After RRF, Lumen must fit the top results inside a caller-supplied token budget
                    (default 4,000). Instead of greedy-by-score, it sorts by{' '}
                    <strong>relevance density</strong> — small, high-value chunks beat verbose
                    low-value ones, which is the classic failure mode of naive top-k feeding an LLM.
                </p>
                <Diagram>{`for each candidate d:
   density(d) = rrf_score(d) / token_count(d)

sort by density desc
greedy fill:
   for d in sorted order:
      if running_tokens + tokens(d) ≤ budget:
         keep(d)
         running_tokens += tokens(d)

example
   chunk A:  50 tok, score 0.80 → density 0.0160
   chunk B: 2000 tok, score 0.90 → density 0.00045

   A beats B in the budget cut.`}</Diagram>
            </Section>

            <Section
                step="10"
                title="Alias & concept merge (Tier 3b)"
                source="apps/cli/src/store/aliases.ts · dedup/policy.ts"
                badges={['3-gate', 'on-write', 'consolidates cross-source']}
                status="daily"
            >
                <p>
                    When a new concept lands, Lumen checks whether it&apos;s really a duplicate of
                    an existing one and folds them together. The merge gate requires{' '}
                    <strong>all three</strong> conditions to hold so it never folds genuinely
                    different concepts.
                </p>
                <Diagram>{`incoming concept  C_new
existing concept  C_can (candidate canonical)

gate (must satisfy all three)
   ① slug:    slugSimilarity(C_new, C_can)            ≥ 0.7
              (Levenshtein-normalized — see sub-mechanisms below)
   ② content: jaccardSimilarity(tokens_new, tokens_can) ≥ 0.6
              over distinct ≥3-char tokens
              from name + compiled_truth
   ③ size:    |tokens(C_new)| ≥ 4  AND  |tokens(C_can)| ≥ 4
              (thin-content guard)

if all three pass:
   canonical = older(C_new, C_can)
   INSERT concept_aliases (alias_slug, canonical_slug)
   future lookups for either slug → canonical row
   edges + feedback accumulate on canonical
   ← cross-source clusters in the graph finally consolidate`}</Diagram>
            </Section>

            <Section
                step="11"
                title="Concept scoring"
                source="apps/cli/src/store/concepts.ts · store/feedback.ts"
                badges={['append-only', 'cached sum']}
                status="daily"
            >
                <p>
                    Feedback (+1 / −1) is stored as append-only rows; the concept&apos;s cached{' '}
                    <code className="bg-muted rounded px-1 font-mono">score</code> is recomputed in
                    the same transaction. Append-only means you can always reconstruct who voted
                    what and when.
                </p>
                <Diagram>{`brain_feedback(slug, delta=+1 | -1, reason)
       │
       ▼  same transaction
INSERT concept_feedback (slug, delta, reason, session_id, created_at)
UPDATE concepts
   SET score = (SELECT SUM(delta) FROM concept_feedback WHERE slug=?)
   WHERE slug = ?
journal_append('feedback')
       │
       ▼
relay sees an encrypted delta-only row — never the reason text.`}</Diagram>
            </Section>

            <Section
                step="12"
                title="PII gate"
                source="apps/cli/src/pii/patterns.ts"
                badges={['regex', 'pre-store', 'strict-mode option']}
                status="daily"
            >
                <p>
                    Deterministic regex scrubber runs over every agent-originated capture before it
                    hits the database (called four times in{' '}
                    <code className="bg-muted rounded px-1 font-mono">mcp/server.ts</code> — title,
                    content, context, summary). Strict mode (opt-in) <em>rejects</em> the write if
                    any pattern matches instead of scrubbing in place.
                </p>
                <Diagram>{`captured text
   │
   ▼
for pattern in PATTERNS:
   text = text.replace(pattern, '<REDACTED:' + label + '>')

PATTERNS
   email                 → <REDACTED:email>
   api_key_anthropic     → sk-ant-...
   api_key_openai        → sk-...
   api_key_aws_access    → AKIA...
   api_key_github        → ghp_... / gho_... / ghu_... / ghs_... / ghr_...
   api_key_slack         → xoxb-... / xoxa-... / xoxp-...
   jwt                   → eyJ...<base64>...<base64>
   bearer_token          → Authorization: Bearer ...
   credit_card           → 13-19 digits, validated by Luhn (sub-mechanism)
   phone_number          → E.164 + common national formats
   ipv4_private          → 10/8 · 172.16/12 · 192.168/16
   abs_path_macos        → /Users/<name>/...
   abs_path_linux        → /home/<name>/...
   │
   ▼
sanitized text → store + journal
   stable replacement tokens — same key always gets the same redaction`}</Diagram>
            </Section>

            <SectionHeader>On-action — runs on user-triggered commands</SectionHeader>

            <Section
                step="13"
                title="Compilation"
                source="apps/cli/src/compile/ · llm/compiler.ts"
                badges={['Claude', 'parallel', 'prompt-cached', 'delta-aware']}
                status="occasional"
            >
                <p>
                    Compilation turns chunks into a navigable graph of named ideas. Each uncompiled
                    source is fed to Claude with a structured output schema; concepts and edges come
                    back and get inserted inside the same transaction as a journal append.
                    Delta-aware: <code className="bg-muted rounded px-1 font-mono">compile</code>{' '}
                    only touches unprocessed sources;{' '}
                    <code className="bg-muted rounded px-1 font-mono">--all</code> reprocesses
                    everything. Prompt caching (
                    <code className="bg-muted rounded px-1 font-mono">
                        cache_control: ephemeral
                    </code>
                    ) gives ~60–80% cost reduction on repeated calls within a session.
                </p>
                <Diagram>{`uncompiled sources
        │
        ▼  pool size = llm.concurrency (default 4)
   Claude.extract(chunks, schema)
        │
        ▼
   { concepts[], edges[] }
        │
        ▼  one transaction
   INSERT concepts / edges
   journal_append('concept_create' / 'truth_update')

cross-source edges only emerge when two sources
use the same slug. The alias merge step (§10) is
what actually consolidates them.`}</Diagram>
            </Section>

            <Section
                step="14"
                title="PageRank"
                source="apps/cli/src/graph/pagerank.ts"
                badges={['power iteration', 'damping 0.85', 'dangling-safe']}
                reference="Page, Brin, Motwani & Winograd, The PageRank Citation Ranking, Stanford 1998"
                status="occasional"
            >
                <p>
                    Power-iteration PageRank with explicit dangling-node handling. Drives the{' '}
                    <strong>god nodes</strong> list — the most structurally important concepts — on
                    the graph page and in{' '}
                    <code className="bg-muted rounded px-1 font-mono">lumen graph pagerank</code>.
                </p>
                <Diagram>{`init       PR(i) = 1 / N  for all i

iterate
  dangling = Σ PR(j) over nodes j with out_degree(j) = 0

  for each i:
    PR'(i) = (1 − d) / N
           + d · [ Σ over j→i:  PR(j) / out_degree(j)
                 + dangling / N ]

  PR ← PR'

terminate  when  Σ |PR'(i) − PR(i)|  <  1e-6
              or 100 iterations

d = 0.85 (damping)
typical convergence: 20–40 iterations
complexity:          O(I · (N + E))`}</Diagram>
            </Section>

            <Section
                step="15"
                title="Label-propagation community detection"
                source="apps/cli/src/graph/cluster.ts"
                badges={['near-linear', 'no modularity']}
                reference="Raghavan, Albert & Kumara, Near linear time algorithm…, Phys. Rev. E 76(3), 2007"
                status="occasional"
            >
                <p>
                    Every node starts with a unique label; on each iteration nodes adopt the most
                    frequent label among their neighbors, with ties broken first-seen. Node order is
                    shuffled per iteration to improve convergence stability. Terminates when no
                    labels change, or at 50 iterations.
                </p>
                <Diagram>{`init     label(c) = c.slug  for every concept c

repeat
   shuffle nodes
   for each c:
      label(c) = mode( label(n)  for n in neighbors(c) )
                 (ties broken by first-seen)

until no labels change   or  50 iterations

result   concepts grouped by shared label → communities
         typical I = 5–10 on real graphs
         complexity ≈ O(I · E)

why not Louvain / Leiden?  Slightly cleaner communities,
much more expensive — modularity computation each pass.
At hundreds-to-low-thousands of nodes, LP wins.`}</Diagram>
            </Section>

            <Section
                step="16"
                title="Concept retirement"
                source="apps/cli/src/store/concepts.ts · store/feedback.ts"
                badges={['threshold -3', 'soft delete', 'reversible']}
                status="occasional"
            >
                <p>
                    Two retirement paths. <strong>Automatic</strong>: when{' '}
                    <code className="bg-muted rounded px-1 font-mono">score ≤ -3</code> the concept
                    is soft-deleted with the most recent negative reason recorded.{' '}
                    <strong>Explicit</strong>:{' '}
                    <code className="bg-muted rounded px-1 font-mono">
                        retire_skill(slug, reason)
                    </code>{' '}
                    works the same way. Retired concepts are hidden from{' '}
                    <code className="bg-muted rounded px-1 font-mono">brain_ops</code> search but
                    remain queryable for history and can be revived.
                </p>
                <Diagram>{`auto path
   feedback delta arrives → recompute score
   if score ≤ -3 and retired_at IS NULL:
      retired_at = now
      retire_reason = latest concept_feedback.reason (where delta < 0)
      journal_append('retire')

explicit path
   retire_skill(slug, reason)
      same writes as above, reason taken from caller

search behavior
   default              WHERE retired_at IS NULL
   --include-retired    no filter (history view)`}</Diagram>
            </Section>

            <Section
                step="17"
                title="Sync envelope"
                source="apps/cli/src/sync/crypto.ts"
                badges={['X25519', 'XChaCha20-Poly1305', 'AEAD', 'domain-separated']}
                status="occasional"
            >
                <p>
                    Every journal entry is encrypted independently with a fresh ephemeral keypair.
                    Recipient public key is itself derived from the user&apos;s master key via a
                    domain-separated SHA-256 — the relay sees neither key, only the ciphertext.
                </p>
                <Diagram>{`Kx          (32-byte master key, OS keychain)
   │
   ▼  domain-separated SHA-256 derivations
   ├── relay routing key   = SHA256(Kx ‖ "lumen-relay-routing")[:16]
   ├── recipient pub       = X25519_base · SHA256(Kx ‖ "lumen-encryption-pub")
   ├── scope routing tag   = HMAC-SHA256(Kx, scope_kind ‖ ":" ‖ scope_key)
   └── key fingerprint     = SHA256(Kx ‖ "lumen-fingerprint")[:8]

per-entry envelope
   ephemeral = X25519.keypair()
   shared    = X25519(ephemeral.priv, recipient_pub)
   nonce     = random(24)
   ct        = XChaCha20-Poly1305(key=shared, nonce, plaintext)

   envelope = { v=1, e=ephemeral.pub, n=nonce, c=ct }
   │
   ▼
POST /relay/{routing_key}/journal     (relay holds opaque bytes only)`}</Diagram>
            </Section>

            <Section
                step="18"
                title="Journal apply & LWW conflict resolution"
                source="apps/cli/src/sync/apply.ts"
                badges={['per-op handlers', 'audit history', 'UUIDv7-ordered']}
                status="occasional"
            >
                <p>
                    Each journal row carries an{' '}
                    <code className="bg-muted rounded px-1 font-mono">
                        (op, entity_id, scope, payload, device_id)
                    </code>{' '}
                    tuple plus a UUIDv7-shape sortable id:{' '}
                    <code className="bg-muted rounded px-1 font-mono">
                        12 hex unix-ms + 4 hex monotonic counter + 16 hex random
                    </code>
                    . Pulled entries land with{' '}
                    <code className="bg-muted rounded px-1 font-mono">pulled_at</code> set; the
                    applier walks them in order and dispatches per op.
                </p>
                <Diagram>{`for entry in sync_journal WHERE pulled_at IS NOT NULL
                            AND applied_at IS NULL
                          ORDER BY sync_id:
   switch entry.op:
      'concept_create' → INSERT OR IGNORE concepts
      'trajectory'     → INSERT source (source_type='trajectory')
      'feedback'       → INSERT concept_feedback; recompute score
      'retire'         → UPDATE retired_at = entry.created_at  (idempotent)
      'truth_update'   → ┌────────────────────────────────────────────┐
                        │ if entry.updated_at > existing.updated_at  │
                        │   write entry as new truth                 │
                        │   prev → concept_truth_history             │
                        │ else                                       │
                        │   entry → concept_truth_history (loser)    │
                        └────────────────────────────────────────────┘
   UPDATE applied_at = now`}</Diagram>
            </Section>

            <CollapsibleGroup
                title="Sub-mechanisms"
                subtitle="Algorithms used inside the ones above, not directly user-facing"
            >
                <Section
                    step="A"
                    title="Jaccard similarity"
                    source="apps/cli/src/dedup/similarity.ts · dedup/policy.ts"
                    badges={['set overlap', '1901']}
                    reference="Jaccard, Étude comparative de la distribution florale, Bull. Soc. Vaudoise 37, 1901"
                    status="sub-mechanism"
                    nested
                >
                    <p>
                        Set-overlap ratio. Used as the <strong>content gate</strong> inside the
                        alias merge step (§10).
                    </p>
                    <Diagram>{`jaccard(A, B) = |A ∩ B| / |A ∪ B|     ∈ [0, 1]

inside alias merge (§10):
   threshold ≥ 0.6 (different phrasings of the same concept)
   token set: distinct ≥3-char tokens from compiled_truth + name
   AND requires ≥ 4 distinct tokens on both sides
   (thin-content guard against placeholder collisions)`}</Diagram>
                </Section>

                <Section
                    step="B"
                    title="Levenshtein distance"
                    source="apps/cli/src/dedup/policy.ts"
                    badges={['edit distance', '1966']}
                    reference="Levenshtein, Binary codes capable of correcting deletions, insertions, and reversals, 1966"
                    status="sub-mechanism"
                    nested
                >
                    <p>
                        Minimum edit distance between two strings. The length-normalized variant —
                        the <em>ratio</em> — is the <strong>slug gate</strong> inside alias merge
                        (§10).
                    </p>
                    <Diagram>{`lev(a, b)   = min number of single-char edits to turn a → b
ratio(a, b) = 1 − lev(a, b) / max(|a|, |b|)        ∈ [0, 1]

example
   ratio("add-route", "add-routes")           = 0.90
   ratio("react-hooks", "react-state-hooks")  = 0.65
   ratio("foo", "bar")                        = 0.00

inside alias merge (§10):
   threshold ≥ 0.7 acts as the slug gate.`}</Diagram>
                </Section>

                <Section
                    step="C"
                    title="Luhn checksum"
                    source="apps/cli/src/pii/patterns.ts (internal)"
                    badges={['mod-10', '1960']}
                    reference="Luhn, Computer for Verifying Numbers, U.S. Patent 2,950,048, 1960"
                    status="sub-mechanism"
                    nested
                >
                    <p>
                        Used inside the PII gate (§12) to drop false-positive credit-card matches.
                        Random 16-digit IDs match the regex shape but fail Luhn&apos;s mod-10 check,
                        so we only redact strings that look like real card numbers.
                    </p>
                    <Diagram>{`number_digits = strip non-digits  ← regex shape match (13–19 digits)

luhn(digits):
   sum = 0
   alt = false                       ← rightmost digit first
   for d in reverse(digits):
      if alt:
         d *= 2
         if d > 9:  d -= 9
      sum += d
      alt = not alt
   return sum % 10 == 0

inside PII gate (§12) decision
   regex matches AND luhn(digits) == 0  → redact
   regex matches AND luhn(digits) != 0  → leave alone
      (random tracking ID, order number, etc.)`}</Diagram>
                </Section>
            </CollapsibleGroup>

            <CollapsibleGroup
                title="Designed but not yet wired in main"
                subtitle="Source files exist but no production code path calls them today"
                warning
            >
                <Section
                    step="X1"
                    title="Graph-walk retrieval"
                    source="apps/cli/src/search/graph.ts (stub)"
                    badges={['planned third lane', 'no exports yet']}
                    status="not-wired"
                    nested
                >
                    <p>
                        Originally planned as the third retrieval lane alongside BM25 and TF-IDF:
                        identify concepts mentioned in top results, walk 1–2 hops on the compiled
                        graph, inject chunks anchored to neighboring concepts so structurally-
                        related results surface even without a query-term match.{' '}
                        <strong>Currently a stub file with one comment line and no exports.</strong>{' '}
                        Graph traversal at query time is delegated through intent classification in{' '}
                        <code className="bg-muted rounded px-1 font-mono">search/index.ts</code>{' '}
                        (which dispatches to{' '}
                        <code className="bg-muted rounded px-1 font-mono">graph/engine.ts</code>),
                        not as a third RRF lane.
                    </p>
                    <Diagram>{`planned (not wired)
   top-K chunks from BM25 ∪ TF-IDF
         │
         ▼  resolve to concepts they mention
   neighbors(c) ∪ ...  (depth ≤ 2)
         │
         ▼
   inject chunks anchored to neighbor concepts
         │
         ▼
   feed into RRF as a third lane

today: shortest_path() / neighborhood() in graph/engine.ts
       drive the Graph dashboard, but not the search ranking.`}</Diagram>
                </Section>

                <Section
                    step="X2"
                    title="Compression pipeline"
                    source="apps/cli/src/compress/pipeline.ts (no callers)"
                    badges={['3 designed stages', 'no callers']}
                    status="not-wired"
                    nested
                >
                    <p>
                        A 3-stage compression pipeline was designed —{' '}
                        <em>structural preservation</em> (keep headings, code, paragraphs; collapse
                        long lists),
                        <em> near-duplicate sentence removal</em> via Jaccard ≥ 0.8, and{' '}
                        <em>extractive scoring</em> (X3 below).{' '}
                        <strong>
                            The exported <code>compress()</code> function in{' '}
                            <code>compress/pipeline.ts</code> has no callers in production code.
                        </strong>{' '}
                        The intent was to shrink LLM prompts before synthesis without losing
                        attribution; it never got wired into the budget-cut → LLM path.
                    </p>
                    <Diagram>{`planned (not wired)
   chunks (post budget cut)
         │
         ▼  stage 1: structural preservation (compress/structural.ts)
         ▼  stage 2: near-dup removal via Jaccard (compress/dedup.ts)
         ▼  stage 3: extractive scoring (X3 below)
   compressed prompt

today: search/budget.ts (§9) outputs chunks straight to the LLM
       with no compression stage in between.`}</Diagram>
                </Section>

                <Section
                    step="X3"
                    title="Extractive summarization"
                    source="apps/cli/src/compress/extractive.ts (only called by X2)"
                    badges={['Luhn 1958', 'no live callers']}
                    reference="Luhn, The Automatic Creation of Literature Abstracts, IBM Journal 2(2), 1958"
                    status="not-wired"
                    nested
                >
                    <p>
                        Position-boosted sentence scoring designed as stage 3 of the compression
                        pipeline (X2). Since X2 has no production callers, X3 is reachable from
                        tests only — its only live call site is the pipeline that never runs.
                    </p>
                    <Diagram>{`planned (not wired)
   for each sentence s in chunk:
      score(s) = mean( tf(t)  for t in tokens(s) )
      if  position(s) in [0..2] or [N-2..N-1]:
         score(s) *= 1.5         ← Luhn's lead+tail boost

   select top ceil(0.6 · N) sentences (min 3)
   restore original positions

today: never called outside compress/pipeline.ts and tests.`}</Diagram>
                </Section>
            </CollapsibleGroup>
        </article>
    );
}

function AuditSummary() {
    return (
        <div className="bg-muted/40 border-border space-y-2 rounded-md border p-4 text-xs">
            <p className="text-xs font-semibold tracking-wider uppercase">
                What runs in the current codebase
            </p>
            <p className="text-muted-foreground">
                Audit against{' '}
                <code className="bg-background rounded px-1 font-mono">apps/cli/src/</code> callers
                as of this commit. Numbers below match the section labels:
            </p>
            <ul className="text-muted-foreground space-y-1">
                <li>
                    <strong className="text-foreground">12 daily</strong> — every search and every
                    ingest touches these (§1–§12).
                </li>
                <li>
                    <strong className="text-foreground">6 on-action</strong> — run when the user
                    explicitly invokes compile, graph, retire, or sync (§13–§18).
                </li>
                <li>
                    <strong className="text-foreground">3 sub-mechanisms</strong> — used inside the
                    above (alias merge + PII gate), collapsed below.
                </li>
                <li>
                    <strong className="text-foreground">3 designed but not yet wired</strong> —
                    source files exist with no production callers; collapsed below with a warning so
                    this page doesn&apos;t mislead readers into thinking they run today.
                </li>
            </ul>
        </div>
    );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="border-border/60 text-muted-foreground -mb-4 border-b pb-2 text-xs font-semibold tracking-wider uppercase">
            {children}
        </h3>
    );
}

function Section({
    step,
    title,
    source,
    badges,
    reference,
    status,
    nested,
    children,
}: {
    step: string;
    title: string;
    source: string;
    badges: string[];
    reference?: string;
    status: Status;
    nested?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Card className={nested ? 'border-border/60' : undefined}>
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold',
                                nested
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-foreground text-background',
                            )}
                        >
                            {step}
                        </span>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <StatusPill status={status} />
                    </div>
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
                {reference && (
                    <p className="text-muted-foreground border-l-2 border-blue-500/40 pl-2 text-[11px] italic">
                        Reference — {reference}
                    </p>
                )}
            </CardHeader>
            <CardContent className="text-foreground/80 space-y-3 text-sm">{children}</CardContent>
        </Card>
    );
}

function StatusPill({ status }: { status: Status }) {
    const styles: Record<Status, string> = {
        daily: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        occasional: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        'sub-mechanism': 'bg-muted text-muted-foreground border-border',
        'not-wired': 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    };
    const label: Record<Status, string> = {
        daily: 'daily',
        occasional: 'on-action',
        'sub-mechanism': 'sub-mechanism',
        'not-wired': 'not yet wired',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                styles[status],
            )}
        >
            {label[status]}
        </span>
    );
}

function CollapsibleGroup({
    title,
    subtitle,
    warning,
    children,
}: {
    title: string;
    subtitle: string;
    warning?: boolean;
    children: React.ReactNode;
}) {
    return (
        <details
            className={cn(
                'group rounded-xl border p-2',
                warning ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card/30',
            )}
        >
            <summary className="hover:bg-muted/30 flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2.5 transition-colors">
                <div>
                    <p className="text-sm font-semibold tracking-tight">{title}</p>
                    <p className="text-muted-foreground text-xs">{subtitle}</p>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180"
                    aria-hidden
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </summary>
            <div className="space-y-4 px-1 pt-3 pb-1">{children}</div>
        </details>
    );
}

function Diagram({ children }: { children: string }) {
    return (
        <pre className="bg-muted/60 text-foreground/85 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug">
            {children}
        </pre>
    );
}
