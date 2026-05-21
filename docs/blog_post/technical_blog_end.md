# Why I Built Lumen: Notes from the Substrate Layer

I've been using Claude Code for a few months and one feeling kept coming back to me at the end of long sessions: the agent was smart, but it didn't _know_ anything. It had read the internet. It had not read _my_ codebase, my notes, my last week's debugging. Every conversation began the same way — I'd explain we use Better Auth not Auth.js, I'd explain why the lumen-kb rename happened, I'd explain why we keep edges sparse, and an hour later it would forget.

I got tired of explaining the same things to a tool that bills me per token.

Lumen is what I built to fix that. This article is less a reference doc and more notes on what I learned while building it — what worked, what surprised me, what I'd do differently if I started over. If you're considering whether something like this is worth building (or installing), this is the honest version.

## The shape of the problem

The shape of the problem isn't _memory_ in the LLM sense. The model itself has a giant context window now — 1M tokens with Claude Sonnet — so within a single session it can remember plenty. The problem is across sessions, and across devices, and across the two devices being separate people who'd like to share notes.

A single 1M context is impressive. A _persistent_ 1M context is what people actually want. And a persistent context that _agents_ can read and write to — not just humans — is what makes the difference between "knowledge tool" and "substrate."

That distinction matters more than I expected when I started. Let me try to make it concrete.

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

The picture I had in my head when I started was the second row. Each conversation reads from a brain that already exists, then leaves it a little richer. The bars get taller. I didn't have a clean engineering plan for how to make that real — I had this picture, and I started building toward it.

Most of the design choices in Lumen are downstream of that picture. Some of them surprised me.

## What I assumed I'd need (and didn't)

I assumed I'd need a vector database. Pinecone, Weaviate, FAISS, something. The dominant pattern in 2024-2025 for "agent memory" was embed everything → store in a vector DB → query by cosine similarity. So that's what I built first.

It worked, but the operational cost was annoying. Re-embedding the corpus when I changed models. Index rebuilds. A separate process to run. Worst of all: the retrieval quality wasn't actually better than BM25 on a corpus I'd hand-curated. For a coding-agent use case where the corpus is "things I personally read" rather than "the entire web," embeddings were over-engineering.

I ripped it out. The current Lumen leads with BM25 (via SQLite FTS5) + TF-IDF (in-memory inverted index) + a graph walk on top of the compiled concept graph, fused with Reciprocal Rank Fusion. Vector embeddings are still available as a third lane if you want them, but they're opt-in — and after six months I've never actually turned them on.

The lesson: for curated corpora, the dense-embedding story is a habit, not a requirement. Test against your actual workload before assuming you need the heavyweight option.

## What I underestimated

I underestimated the agent-write path. My first version of Lumen was read-mostly — agents could _query_ the brain, but writing was a manual step I had to do from the CLI. "Capture this conversation" was something I'd run after a session ended.

That broke the loop. If writing the brain was a separate manual step, it never happened. The brain stagnated within a week.

The fix was making `capture`, `brain_feedback`, `brain_ops` first-class MCP tools that the agent invokes _during_ the session. Combined with a Stop hook (`lumen install claude`) that nudges Claude to capture after every response, the write path stopped being manual. Now writing happens as a side effect of conversations — exactly the same surface area as reading.

I wish I'd done that on day one. The retrieval lane is the obvious one to build; the write lane is the one that makes the whole substrate alive.

## The shape it ended up

Five horizontal stages. Pipeline-flavored. The diagram I keep returning to:

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

Each stage is independently testable. Each stage is deterministic except for the LLM `compile` and `ask` passes. The whole thing reads and writes one SQLite file at `~/.lumen/lumen.db`. There is no server. There is no daemon required to _use_ Lumen — the daemon is only for sync, and sync is opt-in.

A few specific things I learned designing the pipeline.

**Ingest is per-format, by extractor.** I started with one big generic ingester. It was bad. URLs need article-extractor cleanup, PDFs need text-stream extraction, YouTube needs the Innertube captions API, code needs `.gitignore`-aware walks and per-language signature extraction. Forcing all of these into one path produced uniformly poor extraction. Splitting them into per-format extractors that all return the same `ExtractionResult` type produced uniformly _good_ extraction.

**Chunking is structural, not character-based.** Markdown-aware chunking — headings start new chunks, code fences stay atomic, fragments under 50 tokens merge forward — beat naive 1000-character chunking on every test corpus I tried. The cost is a slightly more complex chunker; the benefit is search results that point at a _section_, not at a window that happens to span two sections.

**Compile is per-source, not corpus-wide.** Each source gets its own LLM pass that extracts concepts and edges. Cross-source connections happen as a side effect — when two sources mention the same concept with the same slug. This is the simplest possible scheme and it works, but it creates a different problem: the graph fragments. If "react-hooks" appears in five sources with five subtly different slugs, you get five disconnected subgraphs. The fix is the alias merge gate (more on that below), which runs on write.

**Hybrid search beats any one signal.** BM25 has precision but no synonymy. TF-IDF has recall but not enough precision. Graph walk catches semantic neighbors that don't match query terms at all. Reciprocal Rank Fusion (k=60) combines all three with no calibration knob — just rank-based. Adding a fourth signal (vector embeddings) when it's been needed; not adding it when it hasn't.

## The auto-update loop

Here's the part I'm proudest of. When you wire Claude Code into a Lumen-equipped workspace (`lumen install claude`), every session goes through this loop:

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

User prompts. Claude reads the brain _before_ answering (this is enforced by the `CLAUDE.md` file `lumen install` generates — "check the brain before the internet"). Claude answers using brain context, cites the source it leaned on. Stop hook fires after the response, nudges Claude to call `capture` if anything new appeared. Capture passes through the PII gate (regex scrubber for emails, API tokens, JWTs, Luhn-validated credit cards, phone numbers, private IPv4, home paths — all redacted with stable replacement tokens). The alias merge gate folds the capture into an existing canonical concept if the slug + content + token-count thresholds line up.

