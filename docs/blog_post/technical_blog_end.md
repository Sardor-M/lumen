# Lumen — A persistent brain for AI agents

## Why I built it

AI agents start every conversation with amnesia.

Claude Code, Cursor, Codex, Mastra harnesses, LangChain pipelines — these tools know the world, but they know nothing about _your_ world. The 200 papers you've read, the codebase you ship, the architecture decisions you made last quarter, the trajectory that finally worked when you caught that bug at 2am. Every session re-learns the same context, repeats the same mistakes, forgets user feedback from an hour ago, and burns token budget re-explaining the same domain.

I got tired of this. I wanted an agent that became _compoundingly_ more useful over time. An agent that, week after week, got progressively _better_ at the actual work I do — not less, not the same, not "useful in a different way every Tuesday." If a new colleague joined the team and I had to explain "we use Better Auth, not Auth.js" forty times across forty conversations, I'd fire that colleague. So why was I tolerating that from a tool that bills me per token?

Lumen came out of that frustration. It's a local-first knowledge compiler that sits between everything the agent reads and everything the agent does. It builds a structured graph of what's been learned, captures patterns that worked, and feeds the right slices of that graph back into every session. The agent stops re-learning the same thing. It starts compounding.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   Without Lumen                                 │
│   ─────────────                                 │
│                                                 │
│   Session 1  ──►  answer from training data     │
│   Session 2  ──►  answer from training data     │
│   Session 3  ──►  answer from training data     │
│                                                 │
│   Knowledge gained per session: 0               │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                                                 │
│   With Lumen                                    │
│   ──────────                                    │
│                                                 │
│   Session 1 ─► read + capture + score ──┐       │
│                                          │      │
│                                          ▼      │
│   Session 2 ─► brain-first lookup ──► add more  │
│                                          │      │
│                                          ▼      │
│   Session 3 ─► finds richer brain ──► add more  │
│                                                 │
│   Knowledge gained per session: monotonically up│
│                                                 │
└─────────────────────────────────────────────────┘
```

This article explains how that loop works, what each part does, and where the honest trade-offs are.

### Knowledge compounding

```
Without Lumen — flat

   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    knowledge gained / session: 0
   │  │ │  │ │  │ │  │ │  │ │  │    every chat re-explains the same context
   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘
    S1   S2   S3   S4   S5   S6
                                          ─── sessions over time ───►

With Lumen — compounding
                                        ┌──┐
                                        │██│
                                  ┌──┐  │██│
                                  │██│  │██│
                            ┌──┐  │██│  │██│   knowledge gained / session:
                            │██│  │██│  │██│   monotonically up
                      ┌──┐  │██│  │██│  │██│
                ┌──┐  │██│  │██│  │██│  │██│   every chat extends the brain
          ┌──┐  │██│  │██│  │██│  │██│  │██│
          │██│  │██│  │██│  │██│  │██│  │██│
         ─└──┘──└──┘──└──┘──└──┘──└──┘──└──┘─
           S1   S2   S3   S4   S5   S6
```

The bars grow because _every_ session writes something new into the brain — a captured trajectory, a `+1` on a useful concept, a corrected truth — and the next session reads a brain that already contains all of it.

---

## Lumen in one paragraph

Lumen is a local-first knowledge compiler with two interfaces — a CLI (`lumen-kb`) and a Model Context Protocol server (23 tools). It takes URLs, PDFs, papers, YouTube captions, entire code repos, datasets, even dashboard screenshots as input. It chunks the content, indexes it for hybrid search, runs a Claude pass per source to extract named concepts and weighted edges, and stores everything in a single SQLite file at `~/.lumen/lumen.db`. Agents that speak MCP — Claude Code, Cursor, Codex out of the box, anything else with a small adapter — can query the graph before answering, capture new ideas after responding, vote concepts up or down, and replay successful tool-call sequences from past work. The whole thing is one file. Back up that file, and you back up everything.

---

## The pipeline

```
   INGEST              CHUNK               STORE              SEARCH
   ──────              ─────               ─────              ──────

  URL      ─┐         ┌─ Markdown         ┌─ Sources         ┌─ BM25 (FTS5)
  PDF      ─┤         │                   │                  │
  YouTube  ─┤         ├─ HTML             ├─ Chunks          ├─ TF-IDF
  arXiv    ─┤  Extract│                ─► │                ─►│
  File/Dir ─┼────────►├─ Plain text       ├─ Concepts        ├─ Vector ANN
  Code     ─┤         │                   ├─ Edges           │
  Dataset  ─┤         ├─ Code + sigs      ├─ Aliases         ├─ Graph walk
  Image    ─┤         │                   ├─ Trajectories    │
  Obsidian ─┘         └─ Schema tables    └─ Embeddings      └─ RRF fusion
                                                                  │
                                                                  ▼
                                                            Budget cut
                                                                  │
                                                                  ▼
                                                            Ranked chunks
                                                                  │
                                                                  ▼
                                                            LLM synthesis
