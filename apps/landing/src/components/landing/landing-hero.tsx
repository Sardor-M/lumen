const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

const READING_EDGES = [
    [60, 100, 135, 125],
    [40, 165, 135, 125],
    [40, 165, 75, 230],
    [75, 230, 135, 125],
    [135, 125, 200, 175],
    [135, 125, 90, 175],
    [60, 100, 90, 175],
    [90, 175, 40, 165],
    [90, 175, 115, 270],
    [75, 230, 115, 270],
    [115, 270, 165, 245],
    [165, 245, 200, 175],
    [165, 245, 200, 235],
    [200, 175, 200, 235],
    [175, 95, 135, 125],
    [175, 95, 200, 175],
    [175, 95, 90, 175],
];

const CODE_EDGES = [
    [295, 130, 385, 95],
    [295, 130, 270, 80],
    [295, 130, 340, 65],
    [270, 80, 340, 65],
    [340, 65, 385, 95],
    [385, 95, 420, 115],
    [420, 115, 425, 175],
    [425, 175, 370, 190],
    [385, 95, 370, 190],
    [370, 190, 295, 130],
    [295, 130, 290, 200],
    [290, 200, 335, 230],
    [335, 230, 370, 190],
    [335, 230, 290, 200],
    [420, 115, 370, 190],
];

const SESSION_EDGES = [
    [115, 385, 155, 350],
    [155, 350, 180, 405],
    [180, 405, 225, 395],
    [155, 350, 235, 325],
    [225, 395, 235, 325],
    [235, 325, 310, 350],
    [310, 350, 290, 405],
    [290, 405, 225, 395],
    [310, 350, 350, 390],
    [350, 390, 290, 405],
    [235, 325, 225, 395],
    [115, 385, 180, 405],
];

const BRIDGES: { coords: [number, number, number, number]; delay: 5 | 6 | 7 }[] = [
    { coords: [135, 125, 295, 130], delay: 5 },
    { coords: [200, 175, 290, 200], delay: 5 },
    { coords: [200, 235, 290, 200], delay: 6 },
    { coords: [175, 95, 270, 80], delay: 6 },
    { coords: [165, 245, 155, 350], delay: 6 },
    { coords: [115, 270, 155, 350], delay: 6 },
    { coords: [200, 235, 235, 325], delay: 7 },
    { coords: [335, 230, 235, 325], delay: 6 },
    { coords: [290, 200, 235, 325], delay: 7 },
    { coords: [370, 190, 350, 390], delay: 7 },
    { coords: [335, 230, 310, 350], delay: 7 },
];

type NodeKind = 'concept' | 'paper' | 'essay';
const NODES: {
    cx: number;
    cy: number;
    r: number;
    kind: NodeKind;
    hub?: boolean;
    delay: 3 | 4 | 5;
}[] = [
    { cx: 135, cy: 125, r: 9, kind: 'concept', hub: true, delay: 3 },
    { cx: 60, cy: 100, r: 4.5, kind: 'paper', delay: 3 },
    { cx: 40, cy: 165, r: 5, kind: 'essay', delay: 3 },
    { cx: 75, cy: 230, r: 5.5, kind: 'concept', delay: 3 },
    { cx: 200, cy: 175, r: 4.5, kind: 'paper', delay: 4 },
    { cx: 165, cy: 245, r: 5, kind: 'concept', delay: 4 },
    { cx: 90, cy: 175, r: 4, kind: 'concept', delay: 4 },
    { cx: 175, cy: 95, r: 4, kind: 'concept', delay: 4 },
    { cx: 115, cy: 270, r: 4, kind: 'concept', delay: 4 },
    { cx: 200, cy: 235, r: 4, kind: 'paper', delay: 4 },
    { cx: 295, cy: 130, r: 9, kind: 'concept', hub: true, delay: 3 },
    { cx: 385, cy: 95, r: 4.5, kind: 'paper', delay: 3 },
    { cx: 425, cy: 175, r: 4, kind: 'paper', delay: 4 },
    { cx: 370, cy: 190, r: 5, kind: 'concept', delay: 4 },
    { cx: 290, cy: 200, r: 5, kind: 'concept', delay: 4 },
    { cx: 335, cy: 230, r: 4, kind: 'concept', delay: 4 },
    { cx: 270, cy: 80, r: 4, kind: 'paper', delay: 4 },
    { cx: 340, cy: 65, r: 3.5, kind: 'paper', delay: 4 },
    { cx: 420, cy: 115, r: 4.5, kind: 'concept', delay: 4 },
    { cx: 235, cy: 325, r: 7, kind: 'concept', hub: true, delay: 4 },
    { cx: 155, cy: 350, r: 4.5, kind: 'essay', delay: 5 },
    { cx: 310, cy: 350, r: 4.5, kind: 'essay', delay: 5 },
    { cx: 225, cy: 395, r: 4.5, kind: 'concept', delay: 5 },
    { cx: 180, cy: 405, r: 4, kind: 'essay', delay: 5 },
    { cx: 115, cy: 385, r: 4, kind: 'paper', delay: 5 },
    { cx: 350, cy: 390, r: 4, kind: 'paper', delay: 5 },
    { cx: 290, cy: 405, r: 4, kind: 'concept', delay: 5 },
];

