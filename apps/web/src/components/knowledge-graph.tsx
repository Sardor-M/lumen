'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentType,
    type Ref,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ForceGraphMethods, ForceGraphProps } from 'react-force-graph-2d';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Info, Maximize2, Minimize2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GraphSnapshot } from '@/lib/lumen';

/**
 * react-force-graph-2d touches `window` and a Canvas element at module
 * evaluation, so it must be loaded client-side only. `next/dynamic` drops the
 * component's generic type parameters, so we re-assert them via cast — this is
 * the only place we lie to the type system about react-force-graph-2d.
 */
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
}) as unknown as ComponentType<
    ForceGraphProps<GraphNode, GraphLink> & {
        ref?: Ref<ForceGraphMethods<GraphNode, GraphLink> | undefined>;
    }
>;

type GraphNode = {
    id: string;
    name: string;
    mentions: number;
    community: number;
    degree: number;
    /** Mutated by the force simulation. */
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
};

type GraphLink = {
    source: string | GraphNode;
    target: string | GraphNode;
    weight: number;
    relation: string;
};

/**
 * Saturated community palette tuned to read well on both light and dark
 * backgrounds — every color sits roughly between 50% and 70% lightness so
 * neither pure-white nor pure-black backgrounds wash it out.
 */
const COMMUNITY_PALETTE = [
    '#3b82f6', // blue
    '#f97316', // orange
    '#10b981', // emerald
    '#a855f7', // violet
    '#eab308', // amber
    '#ec4899', // pink
    '#14b8a6', // teal
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f59e0b', // amber-500
];

/**
 * Relation -> color. Picked from the same lightness band as community colors
 * so they stay legible against both themes. Unknown relations fall back to
 * the theme-aware neutral edge color.
 */
const RELATION_COLOR: Record<string, string> = {
    implements: '#8b5cf6',
    extends: '#10b981',
    derives: '#06b6d4',
    supports: '#3b82f6',
    contradicts: '#ef4444',
    'instance-of': '#a855f7',
    references: '#eab308',
    updates: '#a855f7',
};

function nodeColor(community: number): string {
    if (community < 0) return '#94a3b8';
    return COMMUNITY_PALETTE[community % COMMUNITY_PALETTE.length];
}

function relationColor(relation: string, fallback: string): string {
    return RELATION_COLOR[relation.toLowerCase()] ?? fallback;
}

/**
 * Read the current theme tokens off `:root` so canvas paints match whatever
 * the rest of the app is rendering. Recomputed when the `dark` class flips
 * (or `prefers-color-scheme` changes for users without an explicit override).
 */
function useThemeTokens() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const compute = () => {
            const explicit = document.documentElement.classList.contains('dark');
            const media = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(explicit || media);
        };
        compute();
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', compute);
        const obs = new MutationObserver(compute);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => {
            mq.removeEventListener('change', compute);
            obs.disconnect();
        };
    }, []);

    return isDark
        ? {
              background: 'rgba(0,0,0,0)',
              gridLine: 'rgba(255,255,255,0.05)',
              edge: 'rgba(148,163,184,0.55)',
              edgeDim: 'rgba(148,163,184,0.12)',
              label: 'rgba(248,250,252,0.95)',
              labelBg: 'rgba(15,23,42,0.85)',
              nodeStroke: 'rgba(15,23,42,0.95)',
          }
        : {
              background: 'rgba(0,0,0,0)',
              gridLine: 'rgba(15,23,42,0.04)',
              edge: 'rgba(71,85,105,0.55)',
              edgeDim: 'rgba(71,85,105,0.12)',
              label: 'rgba(15,23,42,0.95)',
              labelBg: 'rgba(248,250,252,0.92)',
              nodeStroke: 'rgba(255,255,255,0.95)',
          };
}

const NODE_BASE_RADIUS = 5;

type Variant = 'full' | 'preview';

