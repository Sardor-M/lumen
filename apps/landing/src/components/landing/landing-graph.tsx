'use client';

import { useEffect, useRef, useState } from 'react';

type NodeKind = 'concept' | 'paper' | 'essay';

type GraphNode = {
    id: string;
    label: string;
    kind: NodeKind;
    x: number;
    y: number;
    src: string;
    badge: string;
    chunk: string;
    tags: string[];
};

type SimNode = GraphNode & {
    vx: number;
    vy: number;
    fx: number | null;
    fy: number | null;
    degree: number;
};

const W = 1000;
const H = 560;
const SVG_NS = 'http://www.w3.org/2000/svg';

const NODES_DATA: GraphNode[] = [
    {
        id: 'attention',
        label: 'attention',
        kind: 'concept',
        x: 470,
        y: 240,
        src: 'vaswani et al., 2017 · §3.2',
        badge: 'PDF',
        chunk: 'Attention allows the model to look at the entire input sequence in a single step, replacing the recurrence of earlier sequence-to-sequence models with a global, learned routing matrix.',
        tags: ['transformer', 'long-range', '7 backlinks'],
    },
    {
        id: 'transformer',
        label: 'transformer',
        kind: 'concept',
        x: 580,
        y: 200,
        src: 'vaswani et al., 2017 · §1',
        badge: 'PDF',
        chunk: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
        tags: ['architecture', '9 backlinks'],
    },
    {
        id: 'tokens',
        label: 'tokenization',
        kind: 'concept',
        x: 760,
        y: 220,
        src: 'sennrich et al., 2016',
        badge: 'PDF',
        chunk: 'Byte-pair encoding produces a fixed-size subword vocabulary that handles rare words by composing them from frequent subwords.',
        tags: ['nlp', 'bpe'],
    },
    {
        id: 'context',
        label: 'context length',
        kind: 'concept',
        x: 830,
        y: 140,
        src: 'beltagy et al., 2020 · §3',
        badge: 'PDF',
        chunk: 'Longformer scales linearly with sequence length via a combination of local windowed attention and task-motivated global attention.',
        tags: ['long-context'],
    },
    {
        id: 'rope',
        label: 'rotary embeddings',
        kind: 'paper',
        x: 900,
        y: 220,
        src: 'su et al., 2021 · §3',
        badge: 'PDF',
        chunk: 'RoFormer encodes absolute position with a rotation matrix and incorporates explicit relative position dependency in self-attention formulations.',
        tags: ['position', 'attention'],
    },
    {
        id: 'rnn',
        label: 'rnns',
        kind: 'concept',
        x: 220,
        y: 320,
        src: 'karpathy, 2015',
        badge: 'BLOG',
        chunk: 'The unreasonable effectiveness of recurrent neural networks: a single trained model produces character-by-character output that can mimic Shakespeare or LaTeX.',
        tags: ['sequence', 'recurrence'],
    },
    {
        id: 'lstm',
        label: 'lstm',
        kind: 'concept',
        x: 280,
        y: 240,
        src: 'olah, 2015',
        badge: 'BLOG',
        chunk: 'LSTMs are explicitly designed to avoid the long-term dependency problem. Remembering information for long periods of time is practically their default behavior.',
        tags: ['recurrence', 'gradients'],
    },
    {
        id: 'memory',
        label: 'external memory',
        kind: 'concept',
        x: 360,
        y: 380,
        src: 'graves et al., 2014 · §2',
        badge: 'PDF',
        chunk: 'A Neural Turing Machine couples a neural net to external memory resources, which it interacts with via attentional processes — analogous to a Turing tape.',
        tags: ['memory', 'attention'],
    },
    {
        id: 'ssm',
        label: 'state-space models',
        kind: 'paper',
        x: 170,
        y: 240,
        src: 'gu & dao, 2023 · §3',
        badge: 'PDF',
        chunk: 'Mamba is a selective state space model that achieves linear-time sequence modeling with input-dependent dynamics, matching Transformer quality at small to medium scale.',
        tags: ['mamba', 'linear'],
    },
    {
        id: 'scaling',
        label: 'scaling laws',
        kind: 'concept',
        x: 720,
        y: 330,
        src: 'kaplan et al., 2020 · §3',
        badge: 'PDF',
        chunk: 'Performance depends strongly on scale, weakly on model shape. Test loss falls as a power-law of compute, dataset size, and parameter count.',
        tags: ['power-law', 'compute'],
    },
    {
        id: 'chinchilla',
        label: 'chinchilla',
        kind: 'paper',
        x: 830,
        y: 380,
        src: 'hoffmann et al., 2022 · §2',
        badge: 'PDF',
        chunk: 'For compute-optimal training, model size and training tokens should be scaled equally. A 70B model trained on 1.4T tokens beats a 280B model trained on 300B.',
        tags: ['tokens', 'training'],
    },
    {
        id: 'compute',
        label: 'compute trend',
        kind: 'concept',
        x: 540,
        y: 100,
        src: 'amodei & hernandez, 2018',
        badge: 'BLOG',
        chunk: 'Since 2012, the amount of compute used in the largest AI training runs has doubled every 3.4 months.',
        tags: ['hardware', 'trend'],
    },
    {
        id: 'bitter',
        label: 'bitter lesson',
        kind: 'essay',
        x: 380,
        y: 110,
        src: 'sutton, 2019',
        badge: 'HTML',
        chunk: 'The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin.',
        tags: ['compute', 'priors', '6 backlinks'],
    },
    {
        id: 'priors',
        label: 'handcrafted priors',
        kind: 'concept',
        x: 260,
        y: 95,
        src: 'sutton, 2019 · §2',
        badge: 'HTML',
        chunk: 'Researchers have repeatedly tried to build in human knowledge — and search and learning have repeatedly washed it away once compute grew enough.',
        tags: ['bitter-lesson'],
    },
    {
        id: 'mcts',
        label: 'mcts',
        kind: 'concept',
        x: 130,
        y: 150,
        src: 'silver et al., 2016 · §3',
        badge: 'PDF',
        chunk: 'AlphaGo combines Monte Carlo tree search with deep neural networks trained by supervised learning and reinforcement learning from self-play.',
        tags: ['search'],
    },
    {
        id: 'rl',
        label: 'self-play',
        kind: 'concept',
        x: 80,
        y: 270,
        src: 'silver et al., 2017 · §4',
        badge: 'PDF',
        chunk: 'Starting from random play, and given no domain knowledge except the game rules, AlphaZero achieved superhuman performance in chess, shogi, and Go.',
        tags: ['rl', 'self-play'],
    },
    {
        id: 'rag',
        label: 'retrieval',
        kind: 'concept',
        x: 510,
        y: 390,
        src: 'lewis et al., 2020 · §4',
        badge: 'PDF',
        chunk: 'Retrieval-Augmented Generation combines a non-parametric memory (a dense vector index) with a parametric memory (a pretrained seq2seq model).',
        tags: ['memory', 'retrieval'],
    },
    {
        id: 'embeddings',
        label: 'embeddings',
        kind: 'concept',
        x: 620,
        y: 460,
        src: 'reimers & gurevych, 2019',
        badge: 'PDF',
        chunk: 'Sentence-BERT modifies the pretrained BERT network to derive semantically meaningful sentence embeddings that can be compared using cosine-similarity.',
        tags: ['vector', 'similarity'],
    },
    {
        id: 'bm25',
        label: 'bm25 / fts5',
        kind: 'concept',
        x: 730,
        y: 460,
        src: 'robertson, 1995',
        badge: 'PDF',
        chunk: 'Okapi BM25 is the canonical probabilistic ranking function for keyword retrieval. SQLite ships it built-in via the FTS5 module.',
        tags: ['lexical', 'bm25'],
    },
    {
        id: 'sql',
        label: 'sqlite',
        kind: 'paper',
        x: 850,
        y: 460,
        src: 'sqlite docs',
        badge: 'DOC',
        chunk: 'SQLite is a small, fast, self-contained, full-featured SQL database engine. The most used database engine in the world.',
        tags: ['storage'],
    },
    {
        id: 'vec',
        label: 'sqlite-vec',
        kind: 'paper',
        x: 470,
        y: 510,
        src: 'asg017, 2024',
        badge: 'DOC',
        chunk: 'sqlite-vec is an embedded vector search extension for SQLite that runs entirely in-process, supporting brute-force and ANN queries over BLOB columns.',
        tags: ['vector', 'sqlite'],
    },
    {
        id: 'agents',
        label: 'agents',
        kind: 'essay',
        x: 700,
        y: 290,
        src: 'wang et al., 2023',
        badge: 'HTML',
        chunk: 'An LLM-powered autonomous agent system is composed of an LLM brain orchestrating planning, memory, and tool use across a long-running loop.',
        tags: ['planning', 'tools'],
    },
    {
        id: 'tools',
        label: 'tool use',
        kind: 'concept',
        x: 880,
        y: 320,
        src: 'schick et al., 2023',
        badge: 'PDF',
        chunk: 'Toolformer teaches language models to decide which APIs to call, when, what arguments to pass, and how to incorporate the results.',
        tags: ['agents', 'apis'],
    },
    {
        id: 'mcp',
        label: 'mcp',
        kind: 'concept',
        x: 920,
        y: 280,
        src: 'anthropic mcp spec, 2024',
        badge: 'DOC',
        chunk: 'Model Context Protocol is an open standard for connecting LLM applications with external tools, data sources, and prompts via stdio or HTTP.',
        tags: ['protocol', 'tools'],
    },
    {
        id: 'reflexion',
        label: 'reflexion',
        kind: 'paper',
        x: 800,
        y: 380,
        src: 'shinn et al., 2023',
        badge: 'PDF',
        chunk: 'Reflexion reinforces language agents through linguistic feedback, maintaining a memory buffer of self-reflections to improve subsequent trials.',
        tags: ['memory', 'self-improvement'],
    },
    {
        id: 'react',
        label: 'react prompting',
        kind: 'concept',
        x: 820,
        y: 210,
        src: 'yao et al., 2022',
        badge: 'PDF',
        chunk: 'ReAct interleaves reasoning traces and task-specific actions in language models, improving performance on knowledge-intensive and decision-making tasks.',
        tags: ['reasoning', 'agents'],
    },
    {
        id: 'trajectory',
        label: 'trajectories',
        kind: 'concept',
        x: 380,
        y: 480,
        src: 'lumen · brain_ops capture',
        badge: 'DOC',
        chunk: 'A trajectory is a captured sequence of agent steps that solved a task, distilled into a replayable pattern for similar future problems.',
        tags: ['lumen', 'replay'],
    },
    {
        id: 'replay',
        label: 'replay',
        kind: 'concept',
        x: 280,
        y: 470,
        src: 'lumen · MCP tools',
        badge: 'DOC',
        chunk: 'brain_ops("replay", {topic}) walks the graph from a starting concept, surfacing relevant trajectories ranked by recency × PageRank.',
        tags: ['lumen', 'recall'],
    },
    {
        id: 'pagerank',
        label: 'pagerank',
        kind: 'concept',
        x: 180,
        y: 410,
        src: 'page & brin, 1998',
        badge: 'PDF',
        chunk: 'PageRank computes a stationary distribution over a graph walk, weighting nodes by the importance of those linking to them. Lumen uses it for concept salience.',
        tags: ['graph', 'ranking'],
    },
    {
        id: 'rlhf',
        label: 'rlhf',
        kind: 'concept',
        x: 110,
        y: 410,
        src: 'ouyang et al., 2022 · §3',
        badge: 'PDF',
        chunk: 'We fine-tune GPT-3 using reinforcement learning from human feedback, training a reward model from human preference comparisons.',
        tags: ['alignment'],
    },
    {
        id: 'cai',
        label: 'constitutional ai',
        kind: 'paper',
        x: 60,
        y: 350,
        src: 'bai et al., 2022',
        badge: 'PDF',
        chunk: 'Constitutional AI uses a set of principles to guide self-critique and revision, reducing reliance on human labels for harmlessness.',
        tags: ['alignment', 'safety'],
    },
    {
        id: 'hallu',
        label: 'hallucination',
        kind: 'concept',
        x: 60,
        y: 480,
        src: 'ji et al., 2023',
        badge: 'PDF',
        chunk: 'Hallucination in NLG refers to generated content that is nonsensical or unfaithful to the provided source. Mitigations include retrieval grounding.',
        tags: ['rag', 'safety'],
    },
    {
        id: 'inst',
        label: 'instruction tuning',
        kind: 'concept',
        x: 220,
        y: 500,
        src: 'wei et al., 2022 · §1',
        badge: 'PDF',
        chunk: 'Finetuning a language model on a collection of datasets described via natural-language instructions substantially improves zero-shot performance.',
        tags: ['finetune'],
    },
    {
        id: 'cot',
        label: 'chain-of-thought',
        kind: 'concept',
        x: 540,
        y: 160,
        src: 'wei et al., 2022b · §2',
        badge: 'PDF',
        chunk: 'Sufficiently large language models can perform multi-step reasoning when shown a few chain-of-thought exemplars in the prompt.',
        tags: ['reasoning', 'prompt'],
    },
    {
        id: 'inctx',
        label: 'in-context learning',
        kind: 'concept',
        x: 640,
        y: 120,
        src: 'brown et al., 2020 · §4',
        badge: 'PDF',
        chunk: 'Large language models become "few-shot learners" — they can perform new tasks from a handful of examples provided in the input alone.',
        tags: ['gpt-3', 'few-shot'],
    },
    {
        id: 'tot',
        label: 'tree of thoughts',
        kind: 'paper',
        x: 460,
        y: 60,
        src: 'yao et al., 2023',
        badge: 'PDF',
        chunk: 'Tree of Thoughts generalizes chain-of-thought to deliberate problem solving by exploring coherent units of text as intermediate steps.',
        tags: ['reasoning', 'search'],
    },
    {
        id: 'eval',
        label: 'evaluation',
        kind: 'concept',
        x: 930,
        y: 110,
        src: 'liang et al., 2023 · §1',
        badge: 'PDF',
        chunk: 'HELM is a holistic framework for evaluating language models across 16 core scenarios and 7 metrics including accuracy, calibration, and robustness.',
        tags: ['benchmark'],
    },
    {
        id: 'distill',
        label: 'distillation',
        kind: 'concept',
        x: 920,
        y: 410,
        src: 'hinton et al., 2015',
        badge: 'PDF',
        chunk: 'A small student model can be trained to match the soft predictions of a larger teacher, transferring "dark knowledge" not present in hard labels.',
        tags: ['compression'],
    },
];

