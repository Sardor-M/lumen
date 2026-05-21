export function LandingMcp() {
    return (
        <section className="ll-mcp" id="mcp">
            <div className="ll-wrap">
                <div className="ll-mcp-grid">
                    <div className="ll-mcp-side">
                        <div className="ll-eyebrow" data-ll-animate>
                            § 06 · MCP · the agent loop
                        </div>
                        <h2 className="ll-h2" data-ll-animate>
                            Wire it into <em className="ll-italic-accent">the agent.</em>
                        </h2>
                        <p data-ll-animate>
                            Run <code className="ll-mono ll-inline">lumen install claude</code> and
                            the brain comes online inside Claude Code: a{' '}
                            <code className="ll-mono ll-inline">CLAUDE.md</code> protocol, the MCP
                            server with all 23 tools, a pre-tool hook, and a stop hook that captures
                            new knowledge after every response.
                        </p>
                        <p data-ll-animate style={{ marginTop: 18 }}>
                            The same MCP server plugs into Cursor and Codex. For agents that
                            don&apos;t speak MCP, native adapters cover{' '}
                            <strong style={{ color: 'var(--ll-fg-1)', fontWeight: 500 }}>
                                OpenAI, AI SDK, LangChain, and Mastra
                            </strong>
                            .
                        </p>
                    </div>

                    <div className="ll-mcp-diagram" data-ll-animate aria-hidden="true">
                        <McpDiagram />
                    </div>
                </div>
            </div>
        </section>
    );
}