```

Five horizontal stages. Each stage is independently testable. None require network access except: (a) fetching URLs the user asked for, (b) optional Claude calls during `compile` / `ask`, (c) optional embedding-provider calls during `embed`.

**Ingest** — per-format extractors. URLs via `@extractus/article-extractor`, PDFs via `pdf-parse`, YouTube via the Innertube captions API, arXiv via Atom + PDF, code repos via shallow `git clone` with `.gitignore`-aware walk and per-language signature extraction, datasets (CSV / TSV / JSONL / HuggingFace) as schema tables + 20-row previews, images via optional Tesseract OCR. Every extractor returns the same `ExtractionResult` shape, so downstream code never branches on input type.

**Chunk** — markdown-aware structural splitting. Headings start new chunks, code fences stay atomic, fragments under 50 tokens merge forward, blocks over 1,000 tokens split on sentence boundaries. Each chunk inherits the nearest heading above it as section context.

**Store** — SQLite with WAL, FTS5 triggers for incremental indexing, sqlite-vec for optional vector ANN. Schema is at v15; migrations are append-only. Single file at `~/.lumen/`.

**Search** — three signals fused. BM25 (Porter-stemmed) via SQLite's built-in `bm25()`, TF-IDF (cosine) over an in-memory inverted index, and a graph walk that injects chunks anchored to 1–2-hop neighborhood concepts of the top hits. Combined via Reciprocal Rank Fusion (`score = Σ w / (k + rank)`, k=60). The output passes through a relevance-density budget cut — short, high-value chunks beat long, low-value ones.

**Compile** — the one required LLM pass. Claude reads each unprocessed source and emits structured `{concepts[], edges[]}`. Each concept stores `compiled_truth` (the system's current best understanding) and a `timeline` of which sources contributed. Parallel execution (`-c N`), delta-aware (touches only unprocessed sources unless you pass `--all`), and prompt-cached (`cache_control: ephemeral`) for ~60–80% cost reduction on repeated calls within a session.

---

## How the brain auto-updates as you use it

This is the part the "compounding" claim hinges on. The brain doesn't sit still after you ingest a source. It grows as the agent moves through sessions — and as it grows, it gets scored and consolidated.

```
   Claude Code session
       │
       │  user prompt
       ▼
   CLAUDE.md fires: "check brain before answering"
       │
       ▼
   brain_ops(query)  via MCP
       │
       ├── concept lookup match?       ──►  compiled_truth + edges as context
       ├── graph path match?           ──►  connecting chain as context
       ├── neighborhood match?         ──►  related concept cluster as context
       └── hybrid search fallback      ──►  top-ranked chunks as context
       │
       ▼
   agent answers with brain context, cites [Source: title]
       │
       ▼
   Stop hook fires: "if new knowledge appeared, call capture"
       │
       ▼
   capture(type, title, content, related_slugs)
       │
       │  before DB write
       ▼
   PII gate — redacts emails, API keys, JWTs, Luhn-validated credit cards,
              phone numbers, private IPv4, home paths
       │
       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ alias merge gate (all three must hold):                    │
   │    slug similarity        ≥ 0.7   (normalized Levenshtein) │
   │    content Jaccard        ≥ 0.6   (over distinct ≥3-char   │
   │                                    tokens)                 │
   │    token count both sides ≥ 4     (thin-content guard)     │
   └────────────────────────────────────────────────────────────┘
       │
       ├── all three pass     ──►  fold into existing canonical
       │                            (alias row written; future
       │                            lookups resolve through it)
       └── any one fails      ──►  upsert as new concept + timeline entry
       │
       ▼
   sync_journal append  (same transaction)
       │
       ▼
   downstream: search index, tier scoring, sync daemon push
       │
       ▼
   brain richer for next conversation
