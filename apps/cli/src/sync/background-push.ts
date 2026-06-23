/**
 * Fire-and-forget background sync push for the MCP server.
 *
 * After a journaling MCP tool call returns, the server schedules a push so a
 * peer device sees the write on its next pull — no manual `lumen sync push`,
 * no waiting on the daemon's cadence timer. This is the "agents propagate
 * their own knowledge in real-time" path: the moment a Claude Code / Codex
 * run calls `add` then `compile`, the writes are already on the relay.
 *
 * Guarantees:
 *   - Detached — `scheduleBackgroundPush()` returns synchronously; the push
 *     runs on a later microtask and never blocks or alters the tool response.
 *   - Swallowed failures — a relay outage or 500 is logged to stderr (never
 *     stdout, which is the MCP JSON-RPC channel) and dropped. The unpushed
 *     journal row stays local; the daemon or the next session retries it.
 *   - Skipped when disabled — `isSyncEnabled()` short-circuits before any
 *     work, so users who never ran `lumen sync enable` pay zero overhead.
 *   - Coalesced — at most one push runs at a time. Schedule calls during an
 *     in-flight push set a single "re-push needed" flag instead of stacking,
 *     so a burst of N rapid journaling calls triggers at most 2 pushes (one
 *     in flight + one trailing) regardless of N. The relay's idempotency on
 *     (user_hash, sync_id) makes a redundant overlap with the daemon safe.
 */

import { runPush as defaultRunPush, type SyncResult } from './sync-driver.js';
import { isSyncEnabled as defaultIsSyncEnabled } from './state.js';

/** Injectable seams. All default to the real implementations in production. */
export type BackgroundPushDeps = {
    /** Defaults to the sync-driver push. */
    runPush?: () => Promise<SyncResult>;
    /** Defaults to the `sync_state.enabled` check. */
    isSyncEnabled?: () => boolean;
    /** Defaults to a stderr writer. Never stdout — that's the MCP channel. */
    onError?: (message: string) => void;
};

/** True while a push (and any trailing re-push) is draining. */
let pushInFlight = false;
/** Set by schedule calls that land mid-push; drains exactly one trailing push. */
let rePushQueued = false;
/** The active drain, exposed via `flushBackgroundPush()` for tests. */
let drainPromise: Promise<void> | null = null;

function defaultOnError(message: string): void {
    process.stderr.write(`[sync] background push failed: ${message}\n`);
}

/**
 * Schedule a fire-and-forget push. Returns immediately. Safe to call from any
 * journaling MCP tool handler; no-ops when sync is disabled or when a push is
 * already in flight (the in-flight push picks up the new write via the
 * trailing re-push).
 */
export function scheduleBackgroundPush(deps: BackgroundPushDeps = {}): void {
    const isEnabled = deps.isSyncEnabled ?? defaultIsSyncEnabled;
    if (!isEnabled()) return;

    if (pushInFlight) {
        /** Collapse this and any further calls into a single trailing re-push. */
        rePushQueued = true;
        return;
    }

    pushInFlight = true;
    /** Defer via microtask so this function returns before any sync work starts. */
    drainPromise = Promise.resolve().then(() => drainPushes(deps));
    /** Detached — never awaited by the caller. */
    void drainPromise;
}

async function drainPushes(deps: BackgroundPushDeps): Promise<void> {
    const runPush = deps.runPush ?? defaultRunPush;
    const onError = deps.onError ?? defaultOnError;
    try {
        do {
            /**
             * Clear before awaiting so a write that lands *during* this push
             * sets the flag again and earns a trailing re-push. Writes already
             * captured by `listUnpushed` inside this push don't double-trigger.
             */
            rePushQueued = false;
            try {
                const result = await runPush();
                if (result.errors.length > 0) onError(result.errors.join('; '));
            } catch (err) {
                /** `runPush` swallows its own errors today; this stays defensive. */
                onError(err instanceof Error ? err.message : String(err));
            }
        } while (rePushQueued);
    } catch (err) {
        /** Guard: `onError` itself threw; swallow to keep the process stable. */
        try {
            onError(err instanceof Error ? err.message : String(err));
        } catch {
            /** Double-fault — cannot report without risking recursion, drop it. */
        }
    } finally {
        pushInFlight = false;
        drainPromise = null;
    }
}

/**
 * Resolve once the in-flight push (and any trailing re-push) has drained.
 * Resolves immediately when idle. Test seam — production code fires and
 * forgets via `scheduleBackgroundPush`.
 */
export function flushBackgroundPush(): Promise<void> {
    return drainPromise ?? Promise.resolve();
}

/** Test helper. Resets the coalescing flags and drain handle between tests. */
export function resetBackgroundPushStateForTests(): void {
    pushInFlight = false;
    rePushQueued = false;
    drainPromise = null;
}