export function KnowledgeGraph({
    snapshot,
    variant = 'full',
    height,
    href,
}: {
    snapshot: GraphSnapshot;
    /** 'full' = toolbar + legend (the dashboard page). 'preview' = canvas only. */
    variant?: Variant;
    /** Optional explicit height. Defaults to 640px for 'full' and 320px for 'preview'. */
    height?: number;
    /** Navigation target for the preview's open-graph arrow. Ignored in 'full'. */
    href?: string;
}) {
    const isPreview = variant === 'preview';
    const containerHeight = height ?? (isPreview ? 320 : 640);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [filter, setFilter] = useState('');
    const [hideSingletons, setHideSingletons] = useState(true);
    const [legendOpen, setLegendOpen] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const theme = useThemeTokens();

    /**
     * Press Escape to exit fullscreen. Body scroll-lock prevents
     * background pan; scroll position is restored on exit so the user
     * lands back exactly where they were on the page.
     */
    useEffect(() => {
        if (!isFullscreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        const scrollY = window.scrollY;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            window.scrollTo(0, scrollY);
        };
    }, [isFullscreen]);

    const { data, singletonCount } = useMemo(() => {
        const degree = new Map<string, number>();
        for (const e of snapshot.edges) {
            degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
            degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
        }
        const isConnected = (slug: string) => (degree.get(slug) ?? 0) > 0;
        const keepNode = (slug: string) => !hideSingletons || isConnected(slug);

        const nodes: GraphNode[] = snapshot.nodes
            .filter((n) => keepNode(n.slug))
            .map((n) => ({
                id: n.slug,
                name: n.name,
                mentions: n.mentions,
                community: n.community,
                degree: degree.get(n.slug) ?? 0,
            }));

        const links: GraphLink[] = snapshot.edges.map((e) => ({
            source: e.from,
            target: e.to,
            weight: e.weight,
            relation: e.relation,
        }));

        const singles = snapshot.nodes.filter((n) => !isConnected(n.slug)).length;

        return { data: { nodes, links }, singletonCount: singles };
    }, [snapshot, hideSingletons]);

    const communitiesInView = useMemo(() => {
        const counts = new Map<number, number>();
        for (const n of data.nodes) counts.set(n.community, (counts.get(n.community) ?? 0) + 1);
        return [...counts.entries()]
            .filter(([id]) => id >= 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    }, [data.nodes]);

    const relationsInView = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of snapshot.edges) {
            const k = e.relation.toLowerCase();
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [snapshot.edges]);

    /** Resize the canvas to the parent box. */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /** Tune force strengths so clusters don't collapse and spread reasonably. */
    useEffect(() => {
        const g = graphRef.current;
        if (!g) return;
        g.d3Force('charge')?.strength(-160);
        g.d3Force('link')?.distance(80);
    }, [data]);

    const normalizedFilter = filter.trim().toLowerCase();
    const isMatch = useCallback(
        (node: GraphNode): boolean => {
            if (!normalizedFilter) return true;
            return node.name.toLowerCase().includes(normalizedFilter);
        },
        [normalizedFilter],
    );

    const handleNodeClick = useCallback(
        (node: GraphNode) => {
            router.push(`/concepts/${node.id}`);
        },
        [router],
    );

    const handleNodeDragEnd = useCallback((node: GraphNode) => {
        node.fx = node.x;
        node.fy = node.y;
    }, []);

    const handleNodeRightClick = useCallback((node: GraphNode) => {
        node.fx = undefined;
        node.fy = undefined;
    }, []);

    /**
     * Custom node paint: filled disc with a themed stroke. Visual sizes are
     * computed in **screen pixels** by dividing by `globalScale`, so nodes
     * stay readable regardless of how far the user zooms out (or how far
     * auto-fit moves the camera when the disconnected toggle expands the
     * graph's bounding box). Labels only appear for the hovered node, for
     * the currently-filtered set, or past ~1.6x zoom.
     */
    const drawNode = useCallback(
        (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const matched = isMatch(node);
            const color = nodeColor(node.community);
            const isHovered = hoveredId === node.id;

            /** Target ~8 screen px for base nodes, grow modestly with degree. */
            const targetScreenPx = 7 + Math.min(7, Math.sqrt(node.degree) * 1.8);
            const radius = targetScreenPx / globalScale;
            /** Keep the stroke at a constant 1.5 screen px (2.5 when hovered). */
            const strokePx = isHovered ? 2.5 : 1.5;

            ctx.globalAlpha = matched ? 1 : 0.18;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = strokePx / globalScale;
            ctx.strokeStyle = isHovered ? theme.label : theme.nodeStroke;
            ctx.stroke();

            const showLabel =
                matched && (isHovered || globalScale > 1.6 || normalizedFilter.length > 0);
            if (showLabel) {
                const fontSize = 11 / globalScale;
                ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
                const text = node.name;
                const padX = 5 / globalScale;
                const padY = 3 / globalScale;
                const w = ctx.measureText(text).width + padX * 2;
                const h = fontSize + padY * 2;
                const x = (node.x ?? 0) - w / 2;
                const y = (node.y ?? 0) + radius + 4 / globalScale;
                ctx.fillStyle = theme.labelBg;
                ctx.beginPath();
                const r = 4 / globalScale;
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.fill();
                ctx.fillStyle = theme.label;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, node.x ?? 0, y + h / 2);
            }
            ctx.globalAlpha = 1;
        },
        [isMatch, hoveredId, normalizedFilter.length, theme.label, theme.labelBg, theme.nodeStroke],
    );

    const handleNodeHover = useCallback((node: GraphNode | null) => {
        setHoveredId(node?.id ?? null);
        document.body.style.cursor = node ? 'pointer' : '';
    }, []);

    useEffect(() => {
        return () => {
            document.body.style.cursor = '';
        };
    }, []);

    const drawLink = useCallback(
        (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const source = link.source as GraphNode;
            const target = link.target as GraphNode;
            if (source.x === undefined || target.x === undefined) return;
            const dimmed = !isMatch(source) && !isMatch(target);
            ctx.strokeStyle = dimmed ? theme.edgeDim : relationColor(link.relation, theme.edge);
            ctx.globalAlpha = dimmed ? 1 : 0.75;
            /** Constant 1px screen-space minimum, scaled with the link weight. */
            const widthPx = Math.max(1, Math.min(2.4, link.weight * 1.2));
            ctx.lineWidth = widthPx / globalScale;
            ctx.beginPath();
            ctx.moveTo(source.x, source.y ?? 0);
            ctx.lineTo(target.x, target.y ?? 0);
            ctx.stroke();
            ctx.globalAlpha = 1;
        },
        [isMatch, theme.edge, theme.edgeDim],
    );

    if (snapshot.nodes.length === 0) return null;

    /**
     * Outer placeholder always occupies its slot in the page layout
     * (so nothing reflows when fullscreen toggles). The inner surface
     * either fills the placeholder (normal mode) or escapes to a fixed
     * viewport overlay (fullscreen mode).
     */
    return (
        <div className="relative w-full" style={{ height: containerHeight }}>
            <div
                className={cn(
                    'overflow-hidden',
                    isFullscreen
                        ? 'bg-background fixed inset-0 z-50'
                        : 'bg-card/40 dark:bg-card/30 absolute inset-0 rounded-xl border',
                )}
            >
                {!isPreview && (
                    <>
                        <Toolbar
                            filter={filter}
                            setFilter={setFilter}
                            hideSingletons={hideSingletons}
                            setHideSingletons={setHideSingletons}
                            visibleNodes={data.nodes.length}
                            totalNodes={snapshot.nodes.length}
                            edges={snapshot.edges.length}
                            singletonCount={singletonCount}
                        />

                        <FullscreenToggle
                            isFullscreen={isFullscreen}
                            legendOpen={legendOpen}
                            onToggle={() => setIsFullscreen((v) => !v)}
                        />

                        <Legend
                            open={legendOpen}
                            setOpen={setLegendOpen}
                            communities={communitiesInView}
                            relations={relationsInView}
                            nodes={data.nodes.length}
                            edges={snapshot.edges.length}
                            communitiesCount={snapshot.communities.length}
                            disconnected={singletonCount}
                            hideSingletons={hideSingletons}
                        />

                        <div className="text-muted-foreground absolute right-3 bottom-3 z-10 text-xs">
                            drag · scroll to zoom · right-click to unpin · click to open
                            {isFullscreen && <span className="ml-2 opacity-70">· esc to exit</span>}
                        </div>
                    </>
                )}

                {isPreview && (
                    <PreviewOverlay
                        nodes={data.nodes.length}
                        edges={snapshot.edges.length}
                        communities={snapshot.communities.length}
                        href={href}
                    />
                )}

                <div ref={containerRef} className="h-full w-full">
                    {size.w > 0 && size.h > 0 && (
                        <ForceGraph2D
                            ref={graphRef}
                            graphData={data}
                            width={size.w}
                            height={size.h}
                            backgroundColor={theme.background}
                            nodeRelSize={NODE_BASE_RADIUS}
                            nodeLabel={(n) =>
                                `${n.name} — ${n.degree} edges · ${n.mentions} mentions`
                            }
                            nodeCanvasObject={drawNode}
                            nodeCanvasObjectMode={() => 'replace'}
                            linkCanvasObject={drawLink}
                            linkCanvasObjectMode={() => 'replace'}
                            linkDirectionalArrowLength={isPreview ? 0 : 2.5}
                            linkDirectionalArrowRelPos={0.92}
                            onNodeClick={isPreview ? undefined : handleNodeClick}
                            onNodeHover={isPreview ? undefined : handleNodeHover}
                            onNodeDragEnd={handleNodeDragEnd}
                            onNodeRightClick={isPreview ? undefined : handleNodeRightClick}
                            enableNodeDrag={true}
                            enableZoomInteraction={!isPreview}
                            enablePanInteraction={!isPreview}
                            cooldownTicks={isPreview ? 80 : 160}
                            warmupTicks={isPreview ? 30 : 60}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function PreviewOverlay({
    nodes,
    edges,
    communities,
    href,
}: {
    nodes: number;
    edges: number;
    communities: number;
    href?: string;
}) {
    return (
        <>
            <div className="bg-background/80 border-border absolute top-3 left-3 z-10 inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11px] backdrop-blur">
                <span className="font-semibold">{nodes}</span>
                <span className="text-muted-foreground">concepts</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{edges}</span>
                <span className="text-muted-foreground">edges</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{communities}</span>
                <span className="text-muted-foreground">communities</span>
            </div>

            {href && (
                <Link
                    href={href}
                    aria-label="Open the full memory graph"
                    className="bg-background/80 hover:bg-background border-border focus-visible:ring-ring/40 absolute top-3 right-3 z-10 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                </Link>
            )}

            <div className="text-muted-foreground absolute right-3 bottom-3 z-10 text-[10px]">
                drag a node to move it · click open for full controls
            </div>
        </>
    );
}

function Toolbar({
    filter,
    setFilter,
    hideSingletons,
    setHideSingletons,
    visibleNodes,
    totalNodes,
    edges,
    singletonCount,
}: {
    filter: string;
    setFilter: (v: string) => void;
    hideSingletons: boolean;
    setHideSingletons: (fn: (v: boolean) => boolean) => void;
    visibleNodes: number;
    totalNodes: number;
    edges: number;
    singletonCount: number;
}) {
    return (
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-background/85 border-border flex h-8 items-center rounded-md border backdrop-blur">
                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter by name…"
                    className="h-8 w-56 border-0 bg-transparent focus-visible:ring-0"
                />
            </div>

            <div className="bg-background/85 border-border text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs backdrop-blur">
                <span className="font-semibold">{visibleNodes}</span>
                <span className="text-muted-foreground">/ {totalNodes} nodes</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{edges}</span>
                <span className="text-muted-foreground">edges</span>
            </div>

            {singletonCount > 0 && (
                <button
                    type="button"
                    onClick={() => setHideSingletons((v) => !v)}
                    className="bg-background/85 border-border hover:bg-background focus-visible:ring-ring/40 inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    aria-pressed={hideSingletons}
                >
                    <span
                        className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            hideSingletons ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                        )}
                    />
                    {hideSingletons
                        ? `Hiding ${singletonCount} disconnected`
                        : `Showing ${singletonCount} disconnected`}
                </button>
            )}
        </div>
    );
}

function Legend({
    open,
    setOpen,
    communities,
    relations,
    nodes,
    edges,
    communitiesCount,
    disconnected,
    hideSingletons,
}: {
    open: boolean;
    setOpen: (fn: (v: boolean) => boolean) => void;
    communities: [number, number][];
    relations: [string, number][];
    nodes: number;
    edges: number;
    communitiesCount: number;
    disconnected: number;
    hideSingletons: boolean;
}) {
    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Open legend"
                title="Legend"
                className="bg-background/80 border-border hover:bg-background focus-visible:ring-ring/40 absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
                <Info className="text-muted-foreground h-3.5 w-3.5" />
            </button>
        );
    }

    return (
        <div className="absolute top-3 right-3 z-10 w-56">
            <div className="bg-background/90 border-border max-h-[80vh] overflow-hidden rounded-md border shadow-lg backdrop-blur">
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold tracking-wide uppercase">Legend</span>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-label="Close legend"
                        className="hover:bg-muted/50 text-muted-foreground hover:text-foreground inline-flex h-5 w-5 items-center justify-center rounded transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
                <div className="max-h-[68vh] space-y-3 overflow-y-auto px-3 pb-3 text-xs">
                    <LegendSection title="Stats">
                        <Row label="Concepts" value={String(nodes)} />
                        <Row label="Connections" value={String(edges)} />
                        <Row label="Communities" value={String(communitiesCount)} />
                        {disconnected > 0 && (
                            <Row
                                label="Disconnected"
                                value={`${disconnected}${hideSingletons ? ' hidden' : ''}`}
                            />
                        )}
                    </LegendSection>

                    <CollapsibleSection title="What you're looking at">
                        <div className="flex items-start gap-2">
                            <span className="bg-foreground mt-1 inline-block h-2 w-2 shrink-0 rounded-full" />
                            <p>
                                <span className="font-medium">Node</span> — a concept Lumen pulled
                                from your reading. Click to open.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-muted-foreground/60 mt-1.5 inline-block h-0.5 w-3 shrink-0" />
                            <p>
                                <span className="font-medium">Edge</span> — a relationship
                                (implements, extends, supports…). Arrow shows direction.
                            </p>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Connection status">
                        <Swatch
                            shape="dot"
                            color="bg-emerald-500"
                            label="Connected"
                            help="Has at least one edge. Inside a cluster."
                        />
                        <Swatch
                            shape="ring"
                            label="Disconnected"
                            help="No edges yet — usually a concept that only appears in one source."
                        />
                        <Link
                            href="/learn/graph-density"
                            className="text-foreground inline-block underline underline-offset-2"
                        >
                            Why? →
                        </Link>
                    </CollapsibleSection>

                    {communities.length > 0 && (
                        <CollapsibleSection title="Communities">
                            <Note>
                                <span className="text-foreground">Size</span> = edge count ·{' '}
                                <span className="text-foreground">color</span> = community
                            </Note>
                            <div className="space-y-1">
                                {communities.map(([id, count]) => (
                                    <div
                                        key={id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="inline-block h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: nodeColor(id) }}
                                            />
                                            <span>Community {id}</span>
                                        </div>
                                        <span className="text-muted-foreground font-mono">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}

                    {relations.length > 0 && (
                        <CollapsibleSection title="Edge types">
                            {relations.map(([rel, count]) => (
                                <div key={rel} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="inline-block h-0.5 w-4"
                                            style={{
                                                backgroundColor: relationColor(rel, '#94a3b8'),
                                            }}
                                        />
                                        <span className="capitalize">{rel}</span>
                                    </div>
                                    <span className="text-muted-foreground font-mono">{count}</span>
                                </div>
                            ))}
                        </CollapsibleSection>
                    )}

                    <CollapsibleSection title="Controls">
                        <Note>
                            <span className="text-foreground">Hover</span> a node to see its name ·{' '}
                            <span className="text-foreground">click</span> to open ·{' '}
                            <span className="text-foreground">drag</span> to pin ·{' '}
                            <span className="text-foreground">right-click</span> to release ·{' '}
                            <span className="text-foreground">scroll</span> to zoom
                        </Note>
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
}

function FullscreenToggle({
    isFullscreen,
    legendOpen,
    onToggle,
}: {
    isFullscreen: boolean;
    legendOpen: boolean;
    onToggle: () => void;
}) {
    /**
     * Sits to the left of the legend control. When the legend is collapsed
     * (h-8 w-8 icon button at right-3) we offset by ~44px; when it's open
     * (w-56 panel at right-3) we offset past the panel.
     */
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Exit fullscreen (esc)' : 'Fullscreen'}
            className={cn(
                'bg-background/80 border-border hover:bg-background focus-visible:ring-ring/40 absolute top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-all focus-visible:ring-2 focus-visible:outline-none',
                legendOpen ? 'right-[15rem]' : 'right-14',
            )}
        >
            {isFullscreen ? (
                <Minimize2 className="text-muted-foreground h-3.5 w-3.5" />
            ) : (
                <Maximize2 className="text-muted-foreground h-3.5 w-3.5" />
            )}
        </button>
    );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-border/60 border-t pt-2">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="hover:text-foreground text-muted-foreground flex w-full items-center justify-between text-[10px] font-semibold tracking-wider uppercase transition-colors"
            >
                {title}
                <ChevronDown
                    className={cn('h-3 w-3 transition-transform', !open && '-rotate-90')}
                />
            </button>
            {open && <div className="mt-2 space-y-1.5">{children}</div>}
        </div>
    );
}

function Swatch({
    shape,
    color,
    label,
    help,
}: {
    shape: 'dot' | 'ring';
    color?: string;
    label: string;
    help: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <span
                className={cn(
                    'mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    shape === 'dot'
                        ? (color ?? 'bg-foreground')
                        : 'border-muted-foreground/60 border border-dashed',
                )}
            />
            <p>
                <span className="font-medium">{label}</span>{' '}
                <span className="text-muted-foreground">— {help}</span>
            </p>
        </div>
    );
}

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                {title}
            </p>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span>{label}</span>
            <span className="text-muted-foreground font-mono">{value}</span>
        </div>
    );
}

function Note({ children }: { children: React.ReactNode }) {
    return <p className="text-muted-foreground text-[10px] leading-relaxed">{children}</p>;
}