```

Every cycle adds knowledge. The agent enriches concepts after conversations. The next time the same topic comes up, `brain_ops` finds it. The difference compounds daily.

### The loop, step by step

```
                  ┌──────────────┐         ┌──────────────┐
              ┌──▶│  brain_ops   │────────▶│    answer    │──┐
              │   │  read brain  │         │  cite source │  │
              │   └──────────────┘         └──────────────┘  │
              │                                              │
              │                                              ▼
       ┌──────────────┐                              ┌──────────────┐
       │    user      │                              │   capture    │
       │   prompt     │                              │  + PII gate  │
       └──────────────┘                              └──────────────┘
              ▲                                              │
              │                                              │
              │           ┌─────────────────────┐            │
              └───────────│        brain        │◀───────────┘
                          │  richer next time   │
                          └─────────────────────┘

   each lap leaves the brain richer · ~5 MCP tool calls per turn
   one full lap takes ~6 seconds in Claude Code
```

The blue pulse circles the loop in about six seconds — that's roughly the time a real read-brain → answer → capture cycle takes in Claude Code. Every loop ends with `sync_journal` getting an append, and the daemon picks it up — without you typing anything, every other device receives the result of that loop.

### Tiered enrichment

Not every concept exists at the same resolution. Each concept starts at **Tier 3** — a stub with a basic summary. Its tier rises as more sources reference it.

```
   Tier 3   ─────  mentioned once
               ▲   stub + summary
               │
   Tier 2   ─────  mentioned 3+ times across 2+ sources
               ▲   enriched with connections and context
               │
   Tier 1   ─────  mentioned 6+ times across 3+ sources
                   full compiled_truth — the system's current
                   best understanding, synthesized from
                   everything you've read
```

Run `lumen enrich` to process the upgrade queue, or `lumen enrich --status` to see current state. The tier ladder ensures the system spends LLM tokens only on concepts that have proved load-bearing across multiple sources, not on every passing mention.

### Skill scoring and retirement

```
   concept                                 feedback events
      │                                          │
      │   +1 / -1 votes via brain_feedback ◄─────┘
      ▼
   score = Σ deltas
      │
      ├── score ≥ +N      ──►  ranks higher in brain_ops
      └── score ≤ -3      ──►  retired_at = now
                               retire_reason = most recent negative reason
                               hidden from default search
                               still queryable through history
                               revivable via brain_ops
```

The agent (or the user) flags concepts as wrong, stale, or contradicted while working. Bad knowledge disappears automatically. Good knowledge surfaces more often. The brain curates itself without manual intervention.

### Trajectory capture + replay

When the agent successfully completes a multi-step task — adding a new MCP tool, fixing a typecheck error, ingesting a new format — the literal sequence of `read` / `edit` / `bash` calls (and what each one returned) can be stored as a **trajectory** via `capture_trajectory`. A future agent doing a similar task calls `replay_skill(task)` and gets the recipe back as a hint. Drift caveats (codebase revision differences, missing file references, failure outcomes) come along too, so the agent knows what's changed since the recipe was captured.

```
   Session N           successful multi-step task
                            │
                            ▼
                    capture_trajectory(steps, outcome, metadata)
                            │
                            ▼
                    source row, source_type='trajectory'
                    chunks indexed for FTS5

   Session N+M         different agent, similar task
                            │
                            ▼
                    replay_skill(task) ──► matched trajectory + drift caveats
                            │
                            ▼
                    agent uses recipe instead of re-deriving
