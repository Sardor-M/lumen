import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect('/login');

    return (
        <SidebarProvider>
            <AppSidebar session={session} />
            <SidebarInset>
                <header className="flex h-14 items-center gap-3 border-b px-6">
                    <SidebarTrigger className="-ml-2" />
                    <span className="text-muted-foreground text-sm">Knowledge Base</span>
                </header>
                <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
