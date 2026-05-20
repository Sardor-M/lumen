import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { activityQuerySchema } from '@/lib/schemas';
import { syncActivity } from '@/lib/lumen';

export const dynamic = 'force-dynamic';

export const GET = route({ query: activityQuerySchema }, ({ query }) =>
    NextResponse.json(syncActivity({ limit: query.limit })),
);