function fillFor(kind: NodeKind): string {
    if (kind === 'paper') return 'var(--ll-node-paper)';
    if (kind === 'essay') return 'var(--ll-node-essay)';
    return 'var(--ll-accent)';
}

const LABELS: { x: number; y: number; text: string; dim?: boolean; delay: 4 | 5 | 6 }[] = [
    { x: 148, y: 122, text: 'attention', delay: 4 },
    { x: 20, y: 92, text: 'transformer', dim: true, delay: 4 },
    { x: -2, y: 158, text: 'bitter-lesson', dim: true, delay: 4 },
    { x: 46, y: 246, text: 'scaling', delay: 4 },
    { x: 210, y: 172, text: 'chinchilla', dim: true, delay: 5 },
    { x: 125, y: 260, text: 'retrieval', delay: 5 },
    { x: 58, y: 172, text: 'icl', delay: 5 },
    { x: 186, y: 90, text: 'cot', delay: 5 },
    { x: 125, y: 278, text: 'rlhf', delay: 5 },
    { x: 208, y: 232, text: 'distill', dim: true, delay: 5 },
    { x: 232, y: 128, text: 'brain_ops()', delay: 4 },
    { x: 365, y: 86, text: 'CLAUDE.md', dim: true, delay: 4 },
    { x: 404, y: 192, text: '.mcp.json', dim: true, delay: 5 },
    { x: 362, y: 208, text: 'capture()', delay: 5 },
    { x: 244, y: 216, text: 'search()', delay: 5 },
    { x: 318, y: 246, text: 'pagerank()', delay: 5 },
    { x: 232, y: 72, text: 'pre-hook', dim: true, delay: 5 },
    { x: 306, y: 55, text: 'stop-hook', dim: true, delay: 5 },
    { x: 396, y: 106, text: 'ingest()', delay: 5 },
    { x: 246, y: 322, text: 'replay()', delay: 5 },
    { x: 100, y: 346, text: 't: fix-bug', dim: true, delay: 5 },
    { x: 320, y: 346, text: 't: add-route', dim: true, delay: 6 },
    { x: 232, y: 410, text: 'dx-pattern', delay: 6 },
    { x: 146, y: 418, text: 't: refactor', dim: true, delay: 6 },
    { x: 76, y: 380, text: 'scope:web', dim: true, delay: 6 },
    { x: 316, y: 384, text: 'alias-merge', dim: true, delay: 6 },
    { x: 282, y: 418, text: 'pii-scrub', delay: 6 },
];

