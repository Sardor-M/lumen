'use client';

import { useEffect, useRef } from 'react';

type Token = string | { t: 'cmd' | 'arg' | 'flag'; s: string };
type ScriptEntry = { type: 'cmd'; tokens: Token[] } | { type: 'out'; lines: string[] };

const SCRIPT: ScriptEntry[] = [
    {
        type: 'cmd',
        tokens: [
            { t: 'cmd', s: 'lumen' },
            ' ',
            { t: 'arg', s: 'add' },
            ' ',
            'https://github.com/anthropics/claude-code',
        ],
    },
    {
        type: 'out',
        lines: [
            '<span class="ok">✓</span> cloned · <span class="acc">2,148 files</span> · sig-extracted · 1.8s',
        ],
    },
    {
        type: 'cmd',
        tokens: [
            { t: 'cmd', s: 'lumen' },
            ' ',
            { t: 'arg', s: 'add' },
            ' ',
            './papers/attention-is-all-you-need.pdf',
        ],
    },
    {
        type: 'out',
        lines: [
            '<span class="ok">✓</span> 14 chunks · sha-256 dedup · scope: <span class="acc">personal</span>',
        ],
    },
    {
        type: 'cmd',
        tokens: [
            { t: 'cmd', s: 'lumen' },
            ' ',
            { t: 'arg', s: 'compile' },
            ' ',
            { t: 'flag', s: '-c 5' },
        ],
    },
    {
        type: 'out',
        lines: [
            'compiling 11 sources · 1,284 chunks · 5 in parallel',
            '<span class="ok">✓</span> 38 edges · 26 concepts · 3 trajectories captured',
            '<span class="ok">✓</span> wrote <span class="acc">lumen.db</span> in 4.2s',
        ],
    },
    {
        type: 'cmd',
        tokens: [
            { t: 'cmd', s: 'lumen' },
            ' ',
            { t: 'arg', s: 'install' },
            ' ',
            { t: 'arg', s: 'claude' },
        ],
    },
    {
        type: 'out',
        lines: [
            '<span class="ok">✓</span> wrote <span class="acc">CLAUDE.md</span> · brain-first protocol',
            '<span class="ok">✓</span> wrote <span class="acc">.mcp.json</span> · 23 tools registered',
            '<span class="ok">✓</span> wired pre-tool + stop hooks',
        ],
    },
    {
        type: 'cmd',
        tokens: [
            { t: 'cmd', s: 'lumen' },
            ' ',
            { t: 'arg', s: 'ask' },
            ' ',
            '"how do agents handle long context?"',
        ],
    },
    {
        type: 'out',
        lines: [
            '<span class="acc">brain_ops:</span> 6 chunks · 2 trajectories · budget 3.2k/8k',
            'streaming answer… grounded in <span class="acc">your</span> corpus',
        ],
    },
];

function escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderTokens(tokens: Token[]): string {
    return tokens
        .map((tok) =>
            typeof tok === 'string'
                ? escapeHtml(tok)
                : `<span class="${tok.t}">${escapeHtml(tok.s)}</span>`,
        )
        .join('');
}