The blue pulse circles the loop in about six seconds — that's roughly the time a real read-brain → answer → capture cycle takes in Claude Code. Every loop ends with `sync_journal` getting an append. The sync daemon picks it up on its next tick.

The thing that took me weeks to get right wasn't the algorithms — it was the _protocol_. The CLAUDE.md file is what tells Claude to use the brain, when to cite, when to capture. The hooks are what make capture feel automatic instead of optional. The PII gate is what makes me actually trust the system with conversations that might contain API keys. The alias merge gate is what stops the graph from drowning in near-duplicates over time.

Each of those came after a specific failure. The CLAUDE.md was after I noticed Claude was using its training data to answer questions I'd already captured. The Stop hook was after I noticed capture wasn't happening. The PII gate was after I noticed an AWS key in my captured trajectory log. The alias merge gate was after I noticed 17 concepts for what was clearly one idea.

## Cross-device, without leaking

The other thing I underestimated: how badly I'd want this to sync across my devices.

I have a laptop and a desktop. For the first month of using Lumen, each had its own brain. Knowledge captured at the desktop didn't reach the laptop until I remembered to manually push. Half the time I didn't. The asymmetry was annoying enough that I stopped trusting either brain to be complete.

The sync layer that fixes this is encrypted-at-rest, encrypted-in-transit, and zero-knowledge with respect to the relay. The relay is a single-file Cloudflare Worker — about 150 lines of Hono code plus 30 lines of D1 SQL. You deploy it once in three `wrangler` commands, share the 32-byte master key across your devices (QR code on screen, recovery phrase, encrypted file — your call), and the daemon does the rest.

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

The lock packets are the only thing that ever touches the wire. The relay sees a user-hash routing key (an unlinkable HMAC of the master key) and an opaque envelope sealed with XChaCha20-Poly1305. It can route the envelope to other devices on the same user hash. It cannot read the envelope. It cannot tell whether the envelope contains a captured trajectory, a feedback delta, or a truth update. Two users with different master keys can't see each other's envelopes — they route to entirely different namespaces.

I had a moment, when this first worked end-to-end, of being surprised at how natural it felt. I captured something on my desktop, walked to the kitchen, opened my laptop, asked Claude about it, and it answered. The 60 seconds the daemon took to push and pull was completely invisible. The brain just _was_ there. That's the experience I was building toward; it took five Tier sub-projects to get there.

## What I'd warn you about

A few things I keep getting wrong, and you probably will too if you're building or using something like this:

**Capture quality matters more than capture volume.** The first week I captured everything. Within days the brain was so noisy the high-signal stuff was buried. The fix is the same as good documentation: capture _less_, capture _better_, edit existing concepts rather than creating new ones.

**Last-write-wins is the honest answer for free-form text.** I considered building real CRDT support for `compiled_truth`. I'd have spent a month and shipped something that occasionally produced subtly wrong merged text. LWW with an audit table (`concept_truth_history`) was a half-day of work and produces text that's wrong less often _and_ lets you trace exactly who wrote what when. The boring answer is sometimes the right one.

**Scope routing is critical and easy to skip.** Without scopes, captures from my Lumen work leak into my client-project sessions and vice versa. The single biggest improvement to retrieval quality I made was making scope-filtering the default. Every source, concept, and trajectory carries a `(scope_kind, scope_key)` pair. Codebase identity collapses cleanly — SSH and HTTPS clones of the same repo produce the same scope key.

**Install the daemon on every device the first day.** Manual `lumen sync push` has just enough friction to make you skip it half the time. The asymmetry between "device that pushes" and "device that doesn't" makes you stop trusting the brain on either. Install the daemon on every device the moment you do `lumen sync init` on the second one.

## What's still ahead

Things I haven't finished. In rough order of how much they bug me:

- **MCP fire-and-forget push** (issue #30). Right now an agent capture lands in the local journal immediately, but it doesn't push to the relay until the next daemon tick (~30s). Wiring an MCP-side notification to the daemon would drop that to ~5s. Not hard; just hasn't happened.
- **Daemon log follow subcommand** (issue #31). `lumen sync daemon logs --follow` so I don't have to `tail -f ~/.lumen/sync-daemon.log`. Trivial.
- **Multi-user team scope.** Today the sync layer is built for one person across N devices. Sharing a team brain with a colleague needs a different routing tag scheme. The hooks are there in the protocol; the UX isn't.
- **Shamir-secret-share key recovery.** If you lose all your devices, the relay's encrypted journal becomes permanently undecryptable. Splitting the master key across trustees with `lumen sync recover` is the obvious fix. It's not implemented.

If you read this far, the punchline is that Lumen is a project I built because I was tired of the same conversation forty times. I think the substrate it ended up being is generalizable beyond me — but it's still early, and most of the interesting work is in the lessons learned, not the algorithms. The algorithms are mostly textbook BM25, RRF, label propagation, XChaCha20-Poly1305. The interesting work was figuring out which protocol surface made agents and humans both want to use this.

If you want to try it:

```bash
npm install -g lumen-kb
lumen init
lumen install claude          # in any repo where you want Claude to be smarter
```

And the brain starts compounding from the first capture.

---

_Built on [`lumen-kb`](https://www.npmjs.com/package/lumen-kb). MIT licensed. Source: [Sardor-M/Lumen](https://github.com/Sardor-M/Lumen). For a practical "how to set this up" tutorial, see Learn → Sync inside the web dashboard. For the rigorous test-plan version, see `docs/test-plans/multi-device-agent-memory.md`._
