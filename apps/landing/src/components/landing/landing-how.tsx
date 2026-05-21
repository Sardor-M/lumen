export function LandingHow() {
    return (
        <section className="ll-how" id="how">
            <div className="ll-wrap">
                <header className="ll-how-head">
                    <div className="ll-eyebrow" data-ll-animate>
                        § 02 · How Lumen works
                    </div>
                    <h2 className="ll-h2" data-ll-animate>
                        Three verbs. <em className="ll-italic-accent">Ingest, store, compile.</em>
                    </h2>
                    <p data-ll-animate>
                        Each runs locally. Each is one command. Search and recall — the part the
                        agent uses — never leaves your machine. Compile is the only step that talks
                        to a model, and only because you asked it to.
                    </p>
                </header>

                <div className="ll-triptych" data-ll-animate>
                    <IngestStage />
                    <StoreStage />
                    <CompileStage />
                </div>
            </div>
        </section>
    );
}

function IngestStage() {
    return (
        <div className="ll-stage">
            <div className="ll-stage-head">
                <span className="ll-stage-num">01 / Ingest</span>
            </div>
            <div className="ll-stage-title">Ingest.</div>
            <div className="ll-stage-canvas">
                <svg viewBox="0 0 320 220">
                    <defs>
                        <marker
                            id="ll-arr1"
                            viewBox="0 0 8 8"
                            refX="4"
                            refY="4"
                            markerWidth="5"
                            markerHeight="5"
                            orient="auto"
                        >
                            <path d="M0,0 L8,4 L0,8 z" fill="var(--ll-fg-3)" />
                        </marker>
                    </defs>
                    <g className="ll-svg-pop ll-delay-1">
                        <rect
                            x="20"
                            y="22"
                            width="280"
                            height="28"
                            rx="3"
                            fill="none"
                            stroke="var(--ll-border-3)"
                            strokeWidth="1"
                        />
                        <circle cx="32" cy="36" r="3" fill="var(--ll-accent)" />
                        <text
                            x="42"
                            y="40"
                            fontFamily="var(--ll-font-mono)"
                            fontSize="10"
                            fill="var(--ll-fg-2)"
                        >
                            https://aeon.co/essays/the-bitter-lesson
                        </text>
                    </g>
                    <path
                        className="ll-svg-line ll-delay-2"
                        style={{ ['--ll-len' as string]: '30' }}
                        d="M 160 56 L 160 82"
                        stroke="var(--ll-fg-3)"
                        strokeWidth="1"
                        fill="none"
                        markerEnd="url(#ll-arr1)"
                    />
                    <g fontFamily="var(--ll-font-mono)" fontSize="8.5">
                        {[
                            {
                                x: 20,
                                y: 92,
                                delay: 3,
                                title: 'CHUNK 01 · 312 tok',
                                body: 'Compute beats handcrafted',
                            },
                            {
                                x: 165,
                                y: 92,
                                delay: 4,
                                title: 'CHUNK 02 · 287 tok',
                                body: 'Search > priors at scale',
                            },
                            {
                                x: 20,
                                y: 136,
                                delay: 5,
                                title: 'CHUNK 03 · 254 tok',
                                body: 'The lesson, restated',
                            },
                            {
                                x: 165,
                                y: 136,
                                delay: 6,
                                title: 'CHUNK 04 · 198 tok',
                                body: 'Implications for ML',
                            },
                        ].map((c, i) => (
                            <g
                                key={i}
                                className={`ll-svg-pop ll-delay-${c.delay}`}
                                transform={`translate(${c.x}, ${c.y})`}
                            >
                                <rect
                                    width="135"
                                    height="34"
                                    rx="2"
                                    fill="var(--ll-bg-1)"
                                    stroke="var(--ll-border-2)"
                                />
                                <text x="8" y="13" fill="var(--ll-fg-3)" fontSize="7">
                                    {c.title}
                                </text>
                                <text x="8" y="26" fill="var(--ll-fg-1)">
                                    {c.body}
                                </text>
                            </g>
                        ))}
                    </g>
                    <g
                        className="ll-svg-pop ll-delay-7"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="7"
                        fill="var(--ll-accent)"
                        opacity="0.7"
                    >
                        <text x="20" y="190">
                            [0.12, -0.78, 0.43, …]
                        </text>
                        <text x="165" y="190">
                            [0.55, 0.21, -0.09, …]
                        </text>
                        <text x="20" y="204">
                            [-0.31, 0.66, 0.18, …]
                        </text>
                        <text x="165" y="204">
                            [0.04, -0.42, 0.71, …]
                        </text>
                    </g>
                </svg>
            </div>
            <p className="ll-stage-desc">
                URLs, PDFs, YouTube transcripts, arXiv, whole code repos, datasets, images, Obsidian
                vaults — all become <strong>semantic chunks</strong>. SHA-256 dedup, no LLM, never
                leaves disk.
            </p>
            <div className="ll-stage-detail">
                <span>9 source types · SHA-256 dedup</span>
                <span>Local embeddings via sqlite-vec</span>
            </div>
        </div>
    );
}

