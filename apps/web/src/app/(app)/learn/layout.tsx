import { LearnNav } from '@/components/learn-nav';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    How Lumen turns reading into a graph, and how it gets better as you use it.
                </p>
            </div>

            <LearnNav />

            <div>{children}</div>
        </div>
    );
}