function projectVisible(html: string, n: number): string {
    let out = '';
    let visibleSoFar = 0;
    let i = 0;
    const stack: string[] = [];
    while (i < html.length && visibleSoFar < n) {
        if (html[i] === '<') {
            const end = html.indexOf('>', i);
            if (end === -1) break;
            const tag = html.slice(i, end + 1);
            out += tag;
            const tagBody = tag.slice(1, -1);
            if (!tagBody.startsWith('/') && !tagBody.endsWith('/')) {
                stack.push(tagBody.split(/\s/)[0]);
            } else if (tagBody.startsWith('/')) {
                stack.pop();
            }
            i = end + 1;
        } else if (html[i] === '&') {
            const end = html.indexOf(';', i);
            if (end === -1) break;
            out += html.slice(i, end + 1);
            visibleSoFar += 1;
            i = end + 1;
        } else {
            out += html[i];
            visibleSoFar += 1;
            i += 1;
        }
    }
    for (let k = stack.length - 1; k >= 0; k--) out += `</${stack[k]}>`;
    return out;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function renderInstantly(body: HTMLElement) {
    const html: string[] = [];
    SCRIPT.forEach((entry) => {
        if (entry.type === 'cmd') {
            html.push(`<div class="ll-term-line prompt">${renderTokens(entry.tokens)}</div>`);
        } else {
            entry.lines.forEach((l) =>
                html.push(`<div class="ll-term-line"><span class="out">${l}</span></div>`),
            );
            html.push('<div style="height: 6px"></div>');
        }
    });
    body.innerHTML = html.join('');
}

async function typeOnce(body: HTMLElement) {
    body.innerHTML = '';
    for (const entry of SCRIPT) {
        if (entry.type === 'cmd') {
            const lineEl = document.createElement('div');
            lineEl.className = 'll-term-line prompt';
            body.appendChild(lineEl);
            const fullHtml = renderTokens(entry.tokens);
            await typeHtml(lineEl, fullHtml);
            const cursor = document.createElement('span');
            cursor.className = 'll-term-cursor';
            lineEl.appendChild(cursor);
            await wait(180);
            cursor.remove();
        } else {
            await wait(180);
            for (const l of entry.lines) {
                const out = document.createElement('div');
                out.className = 'll-term-line';
                out.innerHTML = `<span class="out">${l}</span>`;
                out.style.opacity = '0';
                body.appendChild(out);
                requestAnimationFrame(() => {
                    out.style.transition = 'opacity 220ms ease';
                    out.style.opacity = '1';
                });
                await wait(110);
            }
            const sp = document.createElement('div');
            sp.style.height = '6px';
            body.appendChild(sp);
            await wait(260);
        }
    }
    const lastLine = document.createElement('div');
    lastLine.className = 'll-term-line prompt';
    const finalCursor = document.createElement('span');
    finalCursor.className = 'll-term-cursor';
    lastLine.appendChild(finalCursor);
    body.appendChild(lastLine);
}

function typeHtml(target: HTMLElement, html: string): Promise<void> {
    return new Promise((resolve) => {
        const visible = html.replace(/<[^>]+>/g, '');
        let i = 0;
        const tick = () => {
            i += 1;
            target.innerHTML = projectVisible(html, i);
            if (i >= visible.length) {
                resolve();
            } else {
                setTimeout(tick, 18 + Math.random() * 26);
            }
        };
        tick();
    });
}

export function LandingTerminal() {
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const termRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const body = bodyRef.current;
        const term = termRef.current;
        if (!body || !term) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            renderInstantly(body);
            return;
        }

        let played = false;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting && !played) {
                        played = true;
                        void typeOnce(body);
                        io.disconnect();
                    }
                });
            },
            { threshold: 0.35 },
        );
        io.observe(term);

        return () => io.disconnect();
    }, []);

    return (
        <div className="ll-term" data-ll-animate ref={termRef}>
            <div className="ll-term-bar">
                <div className="ll-dots">
                    <span />
                    <span />
                    <span />
                </div>
                <span className="ll-name">~/research — lumen — 92×24</span>
            </div>
            <div className="ll-term-body" ref={bodyRef} />
        </div>
    );
}

export function LandingTerminalSection() {
    return (
        <section className="ll-terminal-section" id="install">
            <div className="ll-wrap">
                <div className="ll-terminal-grid">
                    <div className="ll-terminal-side">
                        <div className="ll-eyebrow" data-ll-animate>
                            § 05 · For the terminal-native
                        </div>
                        <h2 className="ll-h2" data-ll-animate>
                            One CLI. <em className="ll-italic-accent">No UI to learn.</em>
                        </h2>
                        <p data-ll-animate>
                            Lumen is a CLI you live with. There&apos;s a web viewer at{' '}
                            <code className="ll-mono ll-inline">lumen serve</code>, but the everyday
                            loop is a handful of commands you can muscle-memory in a week.
                        </p>
                        <div data-ll-animate>
                            <span className="ll-cmd-pill">lumen add</span>
                            <span className="ll-cmd-pill">lumen compile</span>
                            <span className="ll-cmd-pill">lumen ask</span>
                            <span className="ll-cmd-pill">lumen install claude</span>
                            <span className="ll-cmd-pill">lumen sync</span>
                        </div>
                        <p className="ll-small" style={{ marginTop: 28 }} data-ll-animate>
                            Pipe-friendly, JSON-when-asked, exits with sane status codes. Plays
                            nicely with <code className="ll-mono ll-inline">jq</code>,{' '}
                            <code className="ll-mono ll-inline">fzf</code>, and your shell of
                            choice.{' '}
                            <strong style={{ color: 'var(--ll-fg-1)', fontWeight: 500 }}>
                                784+ tests
                            </strong>{' '}
                            behind it.
                        </p>
                    </div>
                    <LandingTerminal />
                </div>
            </div>
        </section>
    );
}
