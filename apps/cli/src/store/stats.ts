/**
 * Database introspection — pure SQL + fs reads so it's safe to call from
 * React server components on every storage-page render.
 *
 * The Web app's /storage route reads from here to surface what's actually
 * on disk: file size, journal mode, per-table row counts, vector-store
 * status, FTS5 index footprint. No LLM, no network.
 */

import { statSync } from 'node:fs';
import { getDb } from './database.js';
import { isVecAvailable } from './database.js';
import { getDbPath } from '../utils/paths.js';

export type TableCount = {
    name: string;
    rows: number;
};

export type DatabaseStats = {
    /** Absolute path on disk (~/.lumen/lumen.db or $LUMEN_DIR/lumen.db). */
    file_path: string;
    /** File size in bytes from fs.statSync, or null if the file isn't readable. */
    file_size_bytes: number | null;
    /** SQLite library version. */
    sqlite_version: string;
    /** PRAGMA user_version — the migration sequence number. */
    schema_version: number;
    /** wal / delete / truncate / persist / memory / off. */
    journal_mode: string;
    /** PRAGMA page_size. */
    page_size: number;
    /** PRAGMA page_count — total pages used. */
    page_count: number;
    /** PRAGMA freelist_count — pages on the free list (room reclaimed by deletes). */
    freelist_count: number;
    /** Row counts per table — anything not in this list is intentionally omitted. */
    tables: TableCount[];
};

export type VectorStats = {
    /** True if the sqlite-vec extension was loaded at boot. */
    extension_loaded: boolean;
    /** True if the vec_chunks virtual table exists in sqlite_master. */
    table_present: boolean;
    /** Row count, null when not present. */
    rows: number | null;
    /** Embedding dimensions, hard-coded by the v5 schema. Null if not present. */
    dimensions: number | null;
    /** Most recent chunk.embedded_at, null when no chunks are embedded. */
    last_embedded_at: string | null;
};

export type FtsStats = {
    /** chunks_fts row count — should match `chunks` row count when triggers are healthy. */
    rows: number;
    /** Whether the three INSERT / DELETE / UPDATE triggers exist on chunks. */
    triggers_healthy: boolean;
};

/**
 * Curated list of tables we surface on the storage page. Order matters —
 * the page renders this verbatim. New tables added to the schema show up
 * here too once added to this array.
 */
const REPORTED_TABLES: readonly string[] = [
    'sources',
    'chunks',
    'concepts',
    'edges',
    'source_concepts',
    'concept_aliases',
    'concept_links',
    'concept_feedback',
    'concept_truth_history',
    'scopes',
    'sync_journal',
    'sync_state',
    'query_log',
    'session_review',
    'classifier_patterns',
    'classifier_fallbacks',
    'connectors',
    'profile_snapshot',
    'embedding_meta',
];

export function getDatabaseStats(): DatabaseStats {
    const db = getDb();
    const path = getDbPath();

    let fileSize: number | null = null;
    try {
        fileSize = statSync(path).size;
    } catch {
        /** File missing or permission denied — surface null, don't crash. */
    }

    const journalRow = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    const pageSizeRow = db.pragma('page_size') as Array<{ page_size: number }>;
    const pageCountRow = db.pragma('page_count') as Array<{ page_count: number }>;
    const freelistRow = db.pragma('freelist_count') as Array<{ freelist_count: number }>;
    const userVersionRow = db.pragma('user_version') as Array<{ user_version: number }>;
    const sqliteVersionRow = db.prepare('SELECT sqlite_version() AS version').get() as {
        version: string;
    };

    const tables: TableCount[] = [];
    for (const name of REPORTED_TABLES) {
        try {
            const row = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number };
            tables.push({ name, rows: row.n });
        } catch {
            /** Table doesn't exist on this version — skip silently. */
        }
    }

    return {
        file_path: path,
        file_size_bytes: fileSize,
        sqlite_version: sqliteVersionRow.version,
        schema_version: userVersionRow[0]?.user_version ?? 0,
        journal_mode: journalRow[0]?.journal_mode ?? 'unknown',
        page_size: pageSizeRow[0]?.page_size ?? 0,
        page_count: pageCountRow[0]?.page_count ?? 0,
        freelist_count: freelistRow[0]?.freelist_count ?? 0,
        tables,
    };
}

export function getVectorStats(): VectorStats {
    const db = getDb();
    const extLoaded = isVecAvailable();

    const tableRow = db
        .prepare(
            `SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = 'vec_chunks'`,
        )
        .get();
    const present = tableRow !== undefined;

    let rows: number | null = null;
    let lastEmbeddedAt: string | null = null;
    if (present) {
        try {
            const r = db.prepare('SELECT COUNT(*) AS n FROM vec_chunks').get() as { n: number };
            rows = r.n;
        } catch {
            rows = null;
        }
        try {
            const r = db
                .prepare('SELECT MAX(embedded_at) AS t FROM chunks WHERE embedded_at IS NOT NULL')
                .get() as { t: string | null };
            lastEmbeddedAt = r.t ?? null;
        } catch {
            lastEmbeddedAt = null;
        }
    }

    return {
        extension_loaded: extLoaded,
        table_present: present,
        rows,
        dimensions: present ? 1536 : null,
        last_embedded_at: lastEmbeddedAt,
    };
}

export function getFtsStats(): FtsStats {
    const db = getDb();

    let rows = 0;
    try {
        const r = db.prepare('SELECT COUNT(*) AS n FROM chunks_fts').get() as { n: number };
        rows = r.n;
    } catch {
        /** chunks_fts missing — leave rows = 0 and triggers_healthy = false. */
    }

    const triggerRows = db
        .prepare(
            `SELECT name FROM sqlite_master
              WHERE type = 'trigger'
                AND name IN ('chunks_ai','chunks_ad','chunks_au')`,
        )
        .all() as Array<{ name: string }>;

    return {
        rows,
        triggers_healthy: triggerRows.length === 3,
    };
}