```

### Scope awareness everywhere

Every source, concept, and trajectory carries a `(scope_kind, scope_key)` pair — one of `codebase`, `framework`, `language`, `personal`, or `team`. Search filters by scope by default, so work in repo A doesn't pollute results in repo B. Codebase identity collapses cleanly — SSH and HTTPS clones of the same repo produce the same scope key. When sync is on, the same scope routing applies on the wire too: only the scopes a device cares about ever materialize on that device.

---

## Cross-device sync — a brain on every laptop

A local-first brain is great until you have two laptops. Lumen's sync layer is encrypted-at-rest, encrypted-in-transit, and zero-knowledge with respect to the relay.

```
   Device A                  Cloudflare Worker             Device B
   ─────────                 (lumen-relay)                ─────────

   write happens
   (concept / trajectory / feedback / retire / truth_update)
       │
       ▼  same transaction
   sync_journal append
       │
       │  Tier 6 daemon tick (adaptive 30s / 300s)
       ▼
   X25519 + XChaCha20-Poly1305 envelope
       │
       ▼
   POST /relay/{user_hash}/journal ───────────►  D1 row stored
                                                 opaque ciphertext only
                                                 keyed by unlinkable hash
                                                                  │
                                                                  ▼  Device B's daemon polls
                                                                  ▼
                                                        GET /relay/{user_hash}/journal?since=cursor
                                                                  │
                                                                  ▼
                                                        envelope decrypt (X25519 derived from Kx)
                                                                  │
                                                                  ▼
                                                        op-specific apply handler
                                                                  │
                                                                  ▼
                                                        Device B's lumen.db updated
                                                        B's next session finds it
```

### What the relay sees

```
   user_hash    sync_id (UUIDv7)    envelope (ciphertext)    received_at
   ───────────  ──────────────────  ─────────────────────    ──────────
   abc1...      01h93...            opaque bytes              2026-05-19T..
   abc1...      01h94...            opaque bytes              2026-05-19T..
```

That's all. No content. No scopes (just HMAC tags for filtering). No device identity beyond what the user's `Kx` derives. Two users with different master keys route to entirely different namespaces and can't read each other's blobs.

### A journal entry flowing from A → relay → B

```
   Device A                   Cloudflare Worker              Device B
 ┌───────────────┐           ┌──────────────────┐        ┌───────────────┐
 │ Claude Code   │           │ opaque ciphertext│        │ brain finds it│
 │ session       │           │ only             │        │ next session  │
 ├───────────────┤           ├──────────────────┤        ├───────────────┤
 │ capture()     │   ●─────▶ │                  │ ─────▶●│ daemon polls  │
 │ ↓ store +     │           │ D1 row keyed by  │        │ ↓ open        │
 │   journal     │           │ SHA256(Kx)[:16]  │        │   envelope    │
 │ ↓ seal        │           │                  │        │ ↓ apply       │
 │   envelope    │           │                  │        │   locally     │
 └───────────────┘           └──────────────────┘        └───────────────┘
                  POST · sealed              GET · sealed

   ◆ Kx (32 bytes) — your master key, on-device only.
     Relay derives nothing from it.

   ● XChaCha20-Poly1305 sealed · X25519 ephemeral keypair per envelope.
     The only thing that ever touches the wire.
```

Only two encrypted packets ever touch the wire — the relay sees neither plaintext nor scope, only opaque sealed envelopes and a user-hash routing key.

### Honest LWW that doesn't pretend to be a CRDT

Two devices can edit the same concept's `compiled_truth` nearly simultaneously. We resolve with `updated_at` and append the losing side to a `concept_truth_history` table with the originating `device_id` attached.

```
   device A:  truth_update at T₁
   device B:  truth_update at T₂   (T₂ > T₁)

   apply on both devices:
      incoming.updated_at > existing.updated_at ?
            │                       │
            ▼                       ▼
        winner wins             loser kept
   UPDATE concepts SET     INSERT concept_truth_history
      truth = winner          (slug, truth, updated_at, device_id)
                                       │
                                       ▼
                              audit rows queryable later
                              for manual reconciliation
