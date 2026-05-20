import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

            <Section
                title="1. Source detection"
                source="apps/cli/src/ingest/detect.ts"
                badges={['dispatcher', 'O(1)']}
            >
                <p>
                    The first thing{' '}
                    <code className="bg-muted rounded px-1 font-mono">lumen add</code> does is
                    decide what kind of source it&apos;s looking at. The dispatcher checks URL
                    shape, file extension, and magic bytes, then hands off to the matching
                    extractor.
                </p>
                <Diagram>{`input ──► detect()
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
                title="2. Format-specific extraction"
                source="apps/cli/src/ingest/*.ts"
                badges={['per-format', 'no LLM']}
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
                title="3. Content-addressed deduplication"
                source="apps/cli/src/chunker/index.ts · store/chunks.ts"
                badges={['SHA-256', 'O(1) per insert']}
                reference="Quinlan & Dorward, Venti: a new approach to archival storage, FAST 2002"
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
                title="4. Markdown-aware chunking"
                source="apps/cli/src/chunker/markdown.ts"
                badges={['structural', 'token-aware', 'O(L)']}
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
                title="5. Storage & FTS5 indexing"
                source="apps/cli/src/store/schema.ts"
                badges={['SQLite WAL', 'trigger-driven', 'incremental']}
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
                title="6. Compilation"
                source="apps/cli/src/compile/"
                badges={['Claude', 'parallel', 'prompt-cached', 'delta-aware']}
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
use the same slug. The alias merge step (§15) is
what actually consolidates them.`}</Diagram>
            </Section>

            <Section
                title="7. BM25 full-text ranking"
                source="apps/cli/src/search/bm25.ts"
                badges={['Okapi BM25', 'FTS5', 'Porter stemmed', 'O(k log N)']}
                reference="Robertson & Zaragoza, The Probabilistic Relevance Framework: BM25 and Beyond, 2009"
            >
                <p>
                    BM25 is delegated to SQLite FTS5&apos;s built-in{' '}
                    <code className="bg-muted rounded px-1 font-mono">bm25()</code> function — the
                    query is a direct{' '}
                    <code className="bg-muted rounded px-1 font-mono">SELECT … MATCH …</code>.
                    FTS5&apos;s rank returns negative log-odds; Lumen normalizes it to{' '}
                    <code className="bg-muted rounded px-1 font-mono">[0, 1]</code> so it fuses
                    cleanly with TF-IDF and graph-walk later.
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
                title="8. TF-IDF cosine similarity"
                source="apps/cli/src/search/tfidf.ts"
                badges={['cosine', 'in-memory inverted index', 'sublinear tf', 'lazy build']}
                reference="Salton & Buckley, Term-weighting approaches in automatic text retrieval, 1988"
            >
                <p>
                    Pure-TypeScript TF-IDF over an in-memory inverted index, built lazily on first
                    search and cached until the chunk count changes. Tokenization splits on
                    non-alphanumeric <em>and</em> camelCase boundaries (
                    <code className="bg-muted rounded px-1 font-mono">getUserProfile</code> →{' '}
                    <code className="bg-muted rounded px-1 font-mono">get user profile</code>
                    ), dropping tokens shorter than 2 chars.
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
                title="9. Graph-walk retrieval"
                source="apps/cli/src/search/graph.ts"
                badges={['1–2 hops', 'concept-anchored', 'structural']}
            >
                <p>
                    The third retrieval signal alongside BM25 and TF-IDF. After the first two rank
                    chunks, Lumen identifies the concepts those chunks anchor to, walks 1–2 hops on
                    the compiled graph, and injects additional chunks from neighboring concepts.
                    This surfaces structurally-related results that don&apos;t match any query term.
                </p>
                <Diagram>{`top-K chunks from BM25 ∪ TF-IDF
        │
        ▼  resolve to concepts they mention
   { concept_a, concept_b, ... }
        │
        ▼  graph walk (depth ≤ 2)
   neighbors(a) ∪ neighbors(b) ∪ ...
        │
        ▼  fetch chunks anchored to neighbor concepts
   additional candidates
        │
        ▼  feeds into the fusion lane (§10)

"agent swarm" query surfaces a chunk about "single-agent"
pipelines via the contradicts/extends edge between them —
even though no query term appears in the second chunk.`}</Diagram>
            </Section>

            <Section
                title="10. Reciprocal Rank Fusion"
                source="apps/cli/src/search/fusion.ts"
                badges={['parameter-free', 'k=60', 'rank-only', 'weighted']}
                reference="Cormack, Clarke & Büttcher, Reciprocal Rank Fusion outperforms Condorcet, SIGIR 2009"
            >
                <p>
                    Three ranked lists (BM25, TF-IDF, graph-walk) are merged via weighted RRF. The
                    constant <code className="bg-muted rounded px-1 font-mono">k = 60</code> is the
                    value from the original paper; per-signal weights{' '}
                    <code className="bg-muted rounded px-1 font-mono">w_i</code> are configured in{' '}
                    <code className="bg-muted rounded px-1 font-mono">search/index.ts</code>. Rank
                    is 1-based, so the #1 result of each signal contributes{' '}
                    <code className="bg-muted rounded px-1 font-mono">w / 61</code>.
                </p>
                <Diagram>{`                          weight  rank_i(d)
                            │       │
                            ▼       ▼
   rrf_score(d) = Σ over signals i:   w_i / ( k + rank_i(d) )

   k = 60

BM25 ranking         TF-IDF ranking       Graph-walk ranking
  c1: rank 1           c5: rank 1           c4: rank 1
  c2: rank 2           c1: rank 2           c1: rank 2
  c3: rank 3           c2: rank 3           c6: rank 3
  c5: rank 4           c4: rank 4           c2: rank 4
       └────────────────┴────────────────────┘
                        │
                        ▼  rank-only — no score-scale calibration needed
                  final ranking`}</Diagram>
            </Section>

            <Section
                title="11. Relevance-density budget cut"
                source="apps/cli/src/search/budget.ts"
                badges={['greedy', 'token-aware', 'O(N log N)']}
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
                title="12. Compression pipeline"
                source="apps/cli/src/compress/*"
                badges={['monotonically shrinking', '3 stages']}
            >
                <p>
                    Selected chunks pass through three sequential stages before hitting the LLM. The
                    pipeline only <em>removes</em> content, never rewrites — attribution back to
                    source files remains valid.
                </p>
                <Diagram>{`chunks (post budget cut)
        │
        ▼  stage 1: structural preservation
        │   keep headings, code fences, paragraphs verbatim
        │   collapse lists: keep first 5; "... (N-5 more items omitted)"
        ▼
        │  stage 2: near-duplicate removal  (Jaccard ≥ 0.8 — see §16)
        │   walk sentences; drop if too similar to one already kept
        │   sentences < 3 tokens always kept
        ▼
        │  stage 3: extractive scoring  (see §13)
        │   keep top ceil(0.6 · N) sentences, restore original order
        ▼
compressed prompt (typically ~40% smaller, attribution intact)`}</Diagram>
            </Section>

            <Section
                title="13. Extractive summarization"
                source="apps/cli/src/compress/extractive.ts"
                badges={['Luhn 1958', 'sentence scoring', 'position-boosted']}
                reference="Luhn, The Automatic Creation of Literature Abstracts, IBM Journal 2(2), 1958"
            >
                <p>
                    Stage 3 of the compression pipeline. Score each sentence by average term
                    frequency across the chunk, with a 1.5× position boost for the first 3 and last
                    2 sentences — Luhn&apos;s original intuition that openings and closings carry
                    disproportionate information. Keep the top{' '}
                    <code className="bg-muted rounded px-1 font-mono">ceil(0.6 · N)</code>, minimum
                    3. Restore original order so the prose reads naturally.
                </p>
                <Diagram>{`for each sentence s in chunk:
   score(s) = mean( tf(t)  for t in tokens(s) )
   if  position(s) in [0..2] or [N-2..N-1]:
      score(s) *= 1.5         ← Luhn's lead+tail boost

select top ceil(0.6 · N) sentences (min 3)
restore original positions
emit compressed chunk

complexity:  O(N · T) scoring · O(N log N) top-k`}</Diagram>
            </Section>

            <Section
                title="14. PageRank"
                source="apps/cli/src/graph/pagerank.ts"
                badges={['power iteration', 'damping 0.85', 'dangling-safe']}
                reference="Page, Brin, Motwani & Winograd, The PageRank Citation Ranking, Stanford 1998"
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
                title="15. Label-propagation community detection"
                source="apps/cli/src/graph/cluster.ts"
                badges={['near-linear', 'no modularity']}
                reference="Raghavan, Albert & Kumara, Near linear time algorithm…, Phys. Rev. E 76(3), 2007"
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
                title="16. Jaccard similarity"
                source="apps/cli/src/dedup/similarity.ts · compress/dedup.ts"
                badges={['set overlap', '1901', 'used in 2 places']}
                reference="Jaccard, Étude comparative de la distribution florale, Bull. Soc. Vaudoise 37, 1901"
            >
                <p>
                    Set-overlap ratio. Used in two distinct places in Lumen with different
                    thresholds tuned to each purpose.
                </p>
                <Diagram>{`jaccard(A, B) = |A ∩ B| / |A ∪ B|     ∈ [0, 1]

use #1 — near-duplicate sentence removal in the compression pipeline
   threshold ≥ 0.8 (high — only drop true echoes)
   token set: alphanumeric, length ≥ 3, lowercase
   sentences < 3 tokens always kept

use #2 — content gate in alias merge (§17)
   threshold ≥ 0.6 (looser — different phrasings of the same concept)
   token set: distinct ≥3-char tokens from compiled_truth + name
   AND requires ≥ 4 distinct tokens on both sides
   (thin-content guard against placeholder collisions)`}</Diagram>
            </Section>

            <Section
                title="17. Levenshtein distance"
                source="apps/cli/src/store/aliases.ts"
                badges={['edit distance', '1966', 'slug similarity']}
                reference="Levenshtein, Binary codes capable of correcting deletions, insertions, and reversals, 1966"
            >
                <p>
                    Minimum edit distance (insert, delete, substitute) between two strings. Lumen
                    uses the length-normalized variant — the <em>ratio</em> — so slugs of different
                    lengths compare fairly.
                </p>
                <Diagram>{`lev(a, b)  = min number of single-char edits to turn a → b
ratio(a, b) = 1 − lev(a, b) / max(|a|, |b|)        ∈ [0, 1]

example
   ratio("add-route", "add-routes")           = 0.90
   ratio("react-hooks", "react-state-hooks")  = 0.65
   ratio("foo", "bar")                        = 0.00

threshold ≥ 0.7 acts as the slug gate in alias merge (§18).`}</Diagram>
            </Section>

            <Section
                title="18. Alias & concept merge (Tier 3b)"
                source="apps/cli/src/store/aliases.ts"
                badges={['3-gate', 'on-write', 'consolidates cross-source']}
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
   ① slug:    levenshtein_ratio(C_new.slug, C_can.slug)  ≥ 0.7
   ② content: jaccard(tokens(C_new), tokens(C_can))      ≥ 0.6
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
                title="19. Concept scoring"
                source="apps/cli/src/store/concepts.ts"
                badges={['append-only', 'cached sum']}
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
                title="20. Concept retirement"
                source="apps/cli/src/store/concepts.ts"
                badges={['threshold -3', 'soft delete', 'reversible']}
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
                title="21. PII gate"
                source="apps/cli/src/pii/patterns.ts"
                badges={['regex', 'pre-store', 'strict-mode option']}
            >
                <p>
                    Deterministic regex scrubber runs over every agent-originated capture before it
                    hits the database. Strict mode (opt-in) <em>rejects</em> the write if any
                    pattern matches instead of scrubbing in place — useful when you want a hard
                    floor against any sensitive content leaking into the graph.
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
   api_key_gcp           → service-account JSON / bearer
   jwt                   → eyJ...<base64>...<base64>
   bearer_token          → Authorization: Bearer ...
   credit_card           → 13-19 digits, validated by Luhn (§22)
   phone_number          → E.164 + common national formats
   ipv4_private          → 10/8 · 172.16/12 · 192.168/16
   abs_path_macos        → /Users/<name>/...
   abs_path_linux        → /home/<name>/...
   │
   ▼