const EDGES_DATA: [string, string][] = [
    ['attention', 'transformer'],
    ['attention', 'memory'],
    ['attention', 'lstm'],
    ['attention', 'rag'],
    ['attention', 'context'],
    ['attention', 'inctx'],
    ['attention', 'rope'],
    ['attention', 'tot'],
    ['transformer', 'tokens'],
    ['transformer', 'scaling'],
    ['transformer', 'context'],
    ['transformer', 'rope'],
    ['transformer', 'ssm'],
    ['memory', 'rnn'],
    ['rnn', 'lstm'],
    ['lstm', 'attention'],
    ['ssm', 'lstm'],
    ['ssm', 'attention'],
    ['bitter', 'compute'],
    ['bitter', 'priors'],
    ['bitter', 'mcts'],
    ['bitter', 'rl'],
    ['bitter', 'scaling'],
    ['compute', 'scaling'],
    ['compute', 'chinchilla'],
    ['priors', 'mcts'],
    ['priors', 'rnn'],
    ['scaling', 'chinchilla'],
    ['scaling', 'inctx'],
    ['scaling', 'distill'],
    ['chinchilla', 'tokens'],
    ['chinchilla', 'distill'],
    ['rag', 'embeddings'],
    ['rag', 'memory'],
    ['rag', 'hallu'],
    ['embeddings', 'vec'],
    ['embeddings', 'bm25'],
    ['bm25', 'sql'],
    ['vec', 'sql'],
    ['rag', 'vec'],
    ['rag', 'bm25'],
    ['mcts', 'rl'],
    ['rl', 'agents'],
    ['mcts', 'tot'],
    ['agents', 'tools'],
    ['tools', 'rag'],
    ['tools', 'mcp'],
    ['mcp', 'agents'],
    ['react', 'agents'],
    ['react', 'tools'],
    ['react', 'cot'],
    ['reflexion', 'agents'],
    ['reflexion', 'memory'],
    ['reflexion', 'trajectory'],
    ['trajectory', 'replay'],
    ['trajectory', 'agents'],
    ['trajectory', 'reflexion'],
    ['replay', 'pagerank'],
    ['replay', 'rag'],
    ['pagerank', 'sql'],
    ['pagerank', 'rag'],
    ['rlhf', 'inst'],
    ['rlhf', 'cai'],
    ['rlhf', 'hallu'],
    ['cai', 'hallu'],
    ['cai', 'inst'],
    ['inst', 'cot'],
    ['inst', 'agents'],
    ['cot', 'inctx'],
    ['cot', 'agents'],
    ['cot', 'tot'],
    ['tot', 'inctx'],
    ['eval', 'scaling'],
    ['eval', 'context'],
    ['eval', 'agents'],
    ['distill', 'chinchilla'],
    ['distill', 'scaling'],
    ['hallu', 'rlhf'],
    ['hallu', 'rag'],
];

