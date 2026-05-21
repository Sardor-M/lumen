import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SyncTutorialPage() {
    return (
        <article className="max-w-3xl space-y-6">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold">How to sync multiple devices</h2>
                <p className="text-muted-foreground text-sm">
                    Five steps from &quot;zero sync&quot; to &quot;two laptops with the same
                    auto-updating brain.&quot; The relay is a single-file Cloudflare Worker; you
                    self-host it in three commands, then every device speaks to it directly.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What this gets you</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <p>
                        Right now each device has its own copy of your knowledge graph, scored and
                        retired independently. After sync is set up, every concept-touching write on
                        any device — a new source, a captured trajectory, a +1, a truth update —
                        automatically reaches every other device within ~60 seconds, encrypted
                        end-to-end. The relay sees nothing but opaque ciphertext.
                    </p>
                    <Diagram>{`before sync                                after sync
────────────                              ───────────

  Device A                                  Device A ─┐
   └─ brain                                   └─ brain ─┐
                                                        │
  Device B                                              ├──── one brain
   └─ different brain                                   │     auto-merged
                                                        │     across all devices
  no knowledge ever moves            Device B ─┐        │
  between devices manually             └─ brain ─┘
  or otherwise                                          │
                                       Cloudflare Worker
                                       (sees ciphertext only)`}</Diagram>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-2 text-sm">
                    <ul className="list-inside list-disc space-y-1">
                        <li>
                            Two machines (or VMs) with{' '}
                            <code className="bg-muted rounded px-1 font-mono text-xs">lumen</code>{' '}
                            installed and your Anthropic API key in{' '}
                            <code className="bg-muted rounded px-1 font-mono text-xs">
                                ~/.lumen/.env
                            </code>
                            .
                        </li>
                        <li>
                            A free Cloudflare account and{' '}
                            <code className="bg-muted rounded px-1 font-mono text-xs">
                                wrangler
                            </code>{' '}
                            CLI (
                            <code className="bg-muted rounded px-1 font-mono text-xs">
                                npm i -g wrangler
                            </code>
                            ).
                        </li>
                        <li>~10 minutes for the first run; ~2 minutes per additional device.</li>
                    </ul>
                </CardContent>
            </Card>

            <Section
                step="1"
                title="Deploy the Cloudflare Worker relay"
                source="apps/relay/"
                badges={['one-time', 'three commands']}
            >
                <p>
                    The relay is a single-file Worker that stores opaque encrypted blobs keyed by an
                    unlinkable user hash. You only deploy it once per user (across all your
                    devices).
                </p>
                <Command>{`cd apps/relay
pnpm install
wrangler login                        # opens browser
wrangler d1 create lumen-relay`}</Command>
                <p>
                    Copy the{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">database_id</code>{' '}
                    from the{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">d1 create</code>{' '}
                    output into{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        apps/relay/wrangler.toml
                    </code>{' '}
                    under{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        [[d1_databases]]
                    </code>
                    , then:
                </p>
                <Command>{`wrangler d1 migrations apply lumen-relay --remote
wrangler deploy`}</Command>
                <p>Expected output:</p>
                <Diagram>{`Published lumen-relay (1.23 sec)
  https://lumen-relay.<your-subdomain>.workers.dev`}</Diagram>
                <p>
                    Save that URL — we&apos;ll call it{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">$RELAY_URL</code>{' '}
                    below. Validate with:
                </p>
                <Command>{`curl -s $RELAY_URL/relay/health
# → {"ok":true,"version":"1"}`}</Command>
            </Section>

            <Section
                step="2"
                title="Initialize sync on Device A (the first device)"
                source="apps/cli/src/commands/sync.ts"
                badges={['generates master key', 'one device only']}
            >
                <p>
                    Device A is wherever you want the master key{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">Kx</code> to be
                    generated. It can be your laptop, your desktop — anywhere. The key is what
                    decrypts everything; the relay never sees it.
                </p>
                <Command>{`lumen sync init --relay $RELAY_URL
lumen sync show-key --reveal           # COPY this — keep it secret`}</Command>
                <Diagram>{`output of show-key --reveal:

  ┌────────────────────────────────────────────────────────┐
  │ <base64 master key — 32 bytes, urlsafe-encoded>        │
  │ key fingerprint: 4f7a3c91                              │
  └────────────────────────────────────────────────────────┘

DO NOT paste this into:
  - any chat that's not E2E-encrypted
  - any cloud notes app
  - anything indexed by a search engine

If Kx leaks, every encrypted journal entry on the relay
becomes readable. Rotate the key (lumen sync rotate-key)
the moment you suspect a leak.`}</Diagram>
                <p>Then enable sync and confirm:</p>
                <Command>{`lumen sync enable
lumen sync status`}</Command>
                <Diagram>{`Sync status
  Device id            <UUIDv7>
  User hash            <16-hex>
  Relay URL            https://lumen-relay.<sub>.workers.dev
  Enabled              true
  Key fingerprint      4f7a3c91
  Last push            never
  Last pull            never`}</Diagram>
            </Section>

            <Section
                step="3"
                title="Set up Device B (the second device)"
                source="apps/cli/src/commands/sync.ts"
                badges={['import key', 'must match fingerprint']}
            >
                <p>
                    On every additional device, paste the master key from Device A in via{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">import-key</code>.
                    Same relay URL, same key, different device — that&apos;s all.
                </p>
                <Command>{`lumen sync init --relay $RELAY_URL
lumen sync import-key "<paste base64 key here>"
lumen sync enable
lumen sync status`}</Command>
                <Diagram>{`               Device A                    Device B
               ────────                    ────────
key fingerprint:   4f7a3c91     ◀───       4f7a3c91     ← must match
device id:         <UUID-A>                <UUID-B>     ← different
relay URL:         $RELAY_URL              $RELAY_URL   ← same`}</Diagram>
                <p>
                    The fingerprints must match — that&apos;s the proof the key transferred cleanly.
                    If they differ, the import didn&apos;t work; re-copy from A and{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">import-key</code>{' '}
                    again.
                </p>
            </Section>

            <Section
                step="4"
                title="Install the Tier 6 daemon on every device"
                source="apps/cli/src/sync/daemon-loop.ts"
                badges={['adaptive cadence', 'autonomous']}
            >
                <p>
                    Without the daemon you&apos;d have to type{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">lumen sync push</code>{' '}
                    /{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">lumen sync pull</code>{' '}
                    by hand. The daemon does it for you, on an adaptive interval (30s when
                    there&apos;s activity, 300s when idle, 5s debounce on rapid writes).
                </p>
                <Command>{`lumen sync daemon install      # both devices
lumen sync daemon status`}</Command>
                <Diagram>{`Sync daemon
  Managed by Lumen     true
  Unit                 com.lumen.sync           ← launchd on macOS
                       lumen-sync.service       ← systemd --user on Linux
  PID                  <int>
  PID alive            true
  Interval (active)    30s
  Interval (idle)      300s
  Idle after           3 empty ticks
  Push debounce        5s`}</Diagram>
                <p>Validate the unit actually started on the OS:</p>
                <Command>{`# macOS
launchctl list | grep com.lumen.sync

# Linux
systemctl --user status lumen-sync`}</Command>
                <p>
                    Tail the daemon log to watch the first ticks:{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        tail -f ~/.lumen/sync-daemon.log
                    </code>
                    .
                </p>
            </Section>

            <Section
                step="5"
                title="Verify the loop end-to-end"
                source="—"
                badges={['~60s round trip', 'no manual sync command']}
            >
                <p>
                    Ingest something on Device A. Don&apos;t type any sync command. Wait one daemon
                    tick (~30s on each side, so up to 60s total).
                </p>
                <Command>{`# On Device A
lumen add https://karpathy.github.io/2021/06/21/blockchain/
lumen compile

# Wait ~60 seconds, then on Device B (NO sync command typed):
lumen status
lumen graph pagerank | head -5`}</Command>
                <p>
                    Device B&apos;s{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">lumen status</code>{' '}
                    should now show the same source count and roughly the same concept count Device
                    A produced.{' '}
                    <code className="bg-muted rounded px-1 font-mono text-xs">
                        lumen graph pagerank
                    </code>{' '}
                    lists concepts you never personally added on this machine. The loop closed
                    automatically.
                </p>
                <Diagram>{`Device A                                          Device B
─────────                                         ─────────
lumen add <url>     ─┐                            ┌─ lumen status
                     │  ~5s compile                │   ✓ source count matches
lumen compile       ─┤                            │   ✓ concept count matches
                     │  ~5s journal append         │
                     │  ~30s daemon push           │
                     ▼                             │
            Cloudflare Worker ────── ~30s ────────▶
                     │  daemon pull                │
                     ▼                             │
                                                   │
              ┌──── apply per-op ─────────────────▶┘
              │   concept_create  → INSERT OR IGNORE
              │   trajectory       → INSERT source
              │   feedback         → recompute score
              │   truth_update     → LWW + history
              │   retire           → idempotent
              └─ done in one transaction`}</Diagram>
            </Section>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Common failure modes</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-3 text-sm">
                    <FailureRow
                        symptom="lumen sync push → invalid_sync_id"
                        cause="Pre-#23 client format mismatch with the relay"
                        fix="Pull main; the fix landed in PR #23. Then re-run push."
                    />
                    <FailureRow
                        symptom="Push returns 200 but Device B never sees anything"
                        cause="Different master key on the two devices"
                        fix={
                            <span>
                                On A:{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    lumen sync show-key --reveal
                                </code>
                                . On B:{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    lumen sync import-key &quot;&lt;paste&gt;&quot;
                                </code>
                                . Confirm key fingerprint matches on both.
                            </span>
                        }
                    />
                    <FailureRow
                        symptom="Push 200, pull 200, but apply errors in daemon log"
                        cause="Schema version skew between devices"
                        fix={
                            <span>
                                Run{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    lumen status --json | jq .schema_version
                                </code>{' '}
                                on both. They must match. Upgrade the older device with{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    npm i -g lumen-kb@latest
                                </code>
                                .
                            </span>
                        }
                    />
                    <FailureRow
                        symptom="Daemon installed but never ticks"
                        cause="launchd plist or systemd unit failed to load"
                        fix={
                            <span>
                                Re-install with{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    lumen sync daemon uninstall &amp;&amp; lumen sync daemon install
                                </code>
                                . On macOS check{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    launchctl list | grep lumen
                                </code>
                                . On Linux check{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    systemctl --user status lumen-sync
                                </code>
                                .
                            </span>
                        }
                    />
                    <FailureRow
                        symptom="One device is forever stuck with pending_apply > 0"
                        cause="Per-op apply handler errored on some pulled entry"
                        fix={
                            <span>
                                Tail{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    ~/.lumen/sync-daemon.log
                                </code>
                                . Look for the failing{' '}
                                <code className="bg-muted rounded px-1 font-mono text-xs">
                                    sync_id
                                </code>{' '}
                                + op. File an issue with the error and a sanitized payload.
                            </span>
                        }
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What&apos;s next</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80 space-y-2 text-sm">
                    <p>
                        With sync wired up, every Claude Code session on either machine contributes
                        to the shared brain. For the deeper picture:
                    </p>
                    <ul className="list-inside list-disc space-y-1">
                        <li>
                            <Link
                                href="/dashboard/learn/memory"
                                className="text-foreground underline underline-offset-2"
                            >
                                Memory &amp; self-improvement →
                            </Link>{' '}
                            covers how agent captures + scoring + retirement make the brain improve
                            over time.
                        </li>
                        <li>
                            <Link
                                href="/dashboard/learn/algorithms"
                                className="text-foreground underline underline-offset-2"
                            >
                                Algorithms →
                            </Link>{' '}
                            sections 17 (Sync envelope) and 18 (Journal apply &amp; LWW) explain the
                            cryptography and conflict-resolution rules at the level of formulas +
                            file paths.
                        </li>
                        <li>
                            For a rigorous verification runbook (10 phases, with explicit validation
                            gates):{' '}
                            <code className="bg-muted rounded px-1 font-mono text-xs">
                                docs/test-plans/multi-device-agent-memory.md
                            </code>
                            .
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </article>
    );
}

function Section({
    step,
    title,
    source,
    badges,
    children,
}: {
    step: string;
    title: string;
    source: string;
    badges: string[];
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold">
                            {step}
                        </span>
                        <CardTitle className="text-base">{title}</CardTitle>
                    </div>
                    {source !== '—' && (
                        <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                            {source}
                        </code>
                    )}
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

function Command({ children }: { children: string }) {
    return (
        <pre className="bg-foreground/95 text-background dark:bg-foreground/10 dark:text-foreground overflow-x-auto rounded-md p-3 font-mono text-[11px] leading-snug">
            <code>{children}</code>
        </pre>
    );
}

function FailureRow({
    symptom,
    cause,
    fix,
}: {
    symptom: string;
    cause: string;
    fix: React.ReactNode;
}) {
    return (
        <div className="border-border/60 grid grid-cols-1 gap-2 border-b py-3 last:border-b-0 sm:grid-cols-[1fr_1fr_1.2fr]">
            <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Symptom
                </p>
                <p className="mt-1 font-mono text-xs">{symptom}</p>
            </div>
            <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Likely cause
                </p>
                <p className="mt-1 text-xs">{cause}</p>
            </div>
            <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Fix
                </p>
                <p className="mt-1 text-xs">{fix}</p>
            </div>
        </div>
    );
}
