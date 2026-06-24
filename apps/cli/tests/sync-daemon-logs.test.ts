import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    parseSinceDuration,
    lineTimestamp,
    selectTrailingLines,
    readDaemonLog,
    getDaemonLogsContext,
    createTailer,
    followDaemonLog,
    type FollowDeps,
} from '../src/sync/daemon-logs.js';
import type { SyncDaemonStatus } from '../src/sync/daemon-install.js';

/** Build one synthetic daemon log line (the daemon writes JSON with a `ts`). */
function line(iso: string, msg: string): string {
    return JSON.stringify({ ts: iso, msg });
}

describe('parseSinceDuration', () => {
    it('parses each unit', () => {
        expect(parseSinceDuration('30s')).toBe(30_000);
        expect(parseSinceDuration('5m')).toBe(300_000);
        expect(parseSinceDuration('1h')).toBe(3_600_000);
        expect(parseSinceDuration('2d')).toBe(172_800_000);
    });

    it('tolerates whitespace and case', () => {
        expect(parseSinceDuration(' 10S ')).toBe(10_000);
    });

    it('throws on malformed input', () => {
        expect(() => parseSinceDuration('soon')).toThrow(/--since/);
        expect(() => parseSinceDuration('5')).toThrow(/--since/);
        expect(() => parseSinceDuration('5y')).toThrow(/--since/);
    });
});

describe('lineTimestamp', () => {
    it('extracts the ts field as epoch ms', () => {
        expect(lineTimestamp(line('2026-06-23T10:00:00.000Z', 'x'))).toBe(
            Date.parse('2026-06-23T10:00:00.000Z'),
        );
    });

    it('returns null for lines without a parseable ts', () => {
        expect(lineTimestamp('  at Object.<anonymous> (foo.ts:1)')).toBeNull();
        expect(lineTimestamp('{"ts":"not-a-date"}')).toBeNull();
    });
});

describe('selectTrailingLines', () => {
    const text =
        [
            line('2026-06-23T10:00:00.000Z', 'a'),
            line('2026-06-23T10:00:05.000Z', 'b'),
            line('2026-06-23T10:00:09.000Z', 'c'),
        ].join('\n') + '\n';

    it('returns the trailing N lines', () => {
        const out = selectTrailingLines(text, { lines: 2, sinceMs: null, now: 0 });
        expect(out).toEqual([
            line('2026-06-23T10:00:05.000Z', 'b'),
            line('2026-06-23T10:00:09.000Z', 'c'),
        ]);
    });

    it('filters by --since from the first entry past the cutoff', () => {
        const now = Date.parse('2026-06-23T10:00:10.000Z');
        /** cutoff = now - 6s = 10:00:04 → drops the 10:00:00 line. */
        const out = selectTrailingLines(text, { lines: 50, sinceMs: 6_000, now });
        expect(out).toEqual([
            line('2026-06-23T10:00:05.000Z', 'b'),
            line('2026-06-23T10:00:09.000Z', 'c'),
        ]);
    });

    it('returns nothing when every entry predates the cutoff', () => {
        const now = Date.parse('2026-06-23T11:00:00.000Z');
        expect(selectTrailingLines(text, { lines: 50, sinceMs: 1_000, now })).toEqual([]);
    });

    it('keeps all lines when none carry a timestamp (cannot filter)', () => {
        const plain = 'line one\nline two\n';
        expect(selectTrailingLines(plain, { lines: 50, sinceMs: 1_000, now: 0 })).toEqual([
            'line one',
            'line two',
        ]);
    });

    it('returns nothing for a non-positive line count', () => {
        expect(selectTrailingLines(text, { lines: 0, sinceMs: null, now: 0 })).toEqual([]);
    });
});

describe('readDaemonLog', () => {
    it('selects trailing lines from injected file text', () => {
        const text = [line('2026-06-23T10:00:00.000Z', 'a'), line('2026-06-23T10:00:05.000Z', 'b')]
            .join('\n')
            .concat('\n');
        const out = readDaemonLog(
            '/x.log',
            { lines: 1, sinceMs: null },
            { readText: () => text, now: () => 0 },
        );
        expect(out).toEqual([line('2026-06-23T10:00:05.000Z', 'b')]);
    });

    it('returns [] when the file read throws (rotated away)', () => {
        const out = readDaemonLog(
            '/missing.log',
            { lines: 50, sinceMs: null },
            {
                readText: () => {
                    throw new Error('ENOENT');
                },
            },
        );
        expect(out).toEqual([]);
    });
});