function StoreStage() {
    return (
        <div className="ll-stage">
            <div className="ll-stage-head">
                <span className="ll-stage-num">02 / Store</span>
            </div>
            <div className="ll-stage-title">Store.</div>
            <div className="ll-stage-canvas">
                <svg viewBox="0 0 320 220">
                    <g className="ll-svg-pop ll-delay-1">
                        <ellipse
                            cx="160"
                            cy="60"
                            rx="80"
                            ry="14"
                            fill="var(--ll-bg-1)"
                            stroke="var(--ll-border-3)"
                        />
                        <path
                            d="M 80 60 L 80 160 A 80 14 0 0 0 240 160 L 240 60"
                            fill="var(--ll-bg-1)"
                            stroke="var(--ll-border-3)"
                        />
                        <ellipse
                            cx="160"
                            cy="60"
                            rx="80"
                            ry="14"
                            fill="none"
                            stroke="var(--ll-border-3)"
                        />
                        <ellipse
                            cx="160"
                            cy="95"
                            rx="80"
                            ry="14"
                            fill="none"
                            stroke="var(--ll-border-2)"
                            strokeDasharray="3 3"
                        />
                        <ellipse
                            cx="160"
                            cy="130"
                            rx="80"
                            ry="14"
                            fill="none"
                            stroke="var(--ll-border-2)"
                            strokeDasharray="3 3"
                        />
                    </g>
                    <g fontFamily="var(--ll-font-mono)" fontSize="8" fill="var(--ll-fg-2)">
                        <text className="ll-svg-pop ll-delay-2" x="100" y="78">
                            chunks + fts5
                        </text>
                        <text
                            className="ll-svg-pop ll-delay-2"
                            x="200"
                            y="78"
                            fill="var(--ll-fg-3)"
                        >
                            1,284 rows
                        </text>
                        <text className="ll-svg-pop ll-delay-3" x="100" y="113">
                            concepts + edges
                        </text>
                        <text
                            className="ll-svg-pop ll-delay-3"
                            x="200"
                            y="113"
                            fill="var(--ll-fg-3)"
                        >
                            312 rows
                        </text>
                        <text className="ll-svg-pop ll-delay-4" x="100" y="148">
                            trajectories
                        </text>
                        <text
                            className="ll-svg-pop ll-delay-4"
                            x="200"
                            y="148"
                            fill="var(--ll-fg-3)"
                        >
                            47 rows
                        </text>
                    </g>
                    <g className="ll-svg-pop ll-delay-5">
                        <rect
                            x="40"
                            y="178"
                            width="240"
                            height="24"
                            rx="3"
                            fill="var(--ll-bg-inset)"
                            stroke="var(--ll-border-2)"
                        />
                        <text
                            x="52"
                            y="194"
                            fontFamily="var(--ll-font-mono)"
                            fontSize="9.5"
                            fill="var(--ll-bg-inset-fg)"
                        >
                            ~/.lumen/lumen.db
                        </text>
                        <text
                            x="225"
                            y="194"
                            fontFamily="var(--ll-font-mono)"
                            fontSize="9"
                            fill="rgba(217,144,67,0.85)"
                        >
                            v15
                        </text>
                    </g>
                    <g className="ll-svg-pop ll-delay-3" transform="translate(248, 95)">
                        <rect width="46" height="14" rx="7" fill="var(--ll-accent-soft)" />
                        <text
                            x="6"
                            y="10"
                            fontFamily="var(--ll-font-mono)"
                            fontSize="8"
                            fill="var(--ll-accent)"
                        >
                            BM25 FTS
                        </text>
                    </g>
                </svg>
            </div>
            <p className="ll-stage-desc">
                Everything lands in a single <strong>SQLite file</strong>. FTS5 + sqlite-vec ANN
                built in. <strong>Scope-aware</strong>: codebase A doesn&apos;t pollute results in
                repo B.
            </p>
            <div className="ll-stage-detail">
                <span>v15 schema · BM25 + vector + graph</span>
                <span>Scope-routed · PII-scrubbed on write</span>
            </div>
        </div>
    );
}

