export function LandingLocal() {
    return (
        <section className="ll-local" id="local">
            <div className="ll-wrap">
                <header className="ll-local-head">
                    <div className="ll-eyebrow" data-ll-animate>
                        § 04 · Local-first, in detail
                    </div>
                    <h2 className="ll-h2" data-ll-animate>
                        What stays. <em className="ll-italic-accent">What leaves.</em>
                    </h2>
                    <p data-ll-animate>
                        No fog, no hedging. Here is exactly what touches your machine — and exactly
                        what, only if you opt in, gets sealed and shipped to a relay that never sees
                        the key.
                    </p>
                </header>

                <div className="ll-local-cols" data-ll-animate>
                    <div className="ll-local-col">
                        <div className="ll-col-cap ll-col-cap-stays">
                            <em>stays.</em> on your machine
                        </div>
                        <h3>On disk.</h3>
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />
                                </svg>
                            }
                            name="Sources"
                            hint="9 types: URL, PDF, YouTube, arXiv, repo, dataset, image, Obsidian, plain text."
                            where="~/.lumen/"
                        />
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                                </svg>
                            }
                            name="Chunks & embeddings"
                            hint="Generated locally. sqlite-vec ANN, 1536-dim."
                            where="lumen.db"
                        />
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                                </svg>
                            }
                            name="The graph"
                            hint="Concepts, edges, aliases, scopes, feedback, trajectories."
                            where="lumen.db"
                        />
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="M21 21l-4.3-4.3" />
                                </svg>
                            }
                            name="Search (BM25 + TF-IDF + vector + graph)"
                            hint={
                                <>
                                    Reciprocal rank fusion. Intent-routed via{' '}
                                    <code className="ll-mono ll-inline">brain_ops</code>.
                                </>
                            }
                            where="lumen.db"
                        />
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M12 8v4l3 2" />
                                    <circle cx="12" cy="12" r="9" />
                                </svg>
                            }
                            name="PII gate"
                            hint="Tokens, emails, JWTs, paths scrubbed before every capture."
                            where="on-write"
                        />
                    </div>

                    <div className="ll-local-col">
                        <div className="ll-col-cap">
                            <em style={{ color: 'var(--ll-fg-3)' }}>leaves.</em> only if you let it
                        </div>
                        <h3>Off device.</h3>
                        <Row
                            grayIcon
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M2 12h20M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
                                </svg>
                            }
                            name="Compile / enrich / ask"
                            hint="Your API key. Anthropic, OpenRouter, or local Ollama."
                            where="opt-in"
                        />
                        <Row
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                                </svg>
                            }
                            name="Cross-device sync"
                            hint="X25519 + XChaCha20-Poly1305 envelopes. Self-host the Cloudflare Worker relay."
                            where="e2e"
                        />
                        <Row
                            dim
                            grayIcon
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M3 12h18" />
                                </svg>
                            }
                            name="Telemetry"
                            hint="None. Ever. There is no analytics in the binary."
                            where="never"
                            whereClass="never"
                        />
                        <Row
                            dim
                            grayIcon
                            icon={
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M3 12h18" />
                                </svg>
                            }
                            name="Trajectories"
                            hint="Stay on your machine unless you sync. Relay sees opaque ciphertext."
                            where="your call"
                            whereClass="never"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function Row({
    icon,
    name,
    hint,
    where,
    whereClass,
    grayIcon,
    dim,
}: {
    icon: React.ReactNode;
    name: React.ReactNode;
    hint: React.ReactNode;
    where: string;
    whereClass?: 'never';
    grayIcon?: boolean;
    dim?: boolean;
}) {
    return (
        <div className={`ll-local-row${dim ? 'dim' : ''}`}>
            <span className={`ll-local-ico${grayIcon ? 'gray' : ''}`}>{icon}</span>
            <div className="ll-local-name">
                {name}
                <small>{hint}</small>
            </div>
            <span className={`ll-local-where${whereClass ? ' ' + whereClass : ''}`}>{where}</span>
        </div>
    );
}
