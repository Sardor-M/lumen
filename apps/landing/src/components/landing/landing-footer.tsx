const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export function LandingFooter() {
    return (
        <footer className="ll-foot">
            <div className="ll-wrap">
                <div className="ll-foot-inner">
                    <div>
                        <div className="ll-foot-mark">Lumen</div>
                        <p className="ll-foot-tag">
                            A local-first knowledge substrate for AI agents. Your agent&apos;s
                            second brain. Released under MIT.
                        </p>
                    </div>
                    <FootCol
                        title="Product"
                        items={[
                            { label: 'Install', href: `${WEB_URL}/signup` },
                            { label: 'Docs', href: `${WEB_URL}/learn` },
                            { label: 'Changelog' },
                            { label: 'Roadmap' },
                        ]}
                    />
                    <FootCol
                        title="Source"
                        items={[
                            { label: 'GitHub', href: 'https://github.com/Sardor-M/lumen' },
                            { label: 'CLI reference' },
                            { label: 'MCP schema' },
                            { label: 'SQLite schema' },
                        ]}
                    />
                    <FootCol
                        title="Elsewhere"
                        items={[
                            { label: 'Hacker News' },
                            { label: 'Mastodon' },
                            { label: 'RSS' },
                            { label: 'Email' },
                        ]}
                    />
                </div>
                <div className="ll-foot-bottom">
                    <div className="row">
                        <span>© Lumen 2026</span>
                        <span>·</span>
                        <span>MIT licensed</span>
                        <span>·</span>
                        <span>Built on a laptop, in a small room.</span>
                    </div>
                    <div className="row">
                        <span>v 0.4.1</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FootCol({ title, items }: { title: string; items: { label: string; href?: string }[] }) {
    return (
        <div className="ll-foot-col">
            <h4>{title}</h4>
            <ul>
                {items.map((item) => (
                    <li key={item.label}>
                        {item.href ? (
                            <a
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                            >
                                {item.label} <span className="arrow">→</span>
                            </a>
                        ) : (
                            <span>
                                {item.label} <span className="arrow">→</span>
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
