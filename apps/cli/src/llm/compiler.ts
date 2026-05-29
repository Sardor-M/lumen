import { chatJson } from './client.js';
import { COMPILE_SYSTEM, compileUserPrompt } from './prompts.js';
import type { CompileResponse } from './prompts.js';
import { getChunksBySource } from '../store/chunks.js';
import {
    upsertConcept,
    getConcept,
    appendTimeline,
    updateCompiledTruth,
    linkSourceConcept,
    listConcepts,
} from '../store/concepts.js';
import { upsertEdge } from '../store/edges.js';
import { markCompiled } from '../store/sources.js';
import { autoLinkFromCompiledTruth } from '../store/links.js';
import { slugSimilarity } from '../dedup/similarity.js';
import { SLUG_SIM_THRESHOLD } from '../dedup/policy.js';
import { toSlug } from '../utils/slug.js';
import { audit } from '../utils/logger.js';
import type { LumenConfig, CompilationResult, RelationType } from '../types/index.js';

/**
 * How many existing concepts to surface to the LLM as a "reuse these
 * slugs" hint. 80 keeps the prompt overhead well under 2k tokens (each
 * entry is ~25 chars on average) while covering the high-PageRank core
 * of the brain. Ordered by mention_count DESC via `listConcepts`.
 */
const KNOWN_CONCEPT_HINT_LIMIT = 80;

const VALID_RELATIONS: Set<string> = new Set([
    'implements',
    'extends',
    'contradicts',
    'supports',
    'related',
    'part-of',
    'prerequisite',
    'alternative',
    'example-of',
]);

/**
 * Compile a single source: send its chunks to the LLM,
 * parse the response, upsert concepts and edges.
 */
