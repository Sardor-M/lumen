# Demoing Lumen End-to-End

A 15-minute live walkthrough that takes an audience from "the agent has amnesia" to "the agent's memory just synced across two laptops with zero clicks." This is the demo I wish I had when I tried to explain why I built Lumen.

It pairs with the article at `docs/articles/lumen-technical-article.en.md` — that one tells the _why_, this one is the _what to type, what to point at, what to expect_.

---

## What you're demoing

```
   Act 1                    Act 2                    Act 3                    Act 4
   ─────                    ─────                    ─────                    ─────
   ingest articles    ──►   ask Claude Code    ──►   deploy relay      ──►   watch sync land
   compile graph            it cites sources         share master key         on second laptop
                            captures new                                       in <60 seconds
                            knowledge in
                            real time
```

Each act is ~3-4 minutes if everything works. Budget 15 minutes including questions.

---

## Pre-demo checklist (do this the day before)

These take time the first run and ~2 minutes once you've done them once. Don't try to do them in front of the audience.

### On both laptops

```bash
# Lumen CLI
npm install -g lumen-kb
lumen --version          # should be ≥ 0.2.0

# Anthropic API key
mkdir -p ~/.lumen
echo 'ANTHROPIC_API_KEY=sk-ant-...' > ~/.lumen/.env

# Claude Code with MCP support
# (assumes you already have Claude Code installed)
```

### Cloudflare Worker relay

```bash
cd /path/to/lumen-checkout/apps/relay
pnpm install
wrangler login                           # browser opens
wrangler d1 create lumen-relay-demo
# Copy database_id into wrangler.toml under [[d1_databases]]
wrangler d1 migrations apply lumen-relay-demo --remote
wrangler deploy
```

Save the URL — call it `$RELAY_URL` in the next steps. Sanity check:

```bash
curl -s $RELAY_URL/relay/health
# → {"ok":true,"version":"1"}
```

### Decide what you're going to demo

The demo only feels real if the brain has interesting content in it. Pick 3-5 articles **before** the demo and have the URLs ready in a text file. Examples that work well live:

- A blog post about a programming pattern (something the audience knows)
- A paper / arXiv link (something with structure)
- A README or tutorial (something with code blocks)

```bash
# Save as ~/demo-urls.txt:
https://karpathy.github.io/2021/06/21/blockchain/
https://www.anthropic.com/engineering/building-effective-agents
https://lilianweng.github.io/posts/2023-06-23-agent/
```

### Pre-warm Device A

Optional but highly recommended: run **Act 1** ahead of time so Device A already has a compiled graph when the demo starts. You'll point at it for ~30 seconds, then _re-do it for the audience_ to show what it looked like as it ran. Speeds up the demo by ~3 minutes.

---

## Act 1 — Build the brain (3 minutes)

> _"Right now Claude Code knows nothing about my reading list. Let's fix that."_

### Setup

```bash
export LUMEN_DIR=~/.lumen-demo            # so we don't pollute your real brain
lumen init
```

Show the output — "look, one SQLite file at `~/.lumen-demo/lumen.db`. That's the whole thing."

### Ingest a few sources live

Have your `~/demo-urls.txt` ready. Type slowly enough that the audience can read:

```bash
xargs -I{} lumen add "{}" < ~/demo-urls.txt
```

Expected: rows of `✓ Added "<title>" (N chunks, M words)`. Point out:

- Zero LLM calls so far. This is all local extraction + chunking + indexing.
- The chunk count varies wildly per source. That's structural chunking — it splits at headings, not at fixed character counts.

### Compile the graph

```bash
lumen compile -c 3                        # 3 sources in parallel
```

While this runs (~30s for 3 sources), narrate:

- "This is the one mandatory LLM pass. Claude reads each source and extracts concepts and edges."
- "Notice each source is compiled independently. The graph only consolidates across sources when alias merge runs on write."

When it finishes, show the audience:

```bash
lumen status
lumen graph pagerank | head -10
```

Point at the top of the PageRank list. "These are the most structurally important concepts in what I just read. The model didn't know any of these 60 seconds ago — they came out of _my_ sources."

---

## Act 2 — Use the brain via Claude Code (4 minutes)

> _"Now let's wire Claude Code into this and watch what changes."_

### Install the bridge

```bash
cd /any/working/directory
lumen install claude
```

Show the five files this generates. Open `CLAUDE.md` and read the opening line: _"check the brain before the internet."_ That sentence is the entire trick.

### Open Claude Code in that directory

`/mcp` should list `lumen` with 23 tools. Show that.

### Ask a question whose answer is in your reading

Use something specific to one of the articles you just ingested. For the Karpathy / agent papers example:

> "What does Karpathy say about 'do things that don't scale' in the context of agent systems? Cite your sources."

What you want to point at as Claude responds:

- **First tool call**: `brain_ops` or `search`. Claude is checking the brain.
- **Citations in the answer**: Claude should cite "Source: Do Things that Don't Scale" or similar — text from the article, not from training data.
- **Stop hook log**: at the end, the Stop hook fires and reminds Claude to call `capture` if anything new appeared.