const SPRING_K = 0.012;
const SPRING_L = 96;
const REPULSE = 2400;
const GRAVITY = 0.0035;
const DAMP = 0.86;
const MAX_V = 6;

function nodeRadius(n: SimNode): number {
    if (n.kind === 'concept') return 6 + Math.min(n.degree, 6) * 0.7;
    if (n.kind === 'paper') return 5.5;
    return 5;
}
function nodeFill(n: SimNode): string {
    if (n.kind === 'concept') return 'var(--ll-accent)';
    if (n.kind === 'paper') return 'var(--ll-node-paper)';
    return 'var(--ll-node-essay)';
}
function nodeStroke(n: SimNode): string {
    if (n.kind === 'concept') return 'var(--ll-accent-ink)';
    if (n.kind === 'paper') return 'var(--ll-fg-1)';
    return 'var(--ll-node-essay-ink)';
}

type ChipState = { node: SimNode } | null;

export function LandingGraph() {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const edgeLayerRef = useRef<SVGGElement | null>(null);
    const nodeLayerRef = useRef<SVGGElement | null>(null);
    const labelLayerRef = useRef<SVGGElement | null>(null);
    const [chip, setChip] = useState<ChipState>(null);

    useEffect(() => {
        const stage = stageRef.current;
        const svg = svgRef.current;
        const edgeLayer = edgeLayerRef.current;
        const nodeLayer = nodeLayerRef.current;
        const labelLayer = labelLayerRef.current;
        if (!stage || !svg || !edgeLayer || !nodeLayer || !labelLayer) return;

        const nodes: SimNode[] = NODES_DATA.map((n) => ({
            ...n,
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
            degree: 0,
        }));
        const nodeById = new Map<string, SimNode>();
        nodes.forEach((n) => nodeById.set(n.id, n));

        const adj = new Map<string, Set<string>>();
        nodes.forEach((n) => adj.set(n.id, new Set()));
        EDGES_DATA.forEach(([a, b]) => {
            adj.get(a)?.add(b);
            adj.get(b)?.add(a);
        });
        nodes.forEach((n) => (n.degree = adj.get(n.id)?.size ?? 0));

        const edgeEls = EDGES_DATA.map(([a, b]) => {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('stroke', 'var(--ll-fg-3)');
            line.setAttribute('stroke-width', '0.7');
            line.setAttribute('stroke-opacity', '0.35');
            line.dataset.a = a;
            line.dataset.b = b;
            edgeLayer.appendChild(line);
            return line;
        });

        type NodeRefs = {
            g: SVGGElement;
            circle: SVGCircleElement;
            halo: SVGCircleElement;
            label: SVGTextElement;
        };
        const refs: NodeRefs[] = nodes.map((n) => {
            const g = document.createElementNS(SVG_NS, 'g');
            g.setAttribute('class', 'll-gnode');
            g.setAttribute('tabindex', '0');
            g.setAttribute('role', 'button');
            g.setAttribute('aria-label', n.label);
            g.style.cursor = 'grab';
            g.dataset.id = n.id;

            const halo = document.createElementNS(SVG_NS, 'circle');
            halo.setAttribute('r', String(nodeRadius(n) + 6));
            halo.setAttribute('fill', 'var(--ll-accent)');
            halo.setAttribute('opacity', '0');

            const c = document.createElementNS(SVG_NS, 'circle');
            c.setAttribute('r', String(nodeRadius(n)));
            c.setAttribute('fill', nodeFill(n));
            c.setAttribute('stroke', 'var(--ll-bg-1)');
            c.setAttribute('stroke-width', '1.8');

            const ring = document.createElementNS(SVG_NS, 'circle');
            ring.setAttribute('r', String(nodeRadius(n) - 0.5));
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', nodeStroke(n));
            ring.setAttribute('stroke-width', '0.6');
            ring.setAttribute('stroke-opacity', '0.45');

            g.appendChild(halo);
            g.appendChild(c);
            g.appendChild(ring);
            nodeLayer.appendChild(g);

            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('font-family', 'var(--ll-font-mono)');
            label.setAttribute('font-size', '10');
            label.setAttribute('fill', 'var(--ll-fg-2)');
            label.setAttribute('pointer-events', 'none');
            label.textContent = n.label;
            labelLayer.appendChild(label);

            g.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (selectedId === n.id) deselect();
                    else selectNode(n);
                }
            });
            g.addEventListener('focus', () => highlightNeighborhood(n.id));
            g.addEventListener('blur', () => {
                if (!selectedId) clearHighlight();
                else highlightNeighborhood(selectedId);
            });

            return { g, circle: c, halo, label };
        });

        let cooling = 1.0;
        let running = true;

        const stepForces = (apply: boolean) => {
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 < 1) {
                        d2 = 1;
                        dx = Math.random();
                        dy = Math.random();
                    }
                    const d = Math.sqrt(d2);
                    const f = REPULSE / d2;
                    const fx = (dx / d) * f;
                    const fy = (dy / d) * f;
                    const c = apply ? cooling : 1;
                    a.vx -= fx * c;
                    a.vy -= fy * c;
                    b.vx += fx * c;
                    b.vy += fy * c;
                }
            }
            for (const [aId, bId] of EDGES_DATA) {
                const a = nodeById.get(aId);
                const b = nodeById.get(bId);
                if (!a || !b) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const diff = d - SPRING_L;
                const fx = (dx / d) * diff * SPRING_K;
                const fy = (dy / d) * diff * SPRING_K;
                const c = apply ? cooling : 1;
                a.vx += fx * c;
                a.vy += fy * c;
                b.vx -= fx * c;
                b.vy -= fy * c;
            }
            const cx = W / 2;
            const cy = H / 2;
            for (const n of nodes) {
                const c = apply ? cooling : 1;
                n.vx += (cx - n.x) * GRAVITY * c;
                n.vy += (cy - n.y) * GRAVITY * c;
            }
        };

        const integrate = () => {
            let energy = 0;
            for (const n of nodes) {
                if (n.fx !== null && n.fy !== null) {
                    n.x = n.fx;
                    n.y = n.fy;
                    n.vx = 0;
                    n.vy = 0;
                    continue;
                }
                n.vx *= DAMP;
                n.vy *= DAMP;
                n.vx = Math.max(-MAX_V, Math.min(MAX_V, n.vx));
                n.vy = Math.max(-MAX_V, Math.min(MAX_V, n.vy));
                n.x += n.vx;
                n.y += n.vy;
                const pad = 28;
                if (n.x < pad) {
                    n.x = pad;
                    n.vx *= -0.4;
                }
                if (n.x > W - pad) {
                    n.x = W - pad;
                    n.vx *= -0.4;
                }
                if (n.y < pad) {
                    n.y = pad;
                    n.vy *= -0.4;
                }
                if (n.y > H - pad) {
                    n.y = H - pad;
                    n.vy *= -0.4;
                }
                energy += n.vx * n.vx + n.vy * n.vy;
            }
            if (energy < 0.6 && cooling > 0.12) cooling *= 0.98;
        };

        const render = () => {
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const r = refs[i];
                r.g.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
                r.label.setAttribute('x', (n.x + nodeRadius(n) + 5).toFixed(1));
                r.label.setAttribute('y', (n.y + 3.5).toFixed(1));
            }
            for (let i = 0; i < edgeEls.length; i++) {
                const [a, b] = EDGES_DATA[i];
                const na = nodeById.get(a);
                const nb = nodeById.get(b);
                if (!na || !nb) continue;
                edgeEls[i].setAttribute('x1', na.x.toFixed(1));
                edgeEls[i].setAttribute('y1', na.y.toFixed(1));
                edgeEls[i].setAttribute('x2', nb.x.toFixed(1));
                edgeEls[i].setAttribute('y2', nb.y.toFixed(1));
            }
        };

        const step = () => {
            stepForces(true);
            integrate();
            render();
            if (running) requestAnimationFrame(step);
        };

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        for (let i = 0; i < (prefersReduced ? 400 : 250); i++) {
            stepForces(false);
            integrate();
        }
        cooling = 0.35;
        render();

        let dragging: SimNode | null = null;
        let dragOffset = { x: 0, y: 0 };
        let pointerStart = { x: 0, y: 0 };
        let dragMoved = false;
        let selectedId: string | null = null;

        const svgPoint = (evt: PointerEvent) => {
            const rect = svg.getBoundingClientRect();
            return {
                x: ((evt.clientX - rect.left) / rect.width) * W,
                y: ((evt.clientY - rect.top) / rect.height) * H,
            };
        };

        const highlightNeighborhood = (id: string) => {
            const neighbors = adj.get(id) ?? new Set();
            nodes.forEach((n, i) => {
                const dim = !(n.id === id || neighbors.has(n.id));
                refs[i].circle.setAttribute('opacity', dim ? '0.28' : '1');
                refs[i].label.setAttribute('opacity', dim ? '0.25' : '1');
                refs[i].halo.setAttribute('opacity', n.id === id ? '0.22' : '0');
            });
            edgeEls.forEach((line, i) => {
                const [a, b] = EDGES_DATA[i];
                const involved = a === id || b === id;
                line.setAttribute('stroke', involved ? 'var(--ll-accent)' : 'var(--ll-fg-3)');
                line.setAttribute('stroke-opacity', involved ? '0.9' : '0.1');
                line.setAttribute('stroke-width', involved ? '1.4' : '0.7');
            });
        };

        const clearHighlight = () => {
            nodes.forEach((_, i) => {
                refs[i].circle.setAttribute('opacity', '1');
                refs[i].label.setAttribute('opacity', '1');
                refs[i].halo.setAttribute('opacity', '0');
            });
            edgeEls.forEach((line) => {
                line.setAttribute('stroke', 'var(--ll-fg-3)');
                line.setAttribute('stroke-opacity', '0.35');
                line.setAttribute('stroke-width', '0.7');
            });
        };

        const selectNode = (n: SimNode) => {
            selectedId = n.id;
            stage.classList.add('has-selection');
            highlightNeighborhood(n.id);
            setChip({ node: n });
        };

        const deselect = () => {
            selectedId = null;
            stage.classList.remove('has-selection');
            clearHighlight();
            setChip(null);
        };

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            const g = target?.closest('.ll-gnode') as SVGGElement | null;
            if (!g) return;
            const id = g.dataset.id;
            if (!id) return;
            const n = nodeById.get(id);
            if (!n) return;
            const p = svgPoint(e);
            dragging = n;
            dragMoved = false;
            pointerStart = { x: e.clientX, y: e.clientY };
            dragOffset = { x: p.x - n.x, y: p.y - n.y };
            n.fx = n.x;
            n.fy = n.y;
            cooling = Math.max(cooling, 0.9);
            g.style.cursor = 'grabbing';
            g.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - pointerStart.x;
            const dy = e.clientY - pointerStart.y;
            if (Math.hypot(dx, dy) > 3) dragMoved = true;
            const p = svgPoint(e);
            dragging.fx = p.x - dragOffset.x;
            dragging.fy = p.y - dragOffset.y;
            cooling = Math.max(cooling, 0.7);
        };

        const endDrag = () => {
            if (!dragging) return;
            const wasMoved = dragMoved;
            const n = dragging;
            n.fx = null;
            n.fy = null;
            const idx = nodes.indexOf(n);
            if (idx >= 0) refs[idx].g.style.cursor = 'grab';
            dragging = null;
            if (!wasMoved) selectNode(n);
        };

        const onRightClick = (e: PointerEvent) => {
            if (dragging) return;
            const target = e.target as Element | null;
            const g = target?.closest('.ll-gnode') as SVGGElement | null;
            if (!g) return;
            const id = g.dataset.id;
            if (!id) return;
            const n = nodeById.get(id);
            if (n) {
                n.fx = null;
                n.fy = null;
            }
        };

        const onPointerOver = (e: PointerEvent) => {
            const target = e.target as Element | null;
            const g = target?.closest('.ll-gnode') as SVGGElement | null;
            if (!g || dragging) return;
            const id = g.dataset.id;
            if (id) highlightNeighborhood(id);
        };

        const onPointerOut = () => {
            if (dragging) return;
            if (!selectedId) clearHighlight();
            else highlightNeighborhood(selectedId);
        };

        const onBackgroundClick = (e: MouseEvent) => {
            if (e.target === svg || e.target === edgeLayer) {
                if (selectedId) deselect();
            }
        };

        nodeLayer.addEventListener('pointerdown', onPointerDown);
        svg.addEventListener('pointermove', onPointerMove);
        svg.addEventListener('pointerup', endDrag);
        svg.addEventListener('pointercancel', endDrag);
        svg.addEventListener('pointerleave', endDrag);
        nodeLayer.addEventListener('pointerover', onPointerOver);
        nodeLayer.addEventListener('pointerout', onPointerOut);
        svg.addEventListener('click', onBackgroundClick);
        svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            onRightClick(e as unknown as PointerEvent);
        });

        let inView = false;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((ent) => {
                    if (ent.isIntersecting && !inView) {
                        inView = true;
                        running = true;
                        step();
                    } else if (!ent.isIntersecting) {
                        running = false;
                    }
                });
            },
            { threshold: 0.1 },
        );
        io.observe(stage);

        const chipCloseHandler = () => deselect();
        document.addEventListener('ll-chip-close', chipCloseHandler);

        return () => {
            running = false;
            io.disconnect();
            document.removeEventListener('ll-chip-close', chipCloseHandler);
            nodeLayer.replaceChildren();
            edgeLayer.replaceChildren();
            labelLayer.replaceChildren();
        };
    }, []);

    return (
        <section className="ll-graph-section" id="graph">
            <div className="ll-wrap">
                <header className="ll-graph-head">
                    <div className="ll-eyebrow" data-ll-animate>
                        § 03 · The graph
                    </div>
                    <h2 className="ll-h2" data-ll-animate>
                        What the agent <em className="ll-italic-accent">actually sees.</em>
                    </h2>
                    <p data-ll-animate>
                        A real graph compiled from a sample corpus — {NODES_DATA.length} concepts,{' '}
                        {EDGES_DATA.length} edges. PageRank ranks importance. Communities cluster
                        topics. Trajectories thread through. When the agent calls{' '}
                        <code className="ll-mono ll-inline">brain_ops(&quot;attention&quot;)</code>,
                        this is the structure it walks. Drag a node. Click one to read the chunk.
                    </p>
                </header>

                <div className="ll-graph-stage" data-ll-animate ref={stageRef}>
                    <div className="ll-graph-overlay">
                        <span className="ll-live" />
                        <span>
                            {NODES_DATA.length} nodes · {EDGES_DATA.length} edges · 11 sources
                        </span>
                    </div>
                    <svg ref={svgRef} viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
                        <g ref={edgeLayerRef} stroke="currentColor" />
                        <g ref={nodeLayerRef} />
                        <g ref={labelLayerRef} />
                    </svg>
                    <div className="ll-graph-legend">
                        <span
                            className="ll-lg"
                            style={{ ['--ll-swatch' as string]: 'var(--ll-accent)' }}
                        >
                            concept
                        </span>
                        <span
                            className="ll-lg"
                            style={{ ['--ll-swatch' as string]: 'var(--ll-node-paper)' }}
                        >
                            paper
                        </span>
                        <span
                            className="ll-lg"
                            style={{ ['--ll-swatch' as string]: 'var(--ll-node-essay)' }}
                        >
                            essay
                        </span>
                    </div>
                    <ChipPanel chip={chip} />
                </div>
            </div>
        </section>
    );
}