```

The reason we picked this over pretending free-form text is CRDT-mergeable: debuggability matters more than appearing magical. When the truth looks wrong, you can trace exactly who wrote what when.

### The Tier 6 daemon

Manual `lumen sync push` is great until the moment you stop typing it. The Tier 6 daemon turns the manual loop into an autonomous one.

```
   lumen sync daemon install
       │
       ▼
   launchd plist (macOS)  /  systemd --user unit (Linux)
       │
       ▼
   long-lived tick loop:
      probe latest_sync_id watermark
      cadence decision:  Active 30s   if journal pressure or recent pull rows
                         Idle 300s    after N empty ticks with nothing pushed
      push decision:     batch push after 5s of quiet
      pull always runs
      apply pulled entries
      sleep until next tick
```

After installation, you never type a sync command again. Capture knowledge on laptop A, it arrives on laptop B in 30 seconds. Give feedback on a concept on B, the score reflects across all devices 30 seconds later. The substrate becomes invisible.

---

## What sets Lumen apart

Most "AI memory" or "RAG" tools you can install today sit in a vendor's cloud, ingest your material into the vendor's index, and return search results through an API. The convenience is obvious, but the privacy story is stark. Your reading list might be one of the most sensitive data sets you own — it reveals what you're learning, what you're confused about, what you're building. That data should sit on your machine.

A few specific things Lumen does differently.

**Local-first by default.** SQLite on your laptop. The CLI, web dashboard, and MCP server all read from the same file. No data leaves your machine unless you opt into sync. The sync layer is end-to-end encrypted, and the relay is a single-file Cloudflare Worker you can self-host with three `wrangler` commands.

**No vector database.** Lumen deliberately does _not_ lead with dense embeddings. The BM25 + TF-IDF + graph-walk combination covers lexical, weighted, and semantic-structural search without the operational overhead of an embedding server, index rebuilds, or model versioning. Semantic similarity is encoded in the compile graph — through edges the LLM extracted during `compile` — and exposed via graph walk at query time. Vector embeddings remain available as a third lane if you want them, but they're never required.

**Agent-native, not retrofit.** The MCP server, trajectory capture, scope dimension, tier-scored enrichment, PII gate — these are not post-hoc additions. They're why the project exists in its current shape. If you're using a coding agent, Lumen is less "another knowledge tool to manage" and more "the memory the agent should have had from the start."

**Honest conflict resolution.** Last-write-wins with a history table isn't glamorous, but it's correct and debuggable. We don't pretend `compiled_truth` is magically a CRDT.

**Deterministic up to the synthesis step.** Every stage — ingest, chunk, dedupe, search, graph walk, alias merge, scoring, sync — is deterministic given the same inputs. The non-deterministic steps are the LLM `compile` and `ask` passes, both of which log the full request/response to `audit.log` for reproducibility.

---

## What's next

The biggest open work right now is autonomy and multi-device parity.

- **Tier 6 daemon** shipped this month. Once installed, sync is fully background.
- **MCP fire-and-forget push** (issue #30) turns agent-driven journal writes into instant sync events, dropping cross-device propagation lag from ~60s to ~5s.
- **`lumen sync daemon logs --follow`** (issue #31) makes the daemon observable from the CLI without grepping log files.

Past that, the roadmap covers a smart-broker tier with opt-in server-side enrichment for users who want it, key recovery flows using Shamir's secret sharing, and a richer query interface for the web UI.

The goal hasn't changed since the first commit: a local-first knowledge compiler that gets better at your work without leaking what that work is. A system that gives agents a persistent brain compounding past the session boundary. And a tool that never asks you to type a sync command.

---

_Built on [`lumen-kb`](https://www.npmjs.com/package/lumen-kb). MIT licensed. Source at [Sardor-M/Lumen](https://github.com/Sardor-M/Lumen)._