function CompileStage() {
    return (
        <div className="ll-stage">
            <div className="ll-stage-head">
                <span className="ll-stage-num">03 / Compile</span>
            </div>
            <div className="ll-stage-title">Compile.</div>
            <div className="ll-stage-canvas">
                <svg viewBox="0 0 320 220">
                    <g className="ll-svg-pop ll-delay-1">
                        {[32, 52, 72, 92, 112].map((y) => (
                            <rect
                                key={y}
                                x="18"
                                y={y}
                                width="84"
                                height="14"
                                rx="2"
                                fill="var(--ll-bg-1)"
                                stroke="var(--ll-border-2)"
                            />
                        ))}
                    </g>
                    <g stroke="var(--ll-accent)" strokeWidth="1" fill="none" opacity="0.55">
                        <path
                            className="ll-svg-line ll-delay-3"
                            style={{ ['--ll-len' as string]: '110' }}
                            d="M 102 39 Q 150 60 200 90"
                        />
                        <path
                            className="ll-svg-line ll-delay-3"
                            style={{ ['--ll-len' as string]: '110' }}
                            d="M 102 59 Q 140 80 175 130"
                        />
                        <path
                            className="ll-svg-line ll-delay-4"
                            style={{ ['--ll-len' as string]: '110' }}
                            d="M 102 79 Q 160 90 230 130"
                        />
                        <path
                            className="ll-svg-line ll-delay-4"
                            style={{ ['--ll-len' as string]: '110' }}
                            d="M 102 99 Q 150 130 175 130"
                        />
                        <path
                            className="ll-svg-line ll-delay-5"
                            style={{ ['--ll-len' as string]: '110' }}
                            d="M 102 119 Q 140 140 200 90"
                        />
                    </g>
                    <g>
                        <circle
                            className="ll-svg-pop ll-delay-4"
                            cx="200"
                            cy="90"
                            r="9"
                            fill="var(--ll-accent)"
                        />
                        <circle
                            className="ll-svg-pop ll-delay-4"
                            cx="175"
                            cy="130"
                            r="7"
                            fill="var(--ll-fg-1)"
                        />
                        <circle
                            className="ll-svg-pop ll-delay-5"
                            cx="230"
                            cy="130"
                            r="8"
                            fill="var(--ll-accent)"
                            opacity="0.7"
                        />
                        <circle
                            className="ll-svg-pop ll-delay-5"
                            cx="260"
                            cy="80"
                            r="6"
                            fill="var(--ll-fg-1)"
                        />
                        <circle
                            className="ll-svg-pop ll-delay-6"
                            cx="278"
                            cy="155"
                            r="7"
                            fill="var(--ll-fg-1)"
                        />
                        <circle
                            className="ll-svg-pop ll-delay-6"
                            cx="220"
                            cy="178"
                            r="5"
                            fill="var(--ll-accent)"
                            opacity="0.6"
                        />
                    </g>
                    <g stroke="var(--ll-fg-1)" strokeWidth="0.9" opacity="0.5" fill="none">
                        <line
                            className="ll-svg-line ll-delay-6"
                            style={{ ['--ll-len' as string]: '60' }}
                            x1="200"
                            y1="90"
                            x2="175"
                            y2="130"
                        />
                        <line
                            className="ll-svg-line ll-delay-6"
                            style={{ ['--ll-len' as string]: '60' }}
                            x1="200"
                            y1="90"
                            x2="230"
                            y2="130"
                        />
                        <line
                            className="ll-svg-line ll-delay-6"
                            style={{ ['--ll-len' as string]: '60' }}
                            x1="230"
                            y1="130"
                            x2="278"
                            y2="155"
                        />
                        <line
                            className="ll-svg-line ll-delay-7"
                            style={{ ['--ll-len' as string]: '60' }}
                            x1="175"
                            y1="130"
                            x2="220"
                            y2="178"
                        />
                        <line
                            className="ll-svg-line ll-delay-7"
                            style={{ ['--ll-len' as string]: '60' }}
                            x1="260"
                            y1="80"
                            x2="200"
                            y2="90"
                        />
                    </g>
                    <g className="ll-svg-pop ll-delay-2" transform="translate(118, 192)">
                        <rect width="86" height="14" rx="7" fill="var(--ll-accent-soft)" />
                        <text
                            x="8"
                            y="10"
                            fontFamily="var(--ll-font-mono)"
                            fontSize="7.5"
                            fill="var(--ll-accent)"
                        >
                            llm · compile
                        </text>
                    </g>
                    <g fontFamily="var(--ll-font-mono)" fontSize="7" fill="var(--ll-fg-2)">
                        <text className="ll-svg-pop ll-delay-5" x="212" y="93">
                            scaling
                        </text>
                        <text className="ll-svg-pop ll-delay-5" x="155" y="148">
                            attention
                        </text>
                        <text className="ll-svg-pop ll-delay-6" x="242" y="148">
                            retrieval
                        </text>
                        <text className="ll-svg-pop ll-delay-6" x="270" y="76">
                            priors
                        </text>
                    </g>
                </svg>
            </div>
            <p className="ll-stage-desc">
                An LLM reads across your chunks and proposes{' '}
                <strong>concepts and weighted edges</strong>. Tiered enrichment, near-duplicate
                merge on write, trajectory capture from sessions.
            </p>
            <div className="ll-stage-detail">
                <span>Delta-aware · parallel · cacheable</span>
                <span>Anthropic · OpenRouter · Ollama</span>
            </div>
        </div>
    );
}
