import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Visual placeholder for /sources/[id] while the server reads chunks +
 * concepts from SQLite. Shared between `loading.tsx` (route-level
 * boundary for direct URL hits) and the inline `<Suspense>` wrapper in
 * `page.tsx` (committed before the synchronous query starts, so the
 * skeleton is visible during client-side navigation as well).
 */
export function SourceDetailSkeleton() {
    return (
        <div className="max-w-full min-w-0 space-y-6 overflow-x-hidden">
            <div className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                <ArrowLeft className="h-3.5 w-3.5" />
                All sources
            </div>

            <header className="min-w-0 space-y-3">
                <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-7 w-2/3" />
                        <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
                <Skeleton className="h-9 w-full max-w-xl rounded-md" />
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="min-w-0 overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-7 w-20" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="min-w-0">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="min-w-0">
                <CardHeader className="space-y-2 pb-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="border-border/60 space-y-2 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-11/12" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
