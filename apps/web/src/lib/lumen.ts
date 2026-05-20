/**
 * Server-only bridge between the Next.js web app and the Lumen CLI engine.
 * Imports store/search/graph functions from lumen-kb and exposes thin
 * wrappers shaped for API route consumption.
 *
 * All functions here run server-side only — they open the SQLite file at
 * ~/.lumen/lumen.db (or $LUMEN_DIR/lumen.db) via the CLI's store layer.
 */

import 'server-only';
import { isInitialized } from 'lumen-kb/utils/paths';
import { countSources, listSources } from 'lumen-kb/store/sources';
import { countConcepts, listConcepts, getConcept } from 'lumen-kb/store/concepts';
import { countEdges, listEdges, getEdgesFrom, getEdgesTo } from 'lumen-kb/store/edges';
import { searchBm25 } from 'lumen-kb/search/bm25';
import { searchTfIdf } from 'lumen-kb/search/tfidf';
import { fuseRrf } from 'lumen-kb/search/fusion';
import { godNodes, neighborhood } from 'lumen-kb/graph/engine';
import { pagerank } from 'lumen-kb/graph/pagerank';
import { detectCommunities } from 'lumen-kb/graph/cluster';
import { getProfile } from 'lumen-kb/profile/cache';
import {
    countDevices,
    countJournal,
    countJournalSince,
    countPendingApply,
    countUnpushed,
    listJournalRecent,
    type JournalListRow,
} from 'lumen-kb/sync/journal';

export function status() {
    if (!isInitialized()) {
        return { initialized: false as const };
    }
    return {
        initialized: true as const,
        sources: countSources(),
        concepts: countConcepts(),
        edges: countEdges(),
    };
}

export function profile() {
    if (!isInitialized()) return null;
    return getProfile(false);
}

export function hybridSearch(query: string, limit = 20) {
    if (!isInitialized() || query.trim().length === 0) return [];

    const bm25 = searchBm25(query, limit);
    const tfidf = searchTfIdf(query, limit);

    const fused = fuseRrf(
        [
            { name: 'bm25', results: bm25, weight: 1 },
            {
                name: 'tfidf',
                results: tfidf.map((t) => ({
                    chunk_id: t.chunk_id,
                    source_id: t.source_id,
                    score: t.score,
                })),
                weight: 1,
            },
        ],
        60,
    );

    /** Join BM25 content/snippet back onto fused ordering for display. */
    const bm25ById = new Map(bm25.map((r) => [r.chunk_id, r]));
    return fused.slice(0, limit).map((f) => {
        const hit = bm25ById.get(f.chunk_id);
        return {
            chunk_id: f.chunk_id,
            source_id: f.source_id,
            rrf_score: f.rrf_score,
            signals: f.signals,
            source_title: hit?.source_title ?? null,
            snippet: hit?.snippet ?? null,
        };
    });
}

export function sources() {
    if (!isInitialized()) return [];
    return listSources();
}

export function concepts() {
    if (!isInitialized()) return [];
    return listConcepts();
}

export function concept(slug: string) {
    if (!isInitialized()) return null;
    const c = getConcept(slug);
    if (!c) return null;
    return {
        ...c,
        neighborhood: neighborhood(slug, 1),
        outgoing: getEdgesFrom(slug),
        incoming: getEdgesTo(slug),
    };
}

export function graphSnapshot(opts?: { limit?: number }) {
    if (!isInitialized()) return { nodes: [], edges: [], communities: [], god_nodes: [] };

    const limit = opts?.limit ?? 500;
    const allConcepts = listConcepts();
    const top = allConcepts.length > limit ? pagerank().slice(0, limit) : allConcepts;
    const keepSlugs = new Set(top.map((c) => c.slug));

    const rawCommunities = detectCommunities();
    const slugToCommunity = new Map<string, number>();
    for (const c of rawCommunities) {
        for (const slug of c.members) slugToCommunity.set(slug, c.id);
    }

    const nodes = allConcepts
        .filter((c) => keepSlugs.has(c.slug))
        .map((c) => ({
            slug: c.slug,
            name: c.name,
            mentions: c.mention_count,
            community: slugToCommunity.get(c.slug) ?? -1,
        }));

    const edges = listEdges()
        .filter((e) => keepSlugs.has(e.from_slug) && keepSlugs.has(e.to_slug))
        .map((e) => ({
            from: e.from_slug,
            to: e.to_slug,
            relation: e.relation,
            weight: e.weight,
        }));

    const communities = rawCommunities
        .slice(0, 10)
        .map((c) => ({ id: c.id, size: c.size, members: c.members.slice(0, 20) }));

    return { nodes, edges, communities, god_nodes: godNodes(10) };
}

export type GraphSnapshot = ReturnType<typeof graphSnapshot>;

export type SyncActivity = {
    entries: JournalListRow[];
    devices_seen: number;
    entries_total: number;
    entries_24h: number;
    pending_push: number;
    pending_apply: number;
};

/**
 * Snapshot of recent sync journal activity for the dashboard /activity view.
 * Returns empty counts if the workspace isn't initialized so the page can
 * render its empty-state without crashing.
 */
export function syncActivity(opts?: { limit?: number }): SyncActivity {
    const empty: SyncActivity = {
        entries: [],
        devices_seen: 0,
        entries_total: 0,
        entries_24h: 0,
        pending_push: 0,
        pending_apply: 0,
    };
    if (!isInitialized()) return empty;

    const limit = opts?.limit ?? 100;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return {
        entries: listJournalRecent(limit),
        devices_seen: countDevices(),
        entries_total: countJournal(),
        entries_24h: countJournalSince(since),
        pending_push: countUnpushed(),
        pending_apply: countPendingApply(),
    };
}
