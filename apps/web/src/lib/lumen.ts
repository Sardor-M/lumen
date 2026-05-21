/**
 * Server-only bridge between the Next.js web app and the Lumen CLI engine.
 * Imports store/search/graph functions from lumen-kb and exposes thin
 * wrappers shaped for API route consumption.
 *
 * All functions here run server-side only — they open the SQLite file at
 * ~/.lumen/lumen.db (or $LUMEN_DIR/lumen.db) via the CLI's store layer.
 */

import 'server-only';
import { cache } from 'react';
import { isInitialized } from 'lumen-kb/utils/paths';
import { countSources, getSource, listSources } from 'lumen-kb/store/sources';
import {
    countConcepts,
    getConcept,
    getConceptsBySlugs,
    getSourceConcepts,
    getSourcesForConcept,
    listConcepts,
} from 'lumen-kb/store/concepts';
import { countChunksBySource, getChunksBySource } from 'lumen-kb/store/chunks';
import { countEdges, listEdges, getEdgesFrom, getEdgesTo } from 'lumen-kb/store/edges';
import { searchBm25 } from 'lumen-kb/search/bm25';
import { searchTfIdf } from 'lumen-kb/search/tfidf';
import { fuseRrf } from 'lumen-kb/search/fusion';
import { godNodes, neighborhood } from 'lumen-kb/graph/engine';
import { pagerank } from 'lumen-kb/graph/pagerank';
import { detectCommunities } from 'lumen-kb/graph/cluster';
import { getProfile } from 'lumen-kb/profile/cache';
import {
    explorationCostAvoided,
    frequentTopics,
    queryCountByTool,
    recentQueries,
} from 'lumen-kb/store/query-log';
import { feedbackTotal, listFeedback } from 'lumen-kb/store/feedback';
import { getBackLinks, getLinksFrom } from 'lumen-kb/store/links';
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

/** Max chunks fetched for the detail page; only the first 10 are rendered. */
const SOURCE_CHUNK_PREVIEW_LIMIT = 12;

/**
 * Single-source detail bundle for the /sources/[id] page.
 * - Chunks are capped at SOURCE_CHUNK_PREVIEW_LIMIT to keep payloads small;
 *   the true total is reported separately so the UI can show "Chunks (N)".
 * - Derived concepts are hydrated in a single batched query instead of one
 *   `getConcept` call per slug — turns an N+1 into a 1.
 * - Memoized with `React.cache` so multiple components rendering against
 *   the same id during one request share the result.
 */
export const source = cache((id: string) => {
    if (!isInitialized()) return null;
    const s = getSource(id);
    if (!s) return null;
    const chunks = getChunksBySource(id, SOURCE_CHUNK_PREVIEW_LIMIT);
    const chunkTotal = countChunksBySource(id);
    const derivedConcepts = getConceptsBySlugs(getSourceConcepts(id));
    return {
        ...s,
        chunks,
        chunk_count: chunkTotal,
        derived_concepts: derivedConcepts,
        concept_count: derivedConcepts.length,
    };
});

export function concepts() {
    if (!isInitialized()) return [];
    return listConcepts();
}

/**
 * Single-concept detail bundle. Aside from the concept row itself, we
 * include:
 *   - the 1-hop neighborhood for the relationship cards,
 *   - inbound + outbound typed edges from the `edges` table,
 *   - the sources this concept was extracted from (with relevance),
 *   - the most recent feedback events + cumulative net score, and
 *   - the typed `concept_links` table (separate from `edges`) — used
 *     for in-prose backlinks generated from compiled_truth scanning.
 * Memoized so the page server component + any sibling components
 * rendering against the same slug share one read.
 */
export const concept = cache((slug: string) => {
    if (!isInitialized()) return null;
    const c = getConcept(slug);
    if (!c) return null;
    return {
        ...c,
        neighborhood: neighborhood(slug, 1),
        outgoing: getEdgesFrom(slug),
        incoming: getEdgesTo(slug),
        sources: getSourcesForConcept(slug),
        feedback: listFeedback(slug, 10),
        feedback_net: feedbackTotal(slug),
        outbound_links: getLinksFrom(slug),
        backlinks: getBackLinks(slug),
    };
});

/* =========================================================================
   Agent telemetry surface — the query_log + cost-avoided aggregates
   captured by every MCP tool call. Used by the overview page so the
   user can see what the agent has been asking, when, and how much
   exploration cost it saved.
   ========================================================================= */

/** Last N tool calls — tool_name, query_text, timestamp. */
export function recentActivity(limit = 20) {
    if (!isInitialized()) return [];
    return recentQueries(limit);
}

/** Top query strings by frequency — what the agent keeps asking about. */
export function hotTopics(limit = 8) {
    if (!isInitialized()) return [];
    return frequentTopics(limit);
}

/** Histogram of tool calls keyed by MCP tool name. */
export function toolCallStats() {
    if (!isInitialized()) return {};
    return queryCountByTool();
}

/**
 * Exploration cost avoided over the last `days` days — sessions where
 * the agent hit a known concept short-circuited what would otherwise
 * have been a full exploration loop. Drives the "tokens saved" callout.
 */
export function savings(days = 7) {
    if (!isInitialized()) {
        return {
            days,
            total_sessions: 0,
            skill_aided_sessions: 0,
            exploration_sessions: 0,
            hit_rate: 0,
            baseline_tokens: 0,
            with_skill_tokens: 0,
            estimated_savings_tokens: 0,
            estimated_savings_usd: 0,
            by_scope: [],
        };
    }
    return explorationCostAvoided(days);
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