### Show the capture happening

Open a second terminal:

```bash
sqlite3 $LUMEN_DIR/lumen.db "
  SELECT op, entity_id, created_at
  FROM sync_journal
  ORDER BY sync_id DESC
  LIMIT 5;
"
```

You should see fresh rows from the conversation. Say: _"That's the brain updating itself. Every conversation now leaves it richer."_

### The lesson moment

This is the moment to land the message. Something like:

> _"What just happened is the loop that compounds. The brain wrote three things during that single answer — a captured trajectory, a +1 on the concept, and a new edge connecting two ideas. The next time I ask about Karpathy, the brain has more to offer than it did 30 seconds ago."_

---

## Act 3 — Deploy multi-device sync (5 minutes)

> _"Now the harder one — making this brain follow me to my other laptop."_

### Initialize sync on Device A

```bash
lumen sync init --relay $RELAY_URL
lumen sync show-key --reveal
```

The output is a base64 master key. **Don't read it aloud.** Copy it to your clipboard. Show the key fingerprint (`4f7a3c91` or similar) and say _"this is what we'll check on Device B to make sure the key transferred cleanly."_

```bash
lumen sync enable
lumen sync status
```

Point at:

- The user hash (`16-hex`) — "the relay's only routing identifier for me. It's a one-way function of the master key."
- The fingerprint — "remember this."

### Switch to Device B (the projector machine, or share the screen)

On Device B:

```bash
export LUMEN_DIR=~/.lumen-demo-b
lumen init
lumen sync init --relay $RELAY_URL
lumen sync import-key "<paste from A>"
lumen sync enable
lumen sync status
```

The fingerprint must match. Show it side-by-side with Device A:

```
Device A                 Device B
key fingerprint:  4f7a3c91         4f7a3c91   ← must match
device id:        <UUID-A>         <UUID-B>   ← different
relay URL:        $RELAY_URL       $RELAY_URL ← same
```

### Install the daemon on both

```bash
# Both devices
lumen sync daemon install
lumen sync daemon status
```

Show the PID and the cadence settings (30s active / 300s idle / 5s push debounce). Mention: _"this is what makes the rest happen with zero human typing."_

---

## Act 4 — Watch the brain sync (3 minutes)

> _"OK, both devices are connected to the relay. Let's prove it actually works."_

### Set up two terminal panes you can show at once

Pane 1 — Device A sync_journal watch:

```bash
watch -n 1 "sqlite3 \$LUMEN_DIR/lumen.db 'SELECT sync_id, op, entity_id, pushed_at FROM sync_journal ORDER BY sync_id DESC LIMIT 5'"
```

Pane 2 — Device B sync_journal watch:

```bash
watch -n 1 "sqlite3 \$LUMEN_DIR/lumen.db 'SELECT sync_id, op, entity_id, applied_at FROM sync_journal ORDER BY sync_id DESC LIMIT 5'"
```

### Do something on Device A

Capture something explicit and visible. Either a new ingest:

```bash
# Device A
lumen add https://huyenchip.com/2023/04/11/llm-engineering.html
lumen compile
```

Or, even better, go back to Claude Code on Device A and ask another question. The Stop hook will fire and capture will write.

### Narrate the wait

For ~30 seconds, nothing visible happens. This is the _most important_ part of the demo — don't fill silence with apologies. Instead:

> _"Right now Device A's daemon is in the middle of its 30-second tick. It's about to push the new journal rows through XChaCha20-Poly1305-sealed envelopes to the relay. The relay can't read them — it sees opaque bytes keyed by a hash of my master key, that's it."_

### The "it landed" moment

Watch Device B's pane. New rows appear with `applied_at` populated. Audible relief is okay.

> _"That's the brain on Device B finding out what Device A just learned. No sync command was typed. No git. No file transfer. The daemon just did it."_

### Prove the brain is actually queryable on B

Open Claude Code on Device B. Ask a question that requires knowing what Device A just captured:

> "What does Chip Huyen say about evaluating LLM applications? Cite your source."

Claude on B answers, citing the article Device A added 60 seconds ago. End of demo.

---

## Optional Act 5 — Conflict resolution (only if asked)

If someone asks "what happens if both devices write the same concept" — _and you have time_ — show the LWW path.

On both devices, near-simultaneously:

```bash
# Device A
lumen brain update-truth react-hooks "Slightly different text on A"

# Device B
lumen brain update-truth react-hooks "Slightly different text on B"
```

Wait one daemon cycle. Then on either device:

```bash
sqlite3 $LUMEN_DIR/lumen.db "
  SELECT compiled_truth FROM concepts WHERE slug='react-hooks';
  SELECT device_id, truth FROM concept_truth_history WHERE slug='react-hooks';
"
```

The current `compiled_truth` is whichever device's `updated_at` was later. `concept_truth_history` has the loser preserved with the device id. Say:

> _"We chose honest last-write-wins with an audit table over pretending free-form text is CRDT-mergeable. When the truth looks wrong, you can trace exactly who wrote what when."_