export function LandingHero() {
    return (
        <section className="ll-hero">
            <div className="ll-wrap-wide">
                <div className="ll-hero-grid">
                    <div>
                        <div className="ll-hero-meta" data-ll-animate>
                            <span className="ll-hero-meta-dot" aria-hidden />
                            <span className="ll-hero-meta-label">
                                v 0.4.1 · <em>23 MCP tools</em> · MIT
                            </span>
                        </div>

                        <h1 className="ll-display" data-ll-animate>
                            A brain
                            <br />
                            that <span className="ll-italic">persists.</span>
                        </h1>

                        <p className="ll-hero-sub" data-ll-animate>
                            The <strong>persistent memory layer</strong> coding agents have been
                            missing. Compiled from your reading, your repos, your sessions —
                            recalled by Claude Code, Cursor, or any MCP client.{' '}
                            <strong>Local SQLite.</strong> End-to-end encrypted across every device
                            you own.
                        </p>

                        <div className="ll-hero-cta-row" data-ll-animate>
                            <a href={`${WEB_URL}/signup`} className="ll-btn ll-btn-primary">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    aria-hidden
                                >
                                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12" />
                                </svg>
                                Install
                            </a>
                            <a href="#how" className="ll-btn ll-btn-ghost">
                                How it works
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    aria-hidden
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </a>
                            <span className="ll-cmd-pill">npm i -g lumen-kb</span>
                        </div>

                        <div className="ll-hero-foot" data-ll-animate>
                            <span>
                                <svg
                                    className="ll-tick"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    aria-hidden
                                >
                                    <path d="M5 12l4 4 10-10" />
                                </svg>
                                23 MCP tools, one entry point
                            </span>
                            <span>
                                <svg
                                    className="ll-tick"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    aria-hidden
                                >
                                    <path d="M5 12l4 4 10-10" />
                                </svg>
                                Claude Code · Cursor · Codex
                            </span>
                            <span>
                                <svg
                                    className="ll-tick"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    aria-hidden
                                >
                                    <path d="M5 12l4 4 10-10" />
                                </svg>
                                E2E-encrypted sync
                            </span>
                        </div>
                    </div>

                    <div className="ll-hero-visual" data-ll-animate aria-hidden="true">
                        <span className="ll-hv-corner tl" />
                        <span className="ll-hv-corner tr" />
                        <span className="ll-hv-corner bl" />
                        <span className="ll-hv-corner br" />
                        <svg viewBox="0 0 460 460" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <pattern
                                    id="heroGrid"
                                    width="23"
                                    height="23"
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d="M 23 0 L 0 0 0 23"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        opacity="0.06"
                                    />
                                </pattern>
                                <radialGradient id="heroGlow" cx="50%" cy="50%" r="55%">
                                    <stop
                                        offset="0%"
                                        stopColor="var(--ll-accent)"
                                        stopOpacity="0.1"
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="var(--ll-accent)"
                                        stopOpacity="0"
                                    />
                                </radialGradient>
                            </defs>
                            <rect
                                width="460"
                                height="460"
                                fill="url(#heroGrid)"
                                color="var(--ll-fg-1)"
                            />
                            <circle
                                cx="230"
                                cy="230"
                                r="200"
                                fill="url(#heroGlow)"
                                className="ll-svg-pop ll-delay-2"
                            />

                            <g
                                fontFamily="var(--ll-font-mono)"
                                fontSize="8.5"
                                fill="var(--ll-fg-3)"
                                letterSpacing="2"
                            >
                                <text className="ll-svg-pop ll-delay-1" x="38" y="64">
                                    READING
                                </text>
                                <text className="ll-svg-pop ll-delay-1" x="320" y="64">
                                    YOUR&#160;CODE
                                </text>
                                <text className="ll-svg-pop ll-delay-1" x="184" y="412">
                                    SESSIONS
                                </text>
                            </g>
                            <g stroke="var(--ll-border-2)" strokeWidth="0.7">
                                <line
                                    className="ll-svg-line ll-delay-1"
                                    style={{ ['--ll-len' as string]: '80' }}
                                    x1="38"
                                    y1="70"
                                    x2="118"
                                    y2="70"
                                />
                                <line
                                    className="ll-svg-line ll-delay-1"
                                    style={{ ['--ll-len' as string]: '88' }}
                                    x1="320"
                                    y1="70"
                                    x2="408"
                                    y2="70"
                                />
                                <line
                                    className="ll-svg-line ll-delay-1"
                                    style={{ ['--ll-len' as string]: '80' }}
                                    x1="184"
                                    y1="418"
                                    x2="264"
                                    y2="418"
                                />
                            </g>

                            <g
                                fill="none"
                                stroke="var(--ll-border-2)"
                                strokeDasharray="2 4"
                                opacity="0.55"
                            >
                                <ellipse
                                    className="ll-svg-pop ll-delay-2"
                                    cx="118"
                                    cy="180"
                                    rx="98"
                                    ry="108"
                                />
                                <ellipse
                                    className="ll-svg-pop ll-delay-2"
                                    cx="345"
                                    cy="158"
                                    rx="92"
                                    ry="98"
                                />
                                <ellipse
                                    className="ll-svg-pop ll-delay-2"
                                    cx="232"
                                    cy="365"
                                    rx="128"
                                    ry="62"
                                />
                            </g>

                            <g
                                stroke="var(--ll-fg-3)"
                                strokeWidth="0.65"
                                fill="none"
                                opacity="0.45"
                            >
                                {READING_EDGES.map(([x1, y1, x2, y2], i) => (
                                    <line
                                        key={`r-${i}`}
                                        className={`ll-svg-line ${i < 5 ? 'll-delay-3' : 'll-delay-4'}`}
                                        style={{ ['--ll-len' as string]: '80' }}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                    />
                                ))}
                                {CODE_EDGES.map(([x1, y1, x2, y2], i) => (
                                    <line
                                        key={`c-${i}`}
                                        className={`ll-svg-line ${i < 5 ? 'll-delay-3' : 'll-delay-4'}`}
                                        style={{ ['--ll-len' as string]: '80' }}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                    />
                                ))}
                                {SESSION_EDGES.map(([x1, y1, x2, y2], i) => (
                                    <line
                                        key={`s-${i}`}
                                        className="ll-svg-line ll-delay-5"
                                        style={{ ['--ll-len' as string]: '80' }}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                    />
                                ))}
                            </g>

                            <g stroke="var(--ll-accent)" strokeWidth="1" fill="none" opacity="0.75">
                                {BRIDGES.map(({ coords: [x1, y1, x2, y2], delay }, i) => (
                                    <line
                                        key={`b-${i}`}
                                        className={`ll-svg-line ll-delay-${delay}`}
                                        style={{ ['--ll-len' as string]: '180' }}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                    />
                                ))}
                            </g>

                            <g className="nodes">
                                {NODES.map((n, i) => (
                                    <g key={`n-${i}`} className={`ll-svg-pop ll-delay-${n.delay}`}>
                                        <circle
                                            cx={n.cx}
                                            cy={n.cy}
                                            r={n.r}
                                            fill={fillFor(n.kind)}
                                        />
                                        {n.hub ? (
                                            <circle
                                                cx={n.cx}
                                                cy={n.cy}
                                                r={n.r - 0.8}
                                                fill="none"
                                                stroke="var(--ll-accent-ink)"
                                                strokeWidth="0.6"
                                                strokeOpacity="0.5"
                                            />
                                        ) : null}
                                    </g>
                                ))}
                            </g>

                            <g
                                fontFamily="var(--ll-font-mono)"
                                fontSize="8.5"
                                fill="var(--ll-fg-2)"
                            >
                                {LABELS.map((l, i) => (
                                    <text
                                        key={`l-${i}`}
                                        className={`ll-svg-pop ll-delay-${l.delay}`}
                                        x={l.x}
                                        y={l.y}
                                        fill={l.dim ? 'var(--ll-fg-3)' : 'var(--ll-fg-2)'}
                                    >
                                        {l.text}
                                    </text>
                                ))}
                            </g>
                        </svg>
                        <div className="ll-hv-caption">
                            <span>Fig 01 — Concepts, code, trajectories</span>
                            <span>—— 28 nodes · 51 edges · yours</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
