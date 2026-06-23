/**
 * `lumen sync daemon logs` — cross-platform tail of the sync daemon's log.
 *
 * Both the launchd plist (`StandardOutPath`) and the systemd unit
 * (`StandardOutput=append:`) write the daemon's stdout/stderr to a single
 * file — `getSyncDaemonLogPath()` (`<dataDir>/sync-daemon.log`). So unlike
 * the issue's outline there's no journald branch: we read one file on both
 * macOS and Linux. The daemon emits one JSON object per line, each carrying
 * a `ts` ISO timestamp (see `daemon-loop.ts:log`), which `--since` filters on.
 *
 * The pure selection/parsing helpers (`parseSinceDuration`,
 * `selectTrailingLines`, `lineTimestamp`) carry the logic and are unit-tested
 * directly. `createTailer` and `followDaemonLog` are the streaming seam: both
 * take injectable primitives so `--follow` can be driven deterministically in
 * tests without real timers or filesystem watches.
 */

import {
    readFileSync,
    existsSync,
    statSync,
    openSync,
    readSync,
    closeSync,
    watch as fsWatch,
} from 'node:fs';
import { getSyncDaemonLogPath } from '../utils/paths.js';
import { syncDaemonStatus, type SyncDaemonStatus } from './daemon-install.js';

/** Default trailing-line backlog when `--lines` is omitted. */
export const DEFAULT_LOG_LINES = 50;
/** Hard cap on `--lines` so a pathological value can't dump the whole file. */
export const MAX_LOG_LINES = 10_000;

const SINCE_RE = /^(\d+)\s*(s|m|h|d)$/i;
const UNIT_MS: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
};

/**
 * Parse a `--since` duration (`30s`, `5m`, `1h`, `1d`) into milliseconds.
 * Throws on anything that doesn't match `<integer><unit>`.
 */
export function parseSinceDuration(raw: string): number {
    const m = raw.trim().match(SINCE_RE);
    if (!m) {
        throw new Error(`--since must look like 30s, 5m, 1h, or 1d; got "${raw}"`);
    }
    return Number(m[1]) * UNIT_MS[m[2].toLowerCase()];
}

/**
 * Extract the epoch-ms timestamp from a daemon log line, or null when the
 * line carries no parseable `"ts": "..."` field (e.g. a stack-trace
 * continuation line). Cheap regex, no full JSON parse.
 */
export function lineTimestamp(line: string): number | null {
    const m = line.match(/"ts"\s*:\s*"([^"]+)"/);
    if (!m) return null;
    const t = Date.parse(m[1]);
    return Number.isNaN(t) ? null : t;
}