describe('getDaemonLogsContext', () => {
    function status(installed: boolean): SyncDaemonStatus {
        return {
            platform: 'macos',
            installed,
            unit_path: '/unit',
            managed: installed,
            manual: false,
            pid_file: '/pid',
            pid_alive: false,
        };
    }

    it('reports installed + log existence from injected probes', () => {
        const ctx = getDaemonLogsContext({
            status: () => status(true),
            logPath: () => '/data/sync-daemon.log',
            exists: (p) => p === '/data/sync-daemon.log',
        });
        expect(ctx).toEqual({
            installed: true,
            logPath: '/data/sync-daemon.log',
            logExists: true,
        });
    });

    it('reports not-installed and missing log', () => {
        const ctx = getDaemonLogsContext({
            status: () => status(false),
            logPath: () => '/data/sync-daemon.log',
            exists: () => false,
        });
        expect(ctx).toEqual({
            installed: false,
            logPath: '/data/sync-daemon.log',
            logExists: false,
        });
    });
});

describe('createTailer', () => {
    let dir: string;
    let logPath: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'lumen-tailer-'));
        logPath = join(dir, 'sync-daemon.log');
        writeFileSync(logPath, 'a\nb\n');
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('starts at EOF and returns only newly-appended complete lines', () => {
        const drain = createTailer(logPath);
        expect(drain()).toEqual([]);
        appendFileSync(logPath, 'c\nd\n');
        expect(drain()).toEqual(['c', 'd']);
    });

    it('buffers an incomplete trailing line until its newline arrives', () => {
        const drain = createTailer(logPath);
        appendFileSync(logPath, 'partial');
        expect(drain()).toEqual([]);
        appendFileSync(logPath, 'rest\n');
        expect(drain()).toEqual(['partialrest']);
    });

    it('resets to the top when the file is truncated/rotated', () => {
        const drain = createTailer(logPath);
        appendFileSync(logPath, 'c\nd\n');
        expect(drain()).toEqual(['c', 'd']);
        writeFileSync(logPath, 'x\n');
        expect(drain()).toEqual(['x']);
    });
});

describe('followDaemonLog', () => {
    /** Build follow deps with controllable seams; returns the harness. */
    function harness(initial: string[], drainQueue: string[][]) {
        const emitted: string[] = [];
        let onChange: () => void = () => {};
        let watchClosed = false;
        let unregistered = false;
        let registeredStop: () => void = () => {};
        let idx = 0;

        const deps: FollowDeps = {
            initial,
            emit: (l) => emitted.push(l),
            watch: (cb) => {
                onChange = cb;
                return () => {
                    watchClosed = true;
                };
            },
            drain: () => drainQueue[idx++] ?? [],
            onStopSignal: (stop) => {
                registeredStop = stop;
                return () => {
                    unregistered = true;
                };
            },
        };
        return {
            deps,
            emitted,
            fireChange: () => onChange(),
            fireSignal: () => registeredStop(),
            get watchClosed() {
                return watchClosed;
            },
            get unregistered() {
                return unregistered;
            },
        };
    }

    it('emits the backlog first, then drained lines on each change', () => {
        const h = harness(['a', 'b'], [['c'], ['d', 'e']]);
        followDaemonLog(h.deps);
        expect(h.emitted).toEqual(['a', 'b']);
        h.fireChange();
        expect(h.emitted).toEqual(['a', 'b', 'c']);
        h.fireChange();
        expect(h.emitted).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('exits cleanly on SIGINT — closes the watcher, unregisters, resolves done', async () => {
        const h = harness([], []);
        const handle = followDaemonLog(h.deps);
        h.fireSignal();
        expect(h.watchClosed).toBe(true);
        expect(h.unregistered).toBe(true);
        await expect(handle.done).resolves.toBeUndefined();
    });

    it('stop() is idempotent', async () => {
        const h = harness([], []);
        const handle = followDaemonLog(h.deps);
        handle.stop();
        handle.stop();
        await expect(handle.done).resolves.toBeUndefined();
        expect(h.watchClosed).toBe(true);
    });
});
