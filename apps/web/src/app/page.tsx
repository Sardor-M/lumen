import Link from 'next/link';
import { headers } from 'next/headers';
import { Sparkles, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LumenStack } from '@/components/landing/lumen-stack';

export default async function Home() {
    const session = await auth.api.getSession({ headers: await headers() });
    const signedIn = !!session;

    return (
        <div className="bg-background text-foreground min-h-screen">
            <TopNav signedIn={signedIn} />
            <main className="pt-32 pb-24 sm:pt-36">
                <div className="mx-auto max-w-3xl px-6">
                    <header className="space-y-7">
                        <div className="flex items-center gap-3">
                            <span className="bg-foreground text-background flex h-11 w-11 items-center justify-center rounded-2xl">
                                <Sparkles className="h-5 w-5" />
                            </span>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lumen</h1>
                        </div>

                        <p className="text-foreground text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
                            The knowledge compiler built for coding agents.
                        </p>

                        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                            Local-first. Articles, papers, PDFs, and agent trajectories go in. A
                            queryable knowledge graph comes out. Sync across devices is end-to-end
                            encrypted; the relay never sees your data.
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button
                                size="lg"
                                render={<Link href={signedIn ? '/dashboard' : '/login'} />}
                            >
                                {signedIn ? 'Open dashboard' : 'Get started'}
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                render={
                                    <a
                                        href="https://github.com/Sardor-M/lumen"
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                }
                            >
                                <GithubMark className="mr-1 h-4 w-4" />
                                View on GitHub
                            </Button>
                        </div>
                    </header>
                </div>

                <div className="mt-16">
                    <LumenStack />
                </div>

                <section className="mx-auto mt-16 max-w-3xl space-y-5 px-6">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Features
                    </p>
                    <ul className="space-y-4 text-sm">
                        <Feature title="Local-first">
                            SQLite on your machine. The CLI, the web dashboard, and the MCP server
                            all read the same file. Nothing leaves your laptop unless you opt in.
                        </Feature>
                        <Feature title="Hybrid search">
                            BM25 + TF-IDF fused via Reciprocal Rank Fusion. Optional vector
                            embeddings add a third lane for synonym resilience.
                        </Feature>
                        <Feature title="Knowledge graph">
                            Compile turns each source into named concepts and weighted edges.
                            PageRank, communities, and shortest paths run in-process.
                        </Feature>
                        <Feature title="Cross-device sync">
                            X25519 + XChaCha20-Poly1305 per-entry encryption. The relay sees opaque
                            ciphertext keyed by an unlinkable hash — self-hostable in under 200
                            lines.
                        </Feature>
                        <Feature title="Agent-native">
                            MCP server exposes 23 tools to Claude Code, Cursor, and any compatible
                            client. Captured trajectories age into a memory that gets sharper.
                        </Feature>
                        <Feature title="Honest conflict resolution">
                            Last-write-wins with an audit history table. We do not pretend free-form
                            text is CRDT-mergeable.
                        </Feature>
                    </ul>
                </section>

                <footer className="text-muted-foreground border-border/60 mx-auto mt-24 max-w-3xl border-t px-6 pt-6 text-xs">
                    Built with <code className="bg-muted rounded px-1 font-mono">lumen-kb</code> ·
                    MIT licensed · Sync relay is a single-file Cloudflare Worker.
                </footer>
            </main>
        </div>
    );
}

function TopNav({ signedIn }: { signedIn: boolean }) {
    return (
        <header className="border-border/40 bg-background/60 fixed inset-x-0 top-0 z-10 border-b backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-semibold tracking-tight"
                >
                    <Sparkles className="h-4 w-4" />
                    Lumen
                </Link>
                <nav className="flex items-center gap-2">
                    <ThemeToggle />
                    <a
                        href="https://github.com/Sardor-M/lumen"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="GitHub repository"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/40 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <GithubMark className="h-4 w-4" />
                    </a>
                    <Button
                        size="sm"
                        variant={signedIn ? 'default' : 'outline'}
                        render={<Link href={signedIn ? '/dashboard' : '/login'} />}
                    >
                        {signedIn ? 'Dashboard' : 'Sign in'}
                    </Button>
                </nav>
            </div>
        </header>
    );
}

/** Lucide dropped brand icons; ship a tiny GitHub mark inline. */
function GithubMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.88-.38 2.85-.39.97.01 1.94.14 2.85.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
    );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <li className="text-foreground/80 flex items-start gap-3">
            <span className="text-muted-foreground/60 mt-0.5 select-none">—</span>
            <p className="leading-relaxed">
                <strong className="text-foreground font-semibold">{title}</strong>:{' '}
                <span>{children}</span>
            </p>
        </li>
    );
}
