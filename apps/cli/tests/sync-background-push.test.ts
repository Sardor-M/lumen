import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setDataDir, resetDataDir } from '../src/utils/paths.js';
import { getDb, resetDb } from '../src/store/database.js';
import { isSyncEnabled, setEnabled } from '../src/sync/state.js';
import {
    scheduleBackgroundPush,
    flushBackgroundPush,
    resetBackgroundPushStateForTests,
} from '../src/sync/background-push.js';
import type { SyncResult } from '../src/sync/sync-driver.js';

function emptyResult(overrides: Partial<SyncResult> = {}): SyncResult {
    return {
        pushed: 0,
        pulled: 0,
        applied: 0,
        apply_failed: 0,
        rejected: 0,
        errors: [],
        ...overrides,
    };
}

/** A promise plus its resolver — lets a test gate when a mock push completes. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

/**
 * Yield a macrotask so the microtask-deferred drain can start its first push.
 * `scheduleBackgroundPush` returns before any push work runs (it schedules the
 * drain via `Promise.resolve().then(...)`), so tests that need the push to have
 * *begun* — but not completed — await this first.
 */
function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
    resetBackgroundPushStateForTests();
});

describe('scheduleBackgroundPush — fire-and-forget', () => {
    it('invokes runPush exactly once for a single journaling call', async () => {
        let pushCount = 0;
        scheduleBackgroundPush({
            isSyncEnabled: () => true,
            runPush: async () => {
                pushCount++;
                return emptyResult({ pushed: 1 });
            },
        });
        await flushBackgroundPush();
        expect(pushCount).toBe(1);
    });

    it('returns before the push resolves (never blocks the tool response)', async () => {
        const gate = deferred();
        let started = false;
        let pushCount = 0;
        scheduleBackgroundPush({
            isSyncEnabled: () => true,
            runPush: async () => {
                started = true;
                await gate.promise;
                pushCount++;
                return emptyResult();
            },
        });
        /**
         * The drain is deferred to a microtask, so synchronously after the
         * call the push hasn't even started — the strongest form of "never
         * blocks the tool response."
         */
        expect(started).toBe(false);
        expect(pushCount).toBe(0);
        /** After a tick the push has begun but is still gated (not complete). */
        await tick();
        expect(started).toBe(true);
        expect(pushCount).toBe(0);
        gate.resolve();
        await flushBackgroundPush();
        expect(pushCount).toBe(1);
    });
});

describe('scheduleBackgroundPush — disabled sync', () => {
    it('does not invoke runPush and resolves immediately', async () => {
        let called = false;
        scheduleBackgroundPush({
            isSyncEnabled: () => false,
            runPush: async () => {
                called = true;
                return emptyResult();
            },
        });
        await flushBackgroundPush();
        expect(called).toBe(false);
    });
});

describe('scheduleBackgroundPush — error handling', () => {
    it('logs relay errors (e.g. 500) without surfacing them to the caller', async () => {
        const errors: string[] = [];
        let threw = false;
        try {
            scheduleBackgroundPush({
                isSyncEnabled: () => true,
                runPush: async () => emptyResult({ errors: ['relay 500: internal error'] }),
                onError: (m) => errors.push(m),
            });
            await flushBackgroundPush();
        } catch {
            threw = true;
        }
        expect(threw).toBe(false);
        expect(errors).toEqual(['relay 500: internal error']);
    });

    it('swallows a throwing runPush and keeps coalescing state clean', async () => {
        const errors: string[] = [];
        let threw = false;
        try {
            scheduleBackgroundPush({
                isSyncEnabled: () => true,
                runPush: async () => {
                    throw new Error('network down');
                },
                onError: (m) => errors.push(m),
            });
            await flushBackgroundPush();
        } catch {
            threw = true;
        }
        expect(threw).toBe(false);
        expect(errors).toEqual(['network down']);

        /** State recovered — a subsequent schedule still fires a push. */
        let pushCount = 0;
        scheduleBackgroundPush({
            isSyncEnabled: () => true,
            runPush: async () => {
                pushCount++;
                return emptyResult();
            },
        });
        await flushBackgroundPush();
        expect(pushCount).toBe(1);
    });
});

describe('scheduleBackgroundPush — coalescing', () => {
    it('bounds a burst of 10 rapid calls to at most 2 pushes', async () => {
        let pushCount = 0;
        for (let i = 0; i < 10; i++) {
            scheduleBackgroundPush({
                isSyncEnabled: () => true,
                runPush: async () => {
                    pushCount++;
                    return emptyResult();
                },
            });
        }
        await flushBackgroundPush();
        /**
         * The guarantee is "bounded, never piles up" — at least one push fired
         * and never more than two (one in flight + one trailing). With the
         * microtask-deferred drain, a fully-synchronous burst actually collapses
         * into a single push because every call lands before the drain starts;
         * the mid-push test below exercises the in-flight + trailing = 2 path.
         */
        expect(pushCount).toBeGreaterThanOrEqual(1);
        expect(pushCount).toBeLessThanOrEqual(2);
    });

    it('collapses calls arriving mid-push into a single trailing re-push', async () => {
        const gate = deferred();
        let pushCount = 0;
        const runPush = async () => {
            pushCount++;
            if (pushCount === 1) await gate.promise;
            return emptyResult();
        };
        /** First call schedules the push; a tick lets the gated push begin. */
        scheduleBackgroundPush({ isSyncEnabled: () => true, runPush });
        await tick();
        expect(pushCount).toBe(1);
        /** Five more land while the first push is blocked — they coalesce. */
        for (let i = 0; i < 5; i++) {
            scheduleBackgroundPush({ isSyncEnabled: () => true, runPush });
        }
        expect(pushCount).toBe(1);
        gate.resolve();
        await flushBackgroundPush();
        expect(pushCount).toBe(2);
    });

    it('starts a fresh push for a call that arrives after the drain settles', async () => {
        let pushCount = 0;
        const runPush = async () => {
            pushCount++;
            return emptyResult();
        };
        scheduleBackgroundPush({ isSyncEnabled: () => true, runPush });
        await flushBackgroundPush();
        expect(pushCount).toBe(1);

        scheduleBackgroundPush({ isSyncEnabled: () => true, runPush });
        await flushBackgroundPush();
        expect(pushCount).toBe(2);
    });
});

describe('isSyncEnabled', () => {
    let lumenDir: string;

    beforeEach(() => {
        lumenDir = mkdtempSync(join(tmpdir(), 'lumen-bgpush-'));
        setDataDir(lumenDir);
        getDb();
    });

    afterEach(() => {
        resetDb();
        resetDataDir();
        rmSync(lumenDir, { recursive: true, force: true });
    });

    it('is false on a fresh database', () => {
        expect(isSyncEnabled()).toBe(false);
    });

    it('does not create the sync_state row just by reading', () => {
        isSyncEnabled();
        const row = getDb().prepare('SELECT id FROM sync_state WHERE id = 1').get();
        expect(row).toBeUndefined();
    });

    it('is true once sync is enabled', () => {
        setEnabled(true);
        expect(isSyncEnabled()).toBe(true);
    });
});
