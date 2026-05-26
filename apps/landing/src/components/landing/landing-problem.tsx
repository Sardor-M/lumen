export function LandingProblem() {
    return (
        <section className="ll-problem">
            <div className="ll-wrap">
                <div className="ll-problem-grid">
                    <aside className="ll-problem-aside">
                        <div className="ll-eyebrow" data-ll-animate>
                            § 01 · The problem
                        </div>
                        <div className="ll-problem-num" data-ll-animate>
                            i.
                        </div>
                    </aside>
                    <div className="ll-problem-prose">
                        <p className="ll-editorial" data-ll-animate>
                            AI agents start every conversation with amnesia. Claude Code, Cursor,
                            Codex, whatever harness you ship — they know the world, but nothing
                            about <em>your</em> world: the two hundred papers you&apos;ve read, the
                            codebase you ship, the architecture decisions you made last quarter, the
                            trajectory that finally worked when you debugged that thing at 2am.
                        </p>
                        <p className="ll-editorial" data-ll-animate>
                            <strong>Every session relearns the same context</strong>, repeats the
                            same mistakes, forgets your corrections an hour later, and burns your
                            token budget re-explaining the same domain.
                        </p>
                        <div className="ll-problem-pull" data-ll-animate>
                            What if your agent remembered everything you&apos;ve ever shown it — and
                            got better at <em>your</em> work, daily?
                        </div>
                        <p className="ll-editorial" data-ll-animate>
                            Lumen is the substrate that fixes that. A SQLite-backed knowledge graph
                            your agent <strong>queries before it answers</strong> — and writes to
                            after. Concepts accumulate. Trajectories replay. The brain is richer at
                            the start of every conversation than it was at the end of the last one.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
