import { Activity, Cpu, ArrowUpFromLine, ArrowDownToLine, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { syncActivity } from '@/lib/lumen';

/**
 * Deterministic short-form device id + color so users can visually distinguish
 * laptops in the activity feed without storing per-device labels.
 */
const DEVICE_PALETTE = [
    'bg-sky-500/15 text-sky-300 border-sky-500/30',
    'bg-orange-500/15 text-orange-300 border-orange-500/30',
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'bg-pink-500/15 text-pink-300 border-pink-500/30',
    'bg-teal-500/15 text-teal-300 border-teal-500/30',
    'bg-rose-500/15 text-rose-300 border-rose-500/30',
];

function deviceTone(deviceId: string): string {
    let h = 0;
    for (let i = 0; i < deviceId.length; i++) h = (h * 31 + deviceId.charCodeAt(i)) | 0;
    return DEVICE_PALETTE[Math.abs(h) % DEVICE_PALETTE.length];
}

function shortDevice(deviceId: string): string {
    return deviceId.slice(0, 8);
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

function statusBadge(entry: {
    pushed_at: string | null;
    pulled_at: string | null;
    applied_at: string | null;
}): { label: string; tone: 'default' | 'secondary' | 'outline' } {
    if (entry.applied_at) return { label: 'applied', tone: 'default' };
    if (entry.pulled_at) return { label: 'pulled', tone: 'secondary' };
    if (entry.pushed_at) return { label: 'pushed', tone: 'secondary' };
    return { label: 'pending', tone: 'outline' };
}

export default function ActivityPage() {
    const data = syncActivity({ limit: 100 });
    const empty = data.entries_total === 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    {empty
                        ? 'Cross-device sync events will appear here.'
                        : `${data.entries_total.toLocaleString()} journal entries across ${data.devices_seen} ${data.devices_seen === 1 ? 'device' : 'devices'}.`}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Devices" value={data.devices_seen} Icon={Cpu} />
                <StatCard label="Last 24h" value={data.entries_24h} Icon={Activity} />
                <StatCard label="Pending push" value={data.pending_push} Icon={ArrowUpFromLine} />
                <StatCard label="Pending apply" value={data.pending_apply} Icon={ArrowDownToLine} />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>Device</TableHead>
                                <TableHead>Op</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empty ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-muted-foreground py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Inbox className="text-muted-foreground/40 h-8 w-8" />
                                            <p className="text-sm">No journal entries yet</p>
                                            <p className="text-xs">
                                                Run{' '}
                                                <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                                                    lumen sync init
                                                </code>{' '}
                                                to enable cross-device sync, then{' '}
                                                <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                                                    lumen compile
                                                </code>{' '}
                                                to produce activity.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.entries.map((entry) => {
                                    const status = statusBadge(entry);
                                    return (
                                        <TableRow key={entry.sync_id}>
                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                {relativeTime(entry.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`font-mono text-xs ${deviceTone(entry.device_id)}`}
                                                    title={entry.device_id}
                                                >
                                                    {shortDevice(entry.device_id)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {entry.op}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                                                {entry.payload_preview || entry.entity_id}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                <span className="font-mono">
                                                    {entry.scope_kind}
                                                </span>
                                                {entry.scope_key !== 'me' && (
                                                    <span className="text-muted-foreground/70">
                                                        :{entry.scope_key}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={status.tone} className="text-xs">
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    label,
    value,
    Icon,
}: {
    label: string;
    value: number;
    Icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Icon className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            </CardContent>
        </Card>
    );
}