export async function compileSource(
    sourceId: string,
    sourceTitle: string,
    config: LumenConfig,
): Promise<CompilationResult> {
    const chunks = getChunksBySource(sourceId);
    if (chunks.length === 0) {
        markCompiled(sourceId);
        return {
            source_id: sourceId,
            concepts_created: [],
            concepts_updated: [],
            edges_created: 0,
            tokens_used: 0,
        };
    }

    /** Select representative chunks (skip headings-only, limit to ~30 for token budget). */
    const representativeChunks = chunks
        .filter((c) => c.chunk_type !== 'heading' && c.content.length > 20)
        .slice(0, 30)
        .map((c) => ({ content: c.content, heading: c.heading }));

    /**
     * Surface the most-mentioned active concepts to the LLM so it can reuse
     * their slugs instead of coining variants. Retired concepts are
     * excluded — we don't want the LLM resurrecting them by reference.
     */
    const allConcepts = listConcepts();
    const knownConcepts = allConcepts
        .filter((c) => c.retired_at === null)
        .slice(0, KNOWN_CONCEPT_HINT_LIMIT)
        .map((c) => ({ slug: c.slug, name: c.name }));

    const userPrompt = compileUserPrompt(sourceTitle, representativeChunks, knownConcepts);
    const tokensUsed = Math.ceil(userPrompt.length / 4);

    const response = await chatJson<CompileResponse>(
        config,
        [{ role: 'user', content: userPrompt }],
        {
            system: COMPILE_SYSTEM,
            maxTokens: 4096,
            temperature: 0.2,
        },
    );

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const conceptsCreated: string[] = [];
    const conceptsUpdated: string[] = [];

    /** Upsert concepts with compiled_truth + timeline. */
    for (const concept of response.concepts) {
        const slug = toSlug(concept.slug || concept.name);
        if (!slug) continue;

        const existing = getConcept(slug);
        const compiledTruth = concept.compiled_truth || null;

        upsertConcept({
            slug,
            name: concept.name,
            summary: compiledTruth,
            compiled_truth: compiledTruth,
            article: null,
            created_at: existing ? existing.created_at : now,
            updated_at: now,
            mention_count: 1,
        });

        /**
         * If the concept already existed, update its compiled_truth with the
         * new synthesis — this is the mutable best-current-understanding.
         */
        if (existing && compiledTruth) {
            updateCompiledTruth(slug, compiledTruth);
        }

        /** Always append to the timeline — immutable evidence record. */
        const timelineEvent = concept.timeline_event || `Appeared in "${sourceTitle}"`;

        appendTimeline(slug, {
            date: today,
            source_id: sourceId,
            source_title: sourceTitle,
            event: timelineEvent,
            detail: null,
        });

        linkSourceConcept({ source_id: sourceId, concept_slug: slug, relevance: 0.8 });

        if (existing) {
            conceptsUpdated.push(slug);
        } else {
            conceptsCreated.push(slug);
        }
    }

    /**
     * Auto-link concepts whose compiled_truth mentions other known concepts.
     * Run after all concepts are upserted so every slug in this source is available.
     */
    for (const concept of response.concepts) {
        const slug = toSlug(concept.slug || concept.name);
        const truth = concept.compiled_truth;
        if (slug && truth) {
            autoLinkFromCompiledTruth(slug, truth, sourceId);
        }
    }

    /**
     * Resolve every edge endpoint against the global brain — not just this
     * source's pass. This is what lets cross-source edges survive:
     *
     *   1. exact match against in-pass concepts emitted just now,
     *   2. exact match (with alias resolution) against any concept in the DB,
     *   3. fuzzy slug match using the same Levenshtein threshold as dedup.
     *
     * Without this gate, edges referencing concepts already in the brain
     * from a prior source were silently dropped, which is exactly how the
     * graph ended up fragmented into per-source islands.
     */
    const inPassSlugs = new Set(response.concepts.map((c) => toSlug(c.slug || c.name)));
    const allBrainSlugs = Array.from(
        new Set([
            ...allConcepts.filter((c) => c.retired_at === null).map((c) => c.slug),
            ...inPassSlugs,
        ]),
    );

    const resolveSlug = (raw: string): string | null => {
        const slug = toSlug(raw);
        if (!slug) return null;
        /** (1) in-pass: emitted by THIS compile call. */
        if (inPassSlugs.has(slug)) return slug;
        /** (2) DB: alias-aware via getConcept. Returns canonical slug. */
        const existing = getConcept(slug);
        if (existing) {
            return existing.retired_at === null ? existing.slug : null;
        }
        /** (3) fuzzy: highest-similarity slug above the dedup threshold. */
        let bestSlug: string | null = null;
        let bestSim = SLUG_SIM_THRESHOLD;
        for (const candidate of allBrainSlugs) {
            /** Skip candidates whose length delta alone makes it impossible to beat bestSim. */
            const longest = Math.max(slug.length, candidate.length);
            if (Math.abs(slug.length - candidate.length) >= longest * (1 - bestSim)) {
                continue;
            }
            const sim = slugSimilarity(slug, candidate);
            if (sim > bestSim) {
                bestSim = sim;
                bestSlug = candidate;
            }
        }
        return bestSlug;
    };

    let edgesCreated = 0;
    let edgesDropped = 0;

    for (const edge of response.edges) {
        const fromSlug = resolveSlug(edge.from);
        const toSlug_ = resolveSlug(edge.to);

        if (!fromSlug || !toSlug_ || fromSlug === toSlug_) {
            edgesDropped++;
            continue;
        }

        const relation = VALID_RELATIONS.has(edge.relation)
            ? (edge.relation as RelationType)
            : 'related';
        const weight = Math.max(0, Math.min(1, edge.weight || 0.5));

        upsertEdge({
            from_slug: fromSlug,
            to_slug: toSlug_,
            relation,
            weight,
            source_id: sourceId,
        });
        edgesCreated++;
    }

    markCompiled(sourceId);

    audit('source:compile', {
        source_id: sourceId,
        concepts_created: conceptsCreated.length,
        concepts_updated: conceptsUpdated.length,
        edges_created: edgesCreated,
        edges_dropped: edgesDropped,
        tokens_used: tokensUsed,
    });

    return {
        source_id: sourceId,
        concepts_created: conceptsCreated,
        concepts_updated: conceptsUpdated,
        edges_created: edgesCreated,
        tokens_used: tokensUsed,
    };
}