---

## Demo tips

### What to do if something goes wrong live

**Ingest takes too long** — `lumen add` on a URL that times out can stall the demo. Have all URLs in a text file with `xargs` so you can ctrl-C the whole batch if one hangs. Replace the slow URL with a local file you pre-downloaded.

**Compile takes too long** — set `LUMEN_LLM_CONCURRENCY=5` or higher in the environment before the demo. The default of 4 is conservative.

**Claude Code MCP doesn't show `lumen`** — close + reopen Claude Code. The MCP config is read on session start. If it still doesn't show, `cat .mcp.json` in your demo directory and check `LUMEN_DIR` is set correctly.

**Daemon doesn't tick** — `lumen sync daemon uninstall && lumen sync daemon install`. On macOS, check `launchctl list | grep lumen`. On Linux, `systemctl --user status lumen-sync`.

**Push 200 but pull empty on B** — almost always a key mismatch. Re-run `lumen sync show-key --reveal` on A, `lumen sync import-key` on B, confirm fingerprints match.

**Relay returns 5xx** — `wrangler tail lumen-relay-demo` to see the live logs. Cloudflare D1 sometimes has cold-start latency for the first request.

### What to point at on the slides (if you have them)

- The pipeline diagram from the README.
- The "use case: knowledge compounding" SVG from the article.
- The agent loop animation from the article (the blue dot circling the loop is a great visual hook).
- The cross-device sync illustration with the green lock packets.

### Things to _not_ say

- **"It's like ChatGPT memory."** It isn't. ChatGPT memory is a vendor-managed string list. Lumen is a typed graph that the agent reads, writes, and traverses.
- **"It's RAG."** Technically the retrieval lane is RAG-shaped. But the substrate that gets _written back_ every turn is what makes it different. Lead with the write path, not the read path.
- **"It works perfectly."** It doesn't. The Tier 5e per-op apply rules are still settling. The MCP fire-and-forget push (#30) is open. The compression pipeline is designed but not wired (you can see it flagged in `/dashboard/learn/algorithms`). Be honest about what's experimental.

### After the demo

The single most useful follow-up: invite people to install it themselves.

```bash
npm install -g lumen-kb
lumen init
lumen install claude                    # in any repo
```

Point them at:

- `README.md` for the project overview
- `/dashboard/learn/sync` for the same multi-device tutorial in a friendlier format
- `/dashboard/learn/algorithms` for the algorithm catalog (now with which ones are actually wired)

---

## Cheat sheet (one-pager)

Print this. Tape it to your monitor.

```
PRE-DEMO
  □ Cloudflare relay deployed; $RELAY_URL ready
  □ ~/demo-urls.txt with 3-5 URLs
  □ Both devices: lumen-kb installed, ANTHROPIC_API_KEY set
  □ Both devices: $LUMEN_DIR=~/.lumen-demo (or -b)
  □ Pre-warm Device A with Act 1 the night before

ACT 1 — BUILD THE BRAIN (3 min)
  lumen init
  xargs -I{} lumen add "{}" < ~/demo-urls.txt
  lumen compile -c 3
  lumen graph pagerank | head -10

ACT 2 — CLAUDE CODE READS + WRITES THE BRAIN (4 min)
  lumen install claude            # in a working dir
  open Claude Code; /mcp shows lumen
  ask a question that's in the brain
  point at the citations + the new sync_journal rows

ACT 3 — DEPLOY SYNC (5 min)
  Device A: lumen sync init --relay $RELAY_URL
            lumen sync show-key --reveal       # copy key
            lumen sync enable
  Device B: lumen sync init --relay $RELAY_URL
            lumen sync import-key "<paste>"    # fingerprint matches
            lumen sync enable
  Both:     lumen sync daemon install

ACT 4 — WATCH IT LAND (3 min)
  Two panes, both watching sync_journal
  Capture something on A (via Claude Code or `lumen add`)
  Wait ~60s, applied_at fills on B
  Ask Claude on B about it; it finds it

FAILURE RECOVERY
  Stuck ingest      → ctrl-C, swap URL for local file
  No MCP            → restart Claude Code; check .mcp.json
  Dead daemon       → daemon uninstall && install; check launchctl/systemctl
  Pull empty        → key fingerprints must match; re-import on B
  Relay 5xx         → wrangler tail; cold-start latency
```

---

## Companion materials

- **Slides (if you make them):** mirror the four acts; one slide per act + a closing "what's next" slide pointing at GitHub.
- **Recorded version:** the demo records well — both daemon panes plus the Claude Code window. Aim for ≤ 10 minutes for a recording (cut the failure-recovery time you don't need).
- **Hands-on workshop variant:** if the audience can install along with you, swap Act 1's "pre-warm" hint for "everyone run `lumen init` now" and move at the slowest person's pace.

---

_Pairs with `docs/articles/lumen-technical-article.en.md` (the why) and `docs/test-plans/multi-device-agent-memory.md` (the rigorous version of Acts 3-4). Last updated against `main` at the time of writing._
