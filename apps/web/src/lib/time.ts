/** Human-friendly relative time. Returns '—' for null or unparseable input. */
export function relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso).getTime();
    if (isNaN(d)) return '—';
    const diff = Date.now() - d;
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
}
