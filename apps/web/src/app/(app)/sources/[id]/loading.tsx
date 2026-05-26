import { SourceDetailSkeleton } from '@/components/source-detail-skeleton';

/**
 * Route-level Suspense fallback. Fires on direct URL hits or a full
 * refresh of /sources/[id]. Client-side navigation goes through the
 * inline `<Suspense>` in `page.tsx` which uses the same skeleton.
 */
export default function Loading() {
    return <SourceDetailSkeleton />;
}
