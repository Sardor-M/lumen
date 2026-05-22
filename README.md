<div align="center">

# Lumen

### A persistent brain for Claude Code, Cursor, Codex, and any MCP-compatible agent

**One SQLite file · local-first · 23 MCP tools · E2E-encrypted cross-device sync**

[![npm version](https://img.shields.io/npm/v/lumen-kb.svg)](https://www.npmjs.com/package/lumen-kb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![GitHub](https://img.shields.io/github/stars/Sardor-M/Lumen?style=social)](https://github.com/Sardor-M/Lumen)

[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#)
[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#)

[![Claude Code](https://img.shields.io/badge/Claude_Code-MCP-blueviolet.svg)](#)
[![Cursor](https://img.shields.io/badge/Cursor-MCP-blueviolet.svg)](#)
[![Codex CLI](https://img.shields.io/badge/Codex_CLI-MCP-blueviolet.svg)](#)
[![OpenAI SDK](https://img.shields.io/badge/OpenAI_SDK-adapter-blueviolet.svg)](#)
[![AI SDK](https://img.shields.io/badge/AI_SDK-adapter-blueviolet.svg)](#)
[![LangChain](https://img.shields.io/badge/LangChain-adapter-blueviolet.svg)](#)
[![Mastra](https://img.shields.io/badge/Mastra-adapter-blueviolet.svg)](#)

</div>

## Get Started

```bash
# Zero-install — runs straight from npm
npx lumen-kb init

# Or install globally for the `lumen` command on your PATH
npm i -g lumen-kb
```

```bash
cd your-project
lumen init                          # creates ~/.lumen/lumen.db
lumen add https://aeon.co/...       # ingest a source
lumen compile                       # extract concepts + edges
lumen install claude                # wire into Claude Code
```

<sub>Lumen runs on Node 22+. The `lumen` binary, the web UI, the MCP server, and the file-watcher daemon all live in the same npm package. No native binaries to fetch, no external services to spin up — the LLM is only called when you ask it to compile or synthesize.</sub>

---

## Why Lumen?

AI agents start every conversation with amnesia. Claude Code, Cursor, Codex — they know the world but **nothing about _your_ world**: the two hundred papers you've read, the codebase you ship, the architecture decisions you made last quarter, the trajectory that finally worked when you debugged that thing at 2am.

Every session relearns the same context, repeats the same mistakes, forgets your corrections an hour later, and burns your token budget re-explaining the same domain.

**Lumen gives your agent a persistent brain** — a SQLite-backed knowledge graph it queries _before_ answering, and writes to _after_. Concepts accumulate. Trajectories replay. The brain is richer at the start of every conversation than it was at the end of the last one.

### What you actually get

- A **knowledge graph** of every article, paper, repo, dataset, transcript, and screenshot you've fed it — extracted as named concepts and weighted edges by an LLM you control.
- **23 MCP tools** that let the agent do concept lookup, neighborhood walks, PageRank-ranked retrieval, hybrid search (BM25 + TF-IDF + vector with RRF fusion), and trajectory replay.
- **A `CLAUDE.md` protocol** wired by `lumen install claude` so the agent checks the brain _before_ the internet, cites sources, and captures new ideas after every response.
- **Self-measured telemetry**: every tool call writes a row to `query_log`. The dashboard's `/agent-activity` page reports skill-hit rate, tokens saved versus an exploration baseline, and a USD savings estimate — all from your own usage, no benchmarks needed.

### Benchmark Results

Lumen ships a reproducible engine-level benchmark suite — `benchmarks/runner/all.ts` — that runs in-process against a fresh temp SQLite database. **No LLM calls, no network, no API keys.** Numbers below come from a real run committed to the repo at `docs/benchmarks/2026-04-21-lumenbench.md` (6 categories, all pass, 5.1s total wall time, Node 23 / WAL mode).

> **Headline: sub-millisecond search at 1K chunks · ~6ms RRF at 10K · 100% top-1 hit rate on the curated query set · 12/12 graph-op correctness checks pass.**

| Category                                   | Result                                                         | Why it matters                                               |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **Search latency** (1K chunks, RRF fused)  | **p50 0.56 ms · p95 0.70 ms**                                  | Hybrid search disappears into the agent's loop               |
| **Search latency** (10K chunks, RRF fused) | **p50 6.22 ms · p95 7.53 ms**                                  | Stays sub-10ms p95 at 10× scale                              |
| **Search quality** (RRF)                   | **P@1 100% · MRR 1.000 · nDCG@5 0.908**                        | RRF fused beats raw BM25 by ~3× on top-1 hit                 |
| **Ingest throughput** (markdown)           | **26,689 docs/sec · 33.1 MB/sec**                              | Real-world docs land in under a millisecond each             |
| **Per-doc latency** (markdown)             | **p50 0.031 ms · p95 0.045 ms**                                | The chunker isn't the bottleneck. Ever.                      |
| **Graph operations**                       | **12 / 12 correctness checks pass**                            | shortest-path, neighborhood, PageRank, godNodes, communities |
| **MCP contract**                           | **10 / 10 tools pass valid/invalid input contract**            | The public tool surface refuses bad input cleanly            |
| **Adversarial robustness**                 | **PASS** (unicode, huge inputs, FTS5 operators, SQL injection) | The boundary holds                                           |

<details>
<summary><strong>Full benchmark details</strong></summary>

**Methodology.** Every category runs in-process via `tsx benchmarks/runner/<category>.ts` against a fresh temp SQLite file in WAL mode. No LLM, no network. Each run captures git branch + commit + Node version into the report so diffs stay reproducible. The all-in-one runner is `npx tsx benchmarks/runner/all.ts` and writes a dated report under `docs/benchmarks/`.

**Search quality — curated 22-doc corpus, 15 graded queries (full table):**

| Mode          | P@1    | P@5   | MRR   | nDCG@5 | mean ms |
| ------------- | ------ | ----- | ----- | ------ | ------- |
| `bm25`        | 33.3%  | 9.3%  | 0.333 | 0.206  | 0.05    |
| `tfidf`       | 100.0% | 40.0% | 1.000 | 0.949  | 0.17    |
| `rrf` (fused) | 100.0% | 40.0% | 1.000 | 0.908  | 0.01    |

BM25 alone misses two-thirds of top-1 because the query language doesn't match exact tokens (e.g. "PageRank damping factor" vs. the chunk's "alpha · M + (1-alpha)/N"). TF-IDF normalizes IDF aggressively and nails it. RRF gives you TF-IDF-grade ranking _and_ BM25's term-precision properties in one merged list — at a _cheaper_ mean latency than either alone, because the fusion pass amortizes shared work.

**Search latency — three scales × three modes, 200 queries per run after 20 warmup:**

| Scale | Mode  | p50 ms | p95 ms | p99 ms | mean ms | QPS    |
| ----- | ----- | ------ | ------ | ------ | ------- | ------ |
| 100   | bm25  | 0.09   | 0.13   | 0.21   | 0.10    | 10,469 |
| 100   | tfidf | 0.02   | 0.04   | 0.06   | 0.02    | 46,551 |
| 100   | rrf   | 0.12   | 0.19   | 0.31   | 0.12    | 8,095  |
| 1K    | bm25  | 0.37   | 0.46   | 0.78   | 0.38    | 2,657  |
| 1K    | tfidf | 0.17   | 0.24   | 0.44   | 0.18    | 5,542  |
| 1K    | rrf   | 0.56   | 0.70   | 0.97   | 0.56    | 1,777  |
| 10K   | bm25  | 3.13   | 3.74   | 6.69   | 3.23    | 310    |
| 10K   | tfidf | 3.05   | 4.22   | 6.42   | 3.11    | 322    |
| 10K   | rrf   | 6.22   | 7.53   | 12.82  | 6.35    | 158    |

Latency scales roughly linearly with corpus size (10× chunks → ~10× p50). RRF is consistently ~2× slower than either lane alone because it runs both _then_ fuses — that's the cost of getting the best ranking quality of either signal.

**Ingest throughput — 462 samples across markdown / HTML / plaintext (150 each):**

| Format   | Docs | Chunks | Docs/sec | MB/sec | p50 ms/doc | p95 ms/doc |
| -------- | ---- | ------ | -------- | ------ | ---------- | ---------- |
| markdown | 150  | 1,400  | 26,689   | 33.13  | 0.031      | 0.045      |
| html     | 150  | 981    | 22,284   | 31.51  | 0.037      | 0.048      |
| plain    | 150  | 681    | 40,092   | 49.00  | 0.019      | 0.029      |

Format auto-detection: **30/30 samples classified correctly**.

**Graph operations — 22 concepts, 35 edges, 12 correctness checks:** all 3 `shortestPath` runs return the correct hop sequence, both `neighborhood(d=1)` queries hit the right count, `pagerank` top-3 returns the expected hub triplet, `godNodes` top-3 returns the highest-degree concepts, `detectCommunities` converges in 4/3/3 iterations on three seeds. Average run-time per op is sub-millisecond except PageRank (1.14 ms) and community detection (1.51 ms).

**MCP contract — 10 tools in the public registry** (the `lumen-kb/tools` export) each accept the documented schema and reject malformed input with a typed error. The broader 23-tool MCP server surface is exercised end-to-end by the web app and `lumen install claude` integration test.

**Adversarial robustness** — full unicode coverage (CJK, emoji, RTL marks), 1 MB single-chunk inputs, FTS5 operator strings (`NEAR/3 "foo bar"`), SQL injection payloads (`'; DROP TABLE chunks; --`), and pathological slugs (empty, all-whitespace, control chars). Every input either returns sane results or rejects with a structured error. **No crashes, no SQLI escapes.**

**Reproducing locally:**

```bash
pnpm install
npx tsx benchmarks/runner/all.ts
# Report appears at docs/benchmarks/YYYY-MM-DD-lumenbench.md
```

To run a single category:

```bash
npx tsx benchmarks/runner/search-latency.ts
npx tsx benchmarks/runner/search-quality.ts
npx tsx benchmarks/runner/ingest.ts
npx tsx benchmarks/runner/graph-ops.ts
npx tsx benchmarks/runner/mcp-contract.ts
npx tsx benchmarks/runner/adversarial.ts
```

</details>

### Agent-side cost telemetry (live)

The engine benchmarks above answer _"how fast is Lumen?"_ The web UI at `/agent-activity` answers _"how much is Lumen actually saving the agent that's using it?"_ — computed from `query_log` rows your own MCP clients have written:

| Metric                                                            | Where it's shown                    |
| ----------------------------------------------------------------- | ----------------------------------- |
| **Skill hit rate** (% of sessions that landed on a known concept) | `/agent-activity` · `lumen profile` |
| **Tokens saved** vs. exploration baseline                         | `/agent-activity` · `lumen profile` |
| **≈ USD avoided** (tokens × conservative blended rate)            | `/agent-activity`                   |
| **Recent calls + hot topics + tool distribution**                 | `/agent-activity`                   |

Formula and rate are documented in `apps/cli/src/store/query-log.ts:explorationCostAvoided`.

---

## Architecture

```
    INGEST              CHUNK               STORE              SEARCH
    ------              -----               -----              ------

  URL      -+         +- Markdown         +- Sources         +- BM25 (FTS5)
  PDF      -|         |                   |                  |
  YouTube  -+         +- HTML             +- Chunks          +- TF-IDF
  arXiv    -|- Extract|                -> |                -> |
  File/Dir -|         +- Plain text       +- Concepts        +- Vector ANN
  Code     -|         |                   +- Edges           |
  Dataset  -|         +- Code + sigs      +- Aliases         +- Graph walk
  Image    -|         |                   +- Trajectories           |
  Obsidian -+         +- Schema tables    +- Embeddings             v
                                                              RRF Fusion
    COMPILE             ENRICH              GRAPH         (3-signal merge)
    -------             ------              -----                   |
                                                                Budget cut
  LLM extracts       Tier scoring        PageRank                   |
  concepts +         escalates           Path finding          Ranked chunks
  compiled truth     stubs ->            Community                  |
  + timeline         rich pages          detection                  v
  per source         via LLM             Visualization        LLM synthesis
  (parallel)                                                   (streaming)

           SCOPE                 FEEDBACK              PII GATE
           -----                 --------              --------

  Codebase / framework /     +1 / -1 votes        Regex scrubber on
  language / personal /      score >=  +N          captures + sessions
  team. Per-source +         score <= -3 retires  (tokens, emails, JWTs,
  per-concept routing.       Aliases on write     credit cards, paths)

       TRAJECTORY            REVIEW PASS              SYNC JOURNAL
       ----------            -----------              ------------

  Tool-call sequences    LLM scans completed       Append-only log of
  captured as            sessions, extracts        every concept-touching
  replayable skills.     trajectories that are     mutation. X25519 +
  Step-level FTS +       worth keeping. Drops      XChaCha20-Poly1305
  drift caveats on       low-signal noise on       sealed envelopes —
  replay.                the floor.                relay sees ciphertext.
```

---

## Key Features

|                             |                                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persistent agent memory** | A SQLite knowledge graph (concepts + typed edges + trajectories) the agent queries before answering and writes to after. Concepts accumulate, near-duplicates merge into canonicals on write. |
| **9 source types**          | URLs, PDFs, YouTube transcripts, arXiv papers, files, folders, whole code repos, datasets (CSV/JSON), images, plus Obsidian vaults. All chunked, deduped via SHA-256, never leaves your disk. |
| **Hybrid search**           | BM25 (FTS5) + TF-IDF + optional vector ANN (`sqlite-vec`), merged with reciprocal rank fusion. Three signals, one ranked list.                                                                |
| **Scope-aware**             | Codebase A's results don't pollute repo B's. Every concept, source, and feedback row carries `scope_kind` + `scope_key`; the agent picks the right scope per query.                           |
| **Tiered enrichment**       | Stub concepts auto-escalate to full enrichment when they cross usage thresholds — `lumen enrich` runs only on what matters.                                                                   |
| **Trajectory replay**       | Successful multi-step tool sequences are captured and replayed when the agent hits a similar task — no relearning.                                                                            |
| **PII gate**                | Tokens, emails, JWTs, secret-looking paths are scrubbed _before_ anything is written to the journal, by default.                                                                              |
| **E2E-encrypted sync**      | X25519 + XChaCha20-Poly1305 envelopes. Push to a self-hostable Cloudflare Worker relay (`apps/relay/`, three `wrangler` commands). The relay sees opaque ciphertext only.                     |
| **100% local**              | No data leaves the box unless you opt into compile/enrich/ask (your API key) or sync (your relay). Search, graph traversal, dedup, scope routing, PII scrub, web UI — all local.              |

---

## Quick Start

### 1. Initialize a workspace

```bash
lumen init
```

Creates `~/.lumen/lumen.db` with the v16 schema (sources, chunks, concepts, edges, aliases, scopes, feedback, trajectories, sync journal, vector store).

### 2. Add some sources

```bash
lumen add https://aeon.co/essays/the-bitter-lesson
lumen add ./papers/attention-is-all-you-need.pdf
lumen add https://www.youtube.com/watch?v=...
lumen add ~/projects/my-app           # whole code repo
lumen add ~/Documents/Obsidian/Notes  # vault
```

The CLI dispatches on the input shape — URL, PDF, YouTube, arXiv, file, folder, code repo, dataset, image. SHA-256 dedup means re-adding the same source is a no-op.

### 3. Compile

```bash
lumen compile -c 5     # 5 sources in parallel
```

An LLM (Anthropic / OpenRouter / Ollama — you choose) reads across chunks and proposes concepts + weighted edges. Tiered enrichment, near-duplicate merge on write, trajectory capture from sessions.

### 4. Wire it into your agent

```bash
lumen install claude
```

Writes a brain-first `CLAUDE.md` protocol, registers the MCP server in `.mcp.json`, wires a pre-tool hook and a stop hook that captures new knowledge after every response. The same MCP server plugs into Cursor and Codex CLI via their MCP configs.

For agents that don't speak MCP, use the native adapters:

```ts
import { tools as lumenTools } from 'lumen-kb/openai'; // OpenAI SDK
import { tools as lumenTools } from 'lumen-kb/ai-sdk'; // Vercel AI SDK
import { tools as lumenTools } from 'lumen-kb/langchain'; // LangChain
import { tools as lumenTools } from 'lumen-kb/mastra'; // Mastra
```

### 5. Open the web UI

```bash
lumen serve
```

Then visit `http://localhost:3000`:

- `/` — overview, knowledge-graph preview, stats
- `/sources` and `/sources/[id]` — every ingested source with its derived concepts
- `/concepts` and `/concepts/[slug]` — every concept with "Seen in N sources" attribution, feedback history, compiled truth, backlinks, recent mentions timeline
- `/graph` — the force-directed memory graph, drag any node, click to open
- `/agent-activity` — what the MCP agents have been doing, tokens saved, hot topics
- `/learn` — algorithms, graph density, memory, and sync explained

---

## What it looks like in practice

```bash
lumen init
lumen add https://karpathy.github.io/2021/06/21/blockchain/
lumen add ./papers/attention-is-all-you-need.pdf
lumen add https://www.youtube.com/watch?v=kCc8FmEb1nY
lumen add 1706.03762                                      # arXiv ID
lumen add ./saved-articles/                               # whole folder at once
lumen add https://github.com/anthropics/claude-code       # whole repo
lumen add ./benchmarks/results.csv                        # dataset — schema + preview indexed
lumen add ./screenshots/grafana-dashboard.png             # image — OCR'd into searchable text
lumen watch add obsidian ~/ObsidianVault                  # auto-pull clippings via frontmatter
lumen compile -c 3                                        # extract concepts + build graph (3 parallel)
```

Now search it:

```bash
lumen search "agent orchestration patterns" -b 4000
```

```
1. [8.2] Building Effective AI Agents > Combining and customizing these patterns
   ## Combining and customizing these patterns
   signals: bm25:12% tfidf:146%

2. [7.9] LLM Powered Autonomous Agents > Agent System Overview
   ## Agent System Overview
   signals: tfidf:68%

3. [7.8] Building LLM applications for production > Testing an agent
   #### Testing an agent
   signals: tfidf:68%
```

The bracketed score is the fused RRF rank, and the `signals:` line shows which lane (BM25 / TF-IDF / vector) contributed how much to the merge — a real "look inside the engine" the agent can use to decide whether to widen the search.

Or ask a question and get a streamed answer:

```bash
lumen ask "How do agent swarms compare to RAG for knowledge retrieval?"
```

Claude reads the relevant chunks from your corpus and streams the answer token by token — not from training data, from what you've actually read.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Claude Code / Cursor / Codex                       │
│                                                                       │
│  "How does our auth middleware handle JWT refresh?"                   │
│                       │                                               │
│                       ▼                                               │
└───────────────────────┼───────────────────────────────────────────────┘
                        │ MCP stdio · json-rpc
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Lumen MCP server (23 tools)                     │
│                                                                       │
│  brain_ops("jwt refresh")  ──┐                                        │
│                              │  intent-routed                         │
│  search · query              │  ↓                                     │
│  concept · neighbors · path  │  Skill hit? → trajectory replay        │
│  god_nodes · pagerank        │  Miss?      → hybrid retrieval         │
│  capture · capture_trajectory│                                        │
│  brain_feedback · retire     │  Returns: chunks + budget hint         │
│                              ▼                                        │
│                ┌─────────────────────────────┐                        │
│                │     ~/.lumen/lumen.db       │                        │
│                │   • sources · chunks        │                        │
│                │   • concepts · edges        │                        │
│                │   • aliases · scopes        │                        │
│                │   • trajectories            │                        │
│                │   • feedback · query_log    │                        │
│                │   • vec_chunks (sqlite-vec) │                        │
│                │   • sync journal            │                        │
│                └─────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
```

1. **Ingest** — `lumen add` dispatches by input shape (URL → fetch + readability; PDF → text extract; YouTube → transcript; arXiv → abstract + sections; folder → walk; code → parse + symbol extract). All output lands in `chunks` with SHA-256 dedup, then optionally embedded for vector search.

2. **Store** — one SQLite file. FTS5 for keyword search, `sqlite-vec` for ANN, plain relational tables for everything else. Scope-aware on write so multi-repo work doesn't bleed.

3. **Compile** — an LLM reads across your chunks and proposes named concepts + weighted typed edges (`implements`, `extends`, `contradicts`, `references`, `derives`, …). Tier-based enrichment escalates stubs to full concept pages only when usage warrants it. Near-duplicate slugs merge into a canonical via `concept_aliases`.

4. **Serve** — `lumen serve --mcp` is the MCP server; `lumen serve` is the Next.js web UI. The agent talks to the MCP via stdio/JSON-RPC. Every tool call writes a `query_log` row with `tokens_spent`, `skill_hit`, `latency_ms`, and `session_id`.

5. **Sync (opt-in)** — every concept-touching mutation lands in an append-only `sync_journal`. On push, each entry is sealed with X25519 + XChaCha20-Poly1305 and shipped to the relay. The relay never sees the key.

---

## CLI Reference

```bash
lumen init                    # create ~/.lumen/lumen.db
lumen add <inputs...>         # ingest URLs, PDFs, YouTube, arXiv, files, folders, code, datasets, images
lumen search <query>          # hybrid search (BM25 + TF-IDF + vector with RRF)
lumen ask <question>          # search locally, send top chunks to the LLM, get a synthesized answer
lumen compile [-c N]          # extract concepts + edges via LLM (N sources in parallel)
lumen embed                   # generate vector embeddings (enables semantic search)
lumen enrich                  # enrich concepts that crossed tier thresholds
lumen graph                   # explore the knowledge graph locally (no LLM)
lumen status                  # sources · chunks · concepts · graph density
lumen profile                 # learned preferences, top concepts, recent activity
lumen review                  # inspect logged sessions, capture trajectories
lumen serve [--mcp]           # web UI on :3000 (--mcp = stdio MCP server)
lumen watch                   # manage connectors that auto-ingest from external sources
lumen daemon                  # background scheduler for connectors
lumen sync [push|pull]        # cross-device sync (opt-in, end-to-end encrypted)
lumen install <platform>      # wire integration: claude · codex · daemon
lumen memory [export|import]  # dump or restore your brain
```

Pipe-friendly, JSON-when-asked (`--json`), exits with sane status codes. Plays nicely with `jq`, `fzf`, and your shell of choice.

---

## MCP Tools (23)

| Category               | Tools                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| **Brain entry point**  | `brain_ops` (intent-routed; skill-first response with budget hint)       |
| **Search & retrieval** | `search`, `query`                                                        |
| **Concept**            | `concept`, `add_link`, `links`, `backlinks`                              |
| **Graph**              | `god_nodes`, `pagerank`, `path`, `neighbors`, `communities`, `community` |
| **Write**              | `add`, `compile`, `capture`, `session_summary`                           |
| **Skill scoring**      | `brain_feedback`, `retire_skill`                                         |
| **Trajectory**         | `capture_trajectory`, `replay_skill`                                     |
| **Meta**               | `status`, `profile`                                                      |

`brain_ops` auto-detects intent from the query shape (concept lookup / graph path / neighborhood / hybrid search), surfaces matching trajectories ahead of free-form chunks, and returns a per-call token-budget hint so the agent can decide whether to widen the search. Every call writes an exploration-cost row to `query_log` so `lumen profile` and `/agent-activity` can show which intents are paying off.

**Agents should call `brain_ops` first.** Everything else is for cases where the agent already knows the specific operation it needs.

---

## Supported Inputs

### Source types

| Type               | Detection                  | Output                                  |
| ------------------ | -------------------------- | --------------------------------------- |
| **URL**            | http(s)://                 | Readability extract, chunked            |
| **PDF**            | `.pdf`                     | pdf-parse text + heading detection      |
| **YouTube**        | youtube.com / youtu.be     | transcript via `youtube-transcript`     |
| **arXiv**          | arxiv.org                  | abstract + sections via arXiv API       |
| **File**           | any text-like file         | direct chunking                         |
| **Folder**         | directory path             | walks, respects `.gitignore`            |
| **Code repo**      | `.git`, code-heavy folder  | per-file symbol extract via tree-sitter |
| **Dataset**        | `.csv`, `.json`, `.jsonl`  | schema inference + summary rows         |
| **Image**          | `.png`, `.jpg`, `.webp`, … | OCR (when configured)                   |
| **Obsidian vault** | folder with `.md` notes    | front-matter aware                      |

### Code repos — languages recognized for symbol extraction

Python, JavaScript, TypeScript, Go, Rust, Java, Kotlin, Scala, C, C++, Ruby, PHP, Shell, Swift, Lua, R, C#, F#, Elixir, Erlang. File extensions map directly to tree-sitter grammars in `apps/cli/src/ingest/code.ts`.

---

## Library Usage

```ts
import { createLumen } from 'lumen-kb';

const lumen = createLumen({ dataDir: '~/.lumen' });

// Hybrid search
const hits = lumen.search({ query: 'attention mechanism', limit: 10 });

// Synthesize an answer from the top chunks
const answer = await lumen.ask({ question: 'How does self-attention work?' });

// Walk the graph
const neighbors = lumen.neighbors('attention', { hops: 1 });
const path = lumen.path('rnn', 'transformer');

// Programmatic ingest
await lumen.add({ kind: 'pdf', path: './papers/vaswani-2017.pdf' });

lumen.close();
```

Lower-level access lives under `lumen-kb/store/*`, `lumen-kb/search/*`, `lumen-kb/graph/*`, `lumen-kb/profile/*`, `lumen-kb/sync/*` — these are the same primitives the CLI and MCP server use.

---

## Framework Adapters

For agents that don't speak MCP, native adapters expose Lumen as the agent's tool inventory directly.

```ts
import { tools } from 'lumen-kb/openai'; // OpenAI SDK / Assistants API
import { tools } from 'lumen-kb/ai-sdk'; // Vercel AI SDK
import { tools } from 'lumen-kb/langchain'; // LangChain
import { tools } from 'lumen-kb/mastra'; // Mastra
```

Same 23 tools, idiomatic shape per framework. Mix and match: an agent can use the Anthropic SDK's tool-use with the AI SDK adapter and the OpenAI Assistants API with the OpenAI adapter, all hitting the same `~/.lumen/lumen.db`.

---

## Web Dashboard

```bash
lumen serve          # Next.js UI on :3000
```

| Route              | What's there                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | Overview — concepts/edges/density stats, live memory preview, learn shortcuts                                                   |
| `/sources`         | Every ingested source with derived-concept counts                                                                               |
| `/sources/[id]`    | Per-source detail: chunks, derived concepts, content hash, lifecycle                                                            |
| `/concepts`        | Every concept, sortable by mentions / score                                                                                     |
| `/concepts/[slug]` | Per-concept: summary, compiled truth, **"Seen in N sources"** attribution, feedback events, backlinks, recent mentions timeline |
| `/graph`           | Force-directed graph (drag, hover, click to open, fullscreen toggle)                                                            |
| `/agent-activity`  | What MCP agents have been doing: recent calls, hot topics, savings, tool distribution                                           |
| `/learn`           | Algorithms, graph density, memory & self-improvement, sync internals                                                            |
| `/search`          | Hybrid search UI                                                                                                                |

Auth via Better Auth (email + password, magic link, password reset). Web + CLI + MCP all read the same SQLite file, so anything the agent writes shows up live in the UI.

---

## Cross-device Sync

Opt-in. Off by default. When you enable it:

```bash
lumen sync push           # ship local changes
lumen sync pull           # pull remote changes
```

What happens on push:

1. Every concept-touching mutation has already landed in `sync_journal` as an append-only row.
2. Each row is sealed with **X25519 + XChaCha20-Poly1305** using your device's keypair.
3. Ciphertext is POST'd to a Cloudflare Worker relay (`apps/relay/`, self-hostable in three `wrangler` commands).
4. **The relay sees opaque bytes, keyed by an unlinkable hash. Plaintext never leaves the box.**

Conflicts are resolved last-write-wins per entity with an audit table (`concept_truth_history`) for the losing writes — no CRDT pretending.

---

## Privacy

| What stays on disk                                                   | What leaves (opt-in)                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sources (`~/.lumen/`)                                                | Compile / enrich / ask — your API key, your choice of provider (Anthropic, OpenRouter, Ollama) |
| Chunks + embeddings (`lumen.db`)                                     | Cross-device sync — sealed ciphertext only, key never leaves the device                        |
| The graph (concepts, edges, aliases, scopes, feedback, trajectories) |                                                                                                |
| Search, intent routing, dedup, scope routing — all local             |                                                                                                |
| **Telemetry**                                                        | **Never.** Lumen contains zero analytics.                                                      |

PII gate scrubs tokens, emails, JWTs, and secret-looking paths before any capture row hits the journal — the LLM never sees them, the relay never sees them.

---

## Configuration

Lumen is zero-config out of the box. Defaults work for the common case. When you need to tune:

| Env var                                                    | Purpose                                 | Default                                        |
| ---------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `LUMEN_DIR`                                                | Workspace location                      | `~/.lumen`                                     |
| `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `OLLAMA_HOST` | LLM provider for compile / enrich / ask | none — compile is local-only until you set one |
| `BETTER_AUTH_SECRET`                                       | Web UI session secret                   | required in production                         |
| `LUMEN_SYNC_RELAY_URL`                                     | Sync relay endpoint                     | none — sync off                                |
| `LUMEN_DEVICE_KEY`                                         | X25519 keypair path                     | `~/.lumen/keys/device.json`                    |

Per-project overrides go in `.lumen/config.json` at the project root.

---

## Repo Layout

```
lumen/
├── apps/
│   ├── cli/          — the engine: ingest, compile, search, MCP server, sync
│   ├── web/          — Next.js dashboard (Better Auth, MCP-aware UI)
│   ├── landing/      — editorial marketing site
│   ├── relay/        — Cloudflare Worker for E2E-encrypted sync
│   └── extension/    — browser extension (in progress)
├── packages/
│   ├── brand/        — shared site metadata
│   ├── ui/           — shared UI hooks
│   ├── eslint-config/
│   └── tsconfig/
├── docs/             — algorithms, graph density, memory, sync internals
└── turbo.json
```

Monorepo with **Turborepo + pnpm workspaces**. `pnpm dev` runs everything in parallel.

---

## Development

```bash
pnpm install
pnpm dev                          # turbo: cli watcher + web + landing
pnpm build                        # turbo: all workspaces
pnpm lint && pnpm format:check    # before every commit
pnpm test                         # vitest suite (700+ tests)

pnpm --filter lumen-kb dev        # just the CLI watcher
pnpm --filter @lumen/web dev      # just the dashboard on :3000
pnpm --filter @lumen/landing dev  # just the marketing site on :3001
```

Hard project rules (also in `CLAUDE.md`):

- `type` not `interface`. No exceptions.
- `/** JSDoc */` not `//`. Every comment is JSDoc style.
- `.js` extensions in all relative imports inside `apps/cli/` (ESM requires it).
- `import type` for type-only imports.
- No classes, no default exports (except Next.js framework files), no enums, no `any`.

---

## Troubleshooting

**"Workspace not initialized"** — Run `lumen init` first; it creates `~/.lumen/lumen.db`.

**`lumen compile` hangs or errors** — Check that an API key is set (`ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`). Compile is the only step that calls out to an LLM.

**"Vector search returns nothing"** — Run `lumen embed` once after the first compile. The `sqlite-vec` extension loads at startup; if your build couldn't load it, BM25 + TF-IDF still work.

**MCP server can't connect** — Verify the MCP config (`.mcp.json` in your project, or `~/.claude.json` globally) points at `lumen serve --mcp`. Try running it standalone first to confirm it boots.

**Dashboard says "no data"** — The web app reads the same `~/.lumen/lumen.db` the CLI writes to. If the dashboard shows zeros, you haven't run `lumen add` + `lumen compile` yet, or `LUMEN_DIR` is set to a different directory than the CLI is using.

**Cross-device sync silently does nothing** — Sync is opt-in. Set `LUMEN_SYNC_RELAY_URL`, generate a device key, and run `lumen sync push` once. The relay receives ciphertext only — if it's working, you'll see push counts in `lumen status`.

---

## Contributing

Open an issue before large changes. High-value areas:

- Additional ingest formats (EPUB, DOCX, Parquet native)
- Tree-sitter-based code parsing to replace the current regex signatures
- Claude Vision pass on compile for image captions
- In-house browser clipper extension (deferred until Obsidian flow is validated)
- Web dashboard — live graph visualization
- Mastra and LangChain adapter improvements
- Per-op apply rules / LWW conflict resolution (Tier 5e) — translates pulled journal entries into local store mutations; the last piece needed for end-to-end multi-device sync now that the journal (5a), crypto envelope (5b), HTTP push/pull driver (5c), and reference Cloudflare Worker relay (5d) have shipped

---

## Links

- [npm package](https://www.npmjs.com/package/lumen-kb)
- [GitHub](https://github.com/Sardor-M/Lumen)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Benchmark plan](./docs/BENCHMARK-PLAN.md)

---

## License

MIT — see [LICENSE.md](./LICENSE.md).

---

<div align="center">

**A persistent brain for Claude Code, Cursor, Codex, OpenAI SDK, AI SDK, LangChain, Mastra, and anything else that speaks MCP.**

[Report Bug](https://github.com/Sardor-M/Lumen/issues) · [Request Feature](https://github.com/Sardor-M/Lumen/issues) · [Docs](https://github.com/Sardor-M/Lumen/tree/main/docs)

</div>
