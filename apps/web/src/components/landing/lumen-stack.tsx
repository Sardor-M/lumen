'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Layer = {
    id: string;
    label: string;
    short: string;
    description: string;
};

const LAYERS: Layer[] = [
    {
        id: 'sources',
        label: 'Sources',
        short: 'URLs · PDFs · YouTube · code · trajectories',
        description:
            'Detection + extraction for URLs, PDFs, YouTube, arXiv, files, code, and captured agent trajectories. Bodies are SHA-256 hashed for dedup before anything else in the pipeline touches them.',
    },
    {
        id: 'chunker',
        label: 'Chunker',
        short: 'Markdown structural splitting + FTS5',
        description:
            'Markdown is split along headings, paragraphs, and code blocks. Fragments under 50 tokens merge with neighbors; walls over 1,000 tokens split at sentence boundaries. SQLite FTS5 triggers keep the search index in sync without a separate reindex step.',
    },
    {
        id: 'search',
        label: 'Hybrid search',
        short: 'BM25 + TF-IDF + RRF',
        description:
            'BM25 catches precision. TF-IDF catches recall. Reciprocal Rank Fusion combines them with a parameter-free constant k=60 so neither ranker dominates. Optional vector embeddings add a third lane when an embedding provider is configured.',
    },
    {
        id: 'graph',
        label: 'Knowledge graph',
        short: 'Concepts · edges · PageRank · communities',
        description:
            'Compile asks Claude to extract named concepts and weighted typed edges per source. PageRank ranks structural importance; label propagation finds communities; alias merging consolidates near-duplicate slugs across sources.',
    },
    {
        id: 'sync',
        label: 'Sync',
        short: 'X25519 + XChaCha20-Poly1305 zero-knowledge',
        description:
            'Per-entry encryption with a fresh ephemeral keypair. The relay sees opaque ciphertext keyed by an unlinkable user hash — never the contents, never the scope. Self-hostable as a single-file Cloudflare Worker in under 200 lines.',
    },
    {
        id: 'agents',
        label: 'Agent layer',
        short: 'MCP server for Claude Code · Cursor · any client',
        description:
            'Model Context Protocol server exposes ~23 tools: add, search, query, capture trajectory, brain feedback, brain ops. Captured trajectories age into a memory that gets sharper as scoring + retirement run.',
    },
];

export function LumenStack() {
    const [active, setActive] = useState(3);
    const total = LAYERS.length;

    return (
        <section className="border-border/60 bg-muted/30 dark:bg-muted/10 border-y">
            <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
                <div className="flex items-center justify-between text-xs font-medium tracking-[0.2em] uppercase">
                    <p className="text-muted-foreground">The Lumen Stack</p>
                    <p className="text-foreground/80 font-mono">
                        [{String(active + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}]
                    </p>
                </div>

                <div className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <StackVisual active={active} setActive={setActive} />
                    <StackAccordion active={active} setActive={setActive} />
                </div>
            </div>
        </section>
    );
}

function StackVisual({ active, setActive }: { active: number; setActive: (i: number) => void }) {
    /** Mirror the right-side list order so number 01 = top layer in the diagram. */
    return (
        <div
            className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block"
            style={{ perspective: '1100px' }}
            aria-hidden
        >
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div
                    className="relative"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(58deg) rotateZ(-32deg)',
                    }}
                >
                    {LAYERS.map((layer, i) => {
                        const isActive = i === active;
                        /** Higher layer index (further down the list) sits lower in the stack. */
                        const fromBottom = LAYERS.length - 1 - i;
                        const baseZ = fromBottom * 36;
                        return (
                            <button
                                key={layer.id}
                                type="button"
                                onClick={() => setActive(i)}
                                className={cn(
                                    'group absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500 ease-out outline-none',
                                )}
                                style={{
                                    transform: `translateX(-50%) translateY(-50%) translateZ(${
                                        isActive ? baseZ + 50 : baseZ
                                    }px)`,
                                }}
                                aria-label={`Focus ${layer.label}`}
                            >
                                <div
                                    className={cn(
                                        'relative h-24 w-72 rounded-lg border transition-all duration-500',
                                        isActive
                                            ? 'bg-primary border-primary text-primary-foreground shadow-[0_30px_60px_-15px_rgba(59,130,246,0.45)] ring-2 ring-blue-400/40'
                                            : 'bg-card/95 border-border/80 text-foreground/70 group-hover:border-foreground/30 shadow-md',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'absolute top-2.5 left-3 font-mono text-[10px] tracking-widest uppercase',
                                            isActive
                                                ? 'text-primary-foreground/80'
                                                : 'text-muted-foreground/70',
                                        )}
                                    >
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span
                                        className={cn(
                                            'absolute right-3 bottom-2.5 text-[11px] font-semibold tracking-wider uppercase',
                                            isActive
                                                ? 'text-primary-foreground'
                                                : 'text-foreground/85',
                                        )}
                                    >
                                        {layer.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Floating tooltip for the active layer, sits orthogonally to the iso plane. */}
            <ActiveTooltip layer={LAYERS[active]} />
        </div>
    );
}

function ActiveTooltip({ layer }: { layer: Layer }) {
    return (
        <div className="bg-background text-foreground border-border absolute top-6 right-4 z-10 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            {layer.label}
        </div>
    );
}

function StackAccordion({ active, setActive }: { active: number; setActive: (i: number) => void }) {
    return (
        <div className="border-border/60 border-y">
            {LAYERS.map((layer, i) => {
                const isActive = i === active;
                return (
                    <div
                        key={layer.id}
                        className={cn(
                            'border-border/60 relative border-b last:border-b-0',
                            isActive && 'bg-primary/5',
                        )}
                    >
                        {isActive && (
                            <span className="bg-primary absolute top-0 bottom-0 left-0 w-[2px]" />
                        )}
                        <button
                            type="button"
                            onClick={() => setActive(i)}
                            className="hover:bg-muted/40 focus-visible:ring-ring/40 flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            aria-expanded={isActive}
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span
                                    className={cn(
                                        'inline-block h-2 w-2 shrink-0 rounded-full transition-colors',
                                        isActive ? 'bg-primary' : 'bg-muted-foreground/40',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'text-base font-medium tracking-tight transition-colors',
                                        isActive ? 'text-primary' : 'text-foreground',
                                    )}
                                >
                                    {layer.label}
                                </span>
                            </span>
                            <ChevronDown
                                className={cn(
                                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-300',
                                    isActive ? 'rotate-180' : '',
                                )}
                            />
                        </button>
                        {isActive && (
                            <div className="px-4 pb-4 pl-[3.25rem]">
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {layer.description}
                                </p>
                                <p className="text-muted-foreground/70 mt-2 font-mono text-[11px]">
                                    {layer.short}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