sanitized text → store + journal
   stable replacement tokens, so the same key always gets the same redaction`}</Diagram>
            </Section>

            <Section
                title="22. Luhn checksum"
                source="apps/cli/src/pii/patterns.ts"
                badges={['mod-10', '1960', 'PII validator']}
                reference="Luhn, Computer for Verifying Numbers, U.S. Patent 2,950,048, 1960"
            >
                <p>
                    Used inside the PII gate to drop false-positive credit-card matches. Random
                    16-digit IDs match the regex shape but fail Luhn&apos;s mod-10 check, so we only
                    redact strings that look like real card numbers.
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

PII gate decision
   regex matches AND luhn(digits) == 0  → redact
   regex matches AND luhn(digits) != 0  → leave alone
      (random tracking ID, order number, etc.)`}</Diagram>
            </Section>

            <Section
                title="23. Sync envelope"
                source="apps/cli/src/sync/crypto.ts"
                badges={['X25519', 'XChaCha20-Poly1305', 'AEAD', 'domain-separated']}
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
                title="24. Journal apply & LWW conflict resolution"
                source="apps/cli/src/sync/apply.ts"
                badges={['per-op handlers', 'audit history', 'UUIDv7-ordered']}
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
        </article>
    );
}

function Section({
    title,
    source,
    badges,
    reference,
    children,
}: {
    title: string;
    source: string;
    badges: string[];
    reference?: string;
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

function Diagram({ children }: { children: string }) {
    return (
        <pre className="bg-muted/60 text-foreground/85 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-snug">
            {children}
        </pre>
    );
}