function ChipPanel({ chip }: { chip: ChipState }) {
    const n = chip?.node;
    return (
        <div
            className={`ll-chip-panel${chip ? 'open' : ''}`}
            role="dialog"
            aria-label="Source chunk"
            aria-hidden={!chip}
        >
            <button
                className="ll-gcp-close"
                aria-label="Close"
                onClick={() => document.dispatchEvent(new CustomEvent('ll-chip-close'))}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
            </button>
            <div className="ll-gcp-eyebrow">
                <span>{n ? n.kind.toUpperCase() : 'CONCEPT'}</span>
                <span>·</span>
                <span>{n ? `${getDegree(n.id)} link${getDegree(n.id) === 1 ? '' : 's'}` : ''}</span>
            </div>
            <h4 className="ll-gcp-title">{n?.label ?? ''}</h4>
            <div className="ll-gcp-source">
                <span className="ll-gcp-badge">{n?.badge ?? 'PDF'}</span>
                <span>{n?.src ?? ''}</span>
            </div>
            <div className="ll-gcp-chunk">{n?.chunk ?? ''}</div>
            <div className="ll-gcp-tags">
                {n?.tags.map((t) => (
                    <span key={t} className="ll-gcp-tag">
                        {t}
                    </span>
                ))}
            </div>
        </div>
    );
}

const degreeCache = new Map<string, number>();
function getDegree(id: string): number {
    if (degreeCache.size === 0) {
        const adj = new Map<string, number>();
        EDGES_DATA.forEach(([a, b]) => {
            adj.set(a, (adj.get(a) ?? 0) + 1);
            adj.set(b, (adj.get(b) ?? 0) + 1);
        });
        adj.forEach((v, k) => degreeCache.set(k, v));
    }
    return degreeCache.get(id) ?? 0;
}
