import Link from 'next/link';

/**
 * Webapp URL — apps/landing has no auth, so "Install" and "Dashboard"
 * CTAs point at the @lumen/web app on port 3000 in dev. In prod you'd
 * override this with NEXT_PUBLIC_WEB_URL.
 */
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export function LandingNav() {
    return (
        <nav className="ll-nav">
            <div className="ll-nav-inner">
                <Link href="/" className="ll-brand" aria-label="Lumen home">
                    <span className="ll-brand-glyph" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                            <circle
                                cx="12"
                                cy="12"
                                r="8.2"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                opacity="0.45"
                            />
                            <circle
                                cx="12"
                                cy="12"
                                r="11.2"
                                stroke="currentColor"
                                strokeWidth="0.8"
                                opacity="0.18"
                            />
                        </svg>
                    </span>
                    Lumen
                </Link>
                <div className="ll-nav-right">
                    <a href="#how" className="ll-nav-link ll-hide-sm">
                        How it works
                    </a>
                    <a href="#graph" className="ll-nav-link ll-hide-sm">
                        The graph
                    </a>
                    <a href="#local" className="ll-nav-link ll-hide-sm">
                        Local-first
                    </a>
                    <a href="#mcp" className="ll-nav-link ll-hide-sm">
                        MCP
                    </a>
                    <a href={`${WEB_URL}/learn`} className="ll-nav-link">
                        Docs
                    </a>
                    <span className="ll-nav-sep" aria-hidden="true" />
                    <a
                        href="https://github.com/Sardor-M/lumen"
                        target="_blank"
                        rel="noreferrer"
                        className="ll-nav-link"
                        title="GitHub"
                        aria-label="GitHub"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                        >
                            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.74 1.27 3.41.97.1-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.44-2.69 5.41-5.25 5.69.42.36.79 1.07.79 2.16v3.2c0 .31.21.66.8.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
                        </svg>
                    </a>
                    <a href={`${WEB_URL}/signup`} className="ll-btn ll-btn-primary ll-btn-sm">
                        Install
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden
                        >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </a>
                </div>
            </div>
        </nav>
    );
}