function splitLines(text: string): string[] {
    const lines = text.split('\n');
    /** Drop the trailing empty element from a file that ends in a newline. */
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

/**
 * Keep log lines at or after `now - sinceMs`. Logs are chronological, so we
 * find the first line whose timestamp clears the cutoff and return everything
 * from there — that way untimestamped continuation lines ride along with the
 * timestamped entry they belong to instead of being dropped. If no line has a
 * timestamp at all, filtering is impossible and every line is kept.
 */
function filterSince(lines: string[], sinceMs: number, now: number): string[] {
    const cutoff = now - sinceMs;
    let sawTimestamp = false;
    for (let i = 0; i < lines.length; i++) {
        const ts = lineTimestamp(lines[i]);
        if (ts === null) continue;
        sawTimestamp = true;
        if (ts >= cutoff) return lines.slice(i);
    }
    /** Timestamps existed but all predate the cutoff → nothing recent enough. */
    return sawTimestamp ? [] : lines;
}

/**
 * Select the lines to show: optionally filter by `--since`, then take the
 * trailing `lines`. Pure — the file read and the clock are the caller's job.
 */
export function selectTrailingLines(
    text: string,
    opts: { lines: number; sinceMs: number | null; now: number },
): string[] {
    if (opts.lines <= 0) return [];
    const scoped =
        opts.sinceMs === null
            ? splitLines(text)
            : filterSince(splitLines(text), opts.sinceMs, opts.now);
    return scoped.slice(-opts.lines);
}

export type DaemonLogsContext = {
    installed: boolean;
    logPath: string;
    logExists: boolean;
};

/** Resolve where the log lives and whether the daemon/log exist yet. */
export function getDaemonLogsContext(
    deps: {
        status?: () => SyncDaemonStatus;
        logPath?: () => string;
        exists?: (p: string) => boolean;
    } = {},
): DaemonLogsContext {
    const status = deps.status ?? syncDaemonStatus;
    const logPath = (deps.logPath ?? getSyncDaemonLogPath)();
    const exists = deps.exists ?? existsSync;
    return { installed: status().installed, logPath, logExists: exists(logPath) };
}

/** Read the trailing lines for the one-shot (non-follow) path. */
export function readDaemonLog(
    logPath: string,
    opts: { lines: number; sinceMs: number | null },
    deps: { readText?: (p: string) => string; now?: () => number } = {},
): string[] {
    const readText = deps.readText ?? ((p) => readFileSync(p, 'utf-8'));
    const now = deps.now ?? Date.now;
    let text: string;
    try {
        text = readText(logPath);
    } catch {
        /** File may have been rotated away between the exists check and here. */
        return [];
    }
    return selectTrailingLines(text, { lines: opts.lines, sinceMs: opts.sinceMs, now: now() });
}

/**
 * A stateful tailer over a growing file. Starts at the current end of file
 * (the caller has already printed the trailing backlog) and, on each `drain`,
 * returns the complete lines appended since the previous call. An incomplete
 * trailing line is buffered until its newline arrives. Handles truncation /
 * rotation by resetting to offset 0 when the file shrinks.
 */
export function createTailer(logPath: string): () => string[] {
    const sizeOf = (): number => {
        try {
            return statSync(logPath).size;
        } catch {
            return 0;
        }
    };
    let offset = sizeOf();
    let buffer = '';
    return () => {
        const size = sizeOf();
        if (size < offset) {
            /** Truncated or rotated — restart from the top. */
            offset = 0;
            buffer = '';
        }
        if (size <= offset) return [];
        const fd = openSync(logPath, 'r');
        try {
            const len = size - offset;
            const buf = Buffer.alloc(len);
            readSync(fd, buf, 0, len, offset);
            offset = size;
            buffer += buf.toString('utf-8');
        } finally {
            closeSync(fd);
        }
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';
        return parts;
    };
}

export type FollowDeps = {
    /** Trailing backlog to emit before streaming begins. */
    initial: string[];
    /** Emit one line to the user. */
    emit: (line: string) => void;
    /** Subscribe to file-changed events; returns a close fn. */
    watch: (onChange: () => void) => () => void;
    /** Return complete lines appended since the previous call. */
    drain: () => string[];
    /** Register a stop signal (SIGINT); returns an unregister fn. */
    onStopSignal: (stop: () => void) => () => void;
};

export type FollowHandle = {
    /** Stop streaming, close the watcher, unregister the signal. Idempotent. */
    stop: () => void;
    /** Resolves once streaming has stopped (via `stop()` or SIGINT). */
    done: Promise<void>;
};

/**
 * Stream appended log lines until stopped. Emits the trailing backlog first,
 * then one batch per file-changed event. A SIGINT (Ctrl-C) stops cleanly:
 * the watcher is closed, the signal handler is removed, and `done` resolves
 * so the CLI exits without a dangling listener.
 */
export function followDaemonLog(deps: FollowDeps): FollowHandle {
    for (const line of deps.initial) deps.emit(line);

    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
        resolveDone = resolve;
    });

    let stopped = false;
    const closeWatch = deps.watch(() => {
        for (const line of deps.drain()) deps.emit(line);
    });

    const stop = (): void => {
        if (stopped) return;
        stopped = true;
        closeWatch();
        unregister();
        resolveDone();
    };

    const unregister = deps.onStopSignal(stop);

    return { stop, done };
}

/** Build the production `FollowDeps` for a real log file + process signals. */
export function buildFollowDeps(
    logPath: string,
    initial: string[],
    emit: (line: string) => void,
): FollowDeps {
    return {
        initial,
        emit,
        drain: createTailer(logPath),
        watch: (onChange) => {
            const watcher = fsWatch(logPath, () => onChange());
            return () => watcher.close();
        },
        onStopSignal: (stop) => {
            process.once('SIGINT', stop);
            return () => process.removeListener('SIGINT', stop);
        },
    };
}