function McpDiagram() {
    return (
        <svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet">
            <defs>
                <pattern id="mcpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.4"
                        opacity="0.05"
                    />
                </pattern>
                <marker
                    id="ll-arrAcc"
                    viewBox="0 0 8 8"
                    refX="6"
                    refY="4"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--ll-accent)" />
                </marker>
                <marker
                    id="ll-arrDim"
                    viewBox="0 0 8 8"
                    refX="6"
                    refY="4"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                >
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--ll-fg-3)" />
                </marker>
            </defs>
            <rect width="560" height="400" fill="url(#mcpGrid)" color="var(--ll-fg-1)" />

            <text
                className="ll-svg-pop ll-delay-1"
                x="22"
                y="28"
                fontFamily="var(--ll-font-mono)"
                fontSize="9"
                fill="var(--ll-fg-3)"
                letterSpacing="1.8"
            >
                01 · AGENT LOOP
            </text>
            <line
                className="ll-svg-line ll-delay-1"
                style={{ ['--ll-len' as string]: '110' }}
                x1="22"
                y1="34"
                x2="132"
                y2="34"
                stroke="var(--ll-border-2)"
                strokeWidth="0.8"
            />

            <g className="ll-svg-pop ll-delay-2">
                <rect
                    x="22"
                    y="58"
                    width="180"
                    height="148"
                    rx="6"
                    fill="var(--ll-bg-0)"
                    stroke="var(--ll-border-3)"
                    strokeWidth="0.9"
                />
                <text
                    x="36"
                    y="80"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="9"
                    fill="var(--ll-fg-3)"
                    letterSpacing="1.5"
                >
                    YOUR MACHINE
                </text>
                <line
                    x1="36"
                    y1="88"
                    x2="188"
                    y2="88"
                    stroke="var(--ll-border-2)"
                    strokeWidth="0.6"
                />
                <g transform="translate(40, 100)">
                    <g stroke="var(--ll-fg-3)" strokeWidth="0.65" opacity="0.5">
                        <line x1="20" y1="40" x2="60" y2="20" />
                        <line x1="60" y1="20" x2="100" y2="45" />
                        <line x1="60" y1="20" x2="140" y2="35" />
                        <line x1="100" y1="45" x2="50" y2="72" />
                        <line x1="50" y1="72" x2="20" y2="40" />
                        <line x1="50" y1="72" x2="110" y2="78" />
                        <line x1="100" y1="45" x2="140" y2="35" />
                        <line x1="110" y1="78" x2="140" y2="35" />
                    </g>
                    <circle cx="20" cy="40" r="4.5" fill="var(--ll-accent)" />
                    <circle cx="60" cy="20" r="3.8" fill="var(--ll-node-paper)" />
                    <circle cx="100" cy="45" r="4.2" fill="var(--ll-accent)" />
                    <circle cx="50" cy="72" r="3.5" fill="var(--ll-node-essay)" />
                    <circle cx="110" cy="78" r="3" fill="var(--ll-node-paper)" />
                    <circle cx="140" cy="35" r="3.5" fill="var(--ll-accent)" />
                </g>
                <text
                    x="36"
                    y="195"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8.5"
                    fill="var(--ll-accent)"
                >
                    lumen --mcp
                </text>
                <text
                    x="148"
                    y="195"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8"
                    fill="var(--ll-fg-3)"
                >
                    23 tools
                </text>
            </g>

            <g className="ll-svg-pop ll-delay-3">
                <rect
                    x="226"
                    y="108"
                    width="108"
                    height="48"
                    rx="24"
                    fill="var(--ll-bg-0)"
                    stroke="var(--ll-accent)"
                    strokeWidth="1.2"
                />
                <text
                    x="280"
                    y="130"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="11"
                    fill="var(--ll-accent)"
                    textAnchor="middle"
                    letterSpacing="2.5"
                    fontWeight="500"
                >
                    MCP
                </text>
                <text
                    x="280"
                    y="145"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8.5"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                >
                    stdio · json-rpc
                </text>
            </g>

            <g className="ll-svg-pop ll-delay-4">
                <rect
                    x="358"
                    y="58"
                    width="180"
                    height="148"
                    rx="6"
                    fill="var(--ll-bg-0)"
                    stroke="var(--ll-border-3)"
                    strokeWidth="0.9"
                />
                <text
                    x="372"
                    y="80"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="9"
                    fill="var(--ll-fg-3)"
                    letterSpacing="1.5"
                >
                    AGENT
                </text>
                <line
                    x1="372"
                    y1="88"
                    x2="524"
                    y2="88"
                    stroke="var(--ll-border-2)"
                    strokeWidth="0.6"
                />
                <text
                    x="372"
                    y="106"
                    fontFamily="var(--ll-font-sans)"
                    fontSize="12"
                    fill="var(--ll-fg-1)"
                    fontWeight="500"
                >
                    Claude Code
                </text>
                <text
                    x="372"
                    y="126"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="10"
                    fill="var(--ll-accent)"
                >
                    brain_ops(&quot;attention&quot;)
                </text>
                <text
                    x="372"
                    y="142"
                    fontFamily="var(--ll-font-sans)"
                    fontSize="10"
                    fill="var(--ll-fg-2)"
                >
                    → 6 chunks · 2 trajectories
                </text>
                <g
                    transform="translate(372, 158)"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8.5"
                    fill="var(--ll-fg-3)"
                >
                    <text y="0">vaswani-2017.pdf §3.2</text>
                    <text y="13">sutton-bitter-lesson §1</text>
                    <text y="26">trajectory · add-tool</text>
                    <text y="39">budget · 3.2k/8k tokens</text>
                </g>
            </g>

            <g className="ll-svg-pop ll-delay-3">
                <line
                    x1="206"
                    y1="118"
                    x2="223"
                    y2="125"
                    stroke="var(--ll-accent)"
                    strokeWidth="1.4"
                    markerEnd="url(#ll-arrAcc)"
                />
                <text
                    x="214"
                    y="110"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="7.5"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                >
                    query
                </text>
            </g>
            <g className="ll-svg-pop ll-delay-5">
                <line
                    x1="337"
                    y1="139"
                    x2="355"
                    y2="146"
                    stroke="var(--ll-accent)"
                    strokeWidth="1.4"
                    markerEnd="url(#ll-arrAcc)"
                />
                <text
                    x="346"
                    y="167"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="7.5"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                >
                    chunks
                </text>
            </g>

            <g className="ll-svg-pop ll-delay-6">
                <path
                    d="M 448 206 C 448 244, 380 256, 280 256 C 180 256, 112 244, 112 206"
                    fill="none"
                    stroke="var(--ll-fg-3)"
                    strokeWidth="0.9"
                    strokeDasharray="3 3"
                    opacity="0.65"
                    markerEnd="url(#ll-arrDim)"
                />
                <rect
                    x="200"
                    y="236"
                    width="160"
                    height="16"
                    rx="3"
                    fill="var(--ll-bg-1)"
                    stroke="none"
                />
                <text
                    x="280"
                    y="247"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8.5"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                    letterSpacing="1.4"
                >
                    capture( ) · scrubbed · upserted
                </text>
            </g>

            <line
                className="ll-svg-line ll-delay-6"
                style={{ ['--ll-len' as string]: '560' }}
                x1="0"
                y1="280"
                x2="560"
                y2="280"
                stroke="var(--ll-border-2)"
                strokeDasharray="2 4"
            />

            <g className="ll-svg-pop ll-delay-7">
                <text
                    x="22"
                    y="304"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="9"
                    fill="var(--ll-fg-3)"
                    letterSpacing="1.8"
                >
                    02 · E2E-ENCRYPTED SYNC
                </text>
                <line
                    x1="22"
                    y1="310"
                    x2="200"
                    y2="310"
                    stroke="var(--ll-border-2)"
                    strokeWidth="0.8"
                />
                <text
                    x="22"
                    y="330"
                    fontFamily="var(--ll-font-sans)"
                    fontSize="10.5"
                    fill="var(--ll-fg-2)"
                >
                    X25519 + XChaCha20-Poly1305
                </text>
                <text
                    x="22"
                    y="346"
                    fontFamily="var(--ll-font-sans)"
                    fontSize="10.5"
                    fill="var(--ll-fg-2)"
                >
                    relay sees opaque ciphertext only
                </text>
                <text
                    x="22"
                    y="368"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="8"
                    fill="var(--ll-fg-4)"
                    letterSpacing="1.2"
                >
                    SELF-HOST · APPS/RELAY/
                </text>
            </g>

            <g className="ll-svg-pop ll-delay-7" transform="translate(280, 308)">
                <g>
                    <rect
                        x="0"
                        y="14"
                        width="46"
                        height="60"
                        rx="5"
                        fill="var(--ll-bg-0)"
                        stroke="var(--ll-border-3)"
                        strokeWidth="0.9"
                    />
                    <rect
                        x="6"
                        y="20"
                        width="34"
                        height="42"
                        rx="1"
                        fill="var(--ll-accent-soft)"
                        stroke="var(--ll-accent)"
                        strokeWidth="0.5"
                        strokeOpacity="0.5"
                    />
                    <circle cx="23" cy="68" r="1.2" fill="var(--ll-fg-3)" />
                    <text
                        x="23"
                        y="88"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="8"
                        fill="var(--ll-fg-3)"
                        textAnchor="middle"
                    >
                        mac
                    </text>
                </g>
                <g>
                    <rect
                        x="100"
                        y="22"
                        width="80"
                        height="44"
                        rx="22"
                        fill="var(--ll-bg-0)"
                        stroke="var(--ll-accent)"
                        strokeWidth="1.1"
                    />
                    <text
                        x="140"
                        y="42"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="9.5"
                        fill="var(--ll-accent)"
                        textAnchor="middle"
                        letterSpacing="2"
                        fontWeight="500"
                    >
                        RELAY
                    </text>
                    <text
                        x="140"
                        y="55"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="7.5"
                        fill="var(--ll-fg-3)"
                        textAnchor="middle"
                    >
                        cloudflare worker
                    </text>
                    <text
                        x="140"
                        y="88"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="7.5"
                        fill="var(--ll-fg-3)"
                        textAnchor="middle"
                        letterSpacing="0.4"
                    >
                        no plaintext, ever
                    </text>
                </g>
                <g>
                    <rect
                        x="234"
                        y="14"
                        width="46"
                        height="60"
                        rx="5"
                        fill="var(--ll-bg-0)"
                        stroke="var(--ll-border-3)"
                        strokeWidth="0.9"
                    />
                    <rect
                        x="240"
                        y="20"
                        width="34"
                        height="42"
                        rx="1"
                        fill="var(--ll-accent-soft)"
                        stroke="var(--ll-accent)"
                        strokeWidth="0.5"
                        strokeOpacity="0.5"
                    />
                    <circle cx="257" cy="68" r="1.2" fill="var(--ll-fg-3)" />
                    <text
                        x="257"
                        y="88"
                        fontFamily="var(--ll-font-mono)"
                        fontSize="8"
                        fill="var(--ll-fg-3)"
                        textAnchor="middle"
                    >
                        linux
                    </text>
                </g>
                <g stroke="var(--ll-accent)" strokeWidth="1.1" fill="none">
                    <line
                        x1="46"
                        y1="44"
                        x2="100"
                        y2="44"
                        markerEnd="url(#ll-arrAcc)"
                        strokeDasharray="2 2"
                    />
                    <line
                        x1="180"
                        y1="44"
                        x2="234"
                        y2="44"
                        markerEnd="url(#ll-arrAcc)"
                        strokeDasharray="2 2"
                    />
                </g>
                <text
                    x="73"
                    y="36"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="7"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                    letterSpacing="0.6"
                >
                    sealed
                </text>
                <text
                    x="207"
                    y="36"
                    fontFamily="var(--ll-font-mono)"
                    fontSize="7"
                    fill="var(--ll-fg-3)"
                    textAnchor="middle"
                    letterSpacing="0.6"
                >
                    sealed
                </text>
            </g>
        </svg>
    );
}
