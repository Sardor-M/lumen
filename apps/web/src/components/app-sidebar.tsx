'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Activity,
    BookOpen,
    Bot,
    Boxes,
    ChevronsUpDown,
    FileText,
    GitFork,
    LayoutDashboard,
    LogOut,
    Search,
    Sparkles,
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Session } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/concepts', label: 'Concepts', icon: Boxes },
    { href: '/graph', label: 'Memory', icon: GitFork },
    { href: '/sources', label: 'Sources', icon: FileText },
    { href: '/agent-activity', label: 'Agent activity', icon: Bot },
    { href: '/activity', label: 'Sync', icon: Activity },
    { href: '/learn', label: 'Learn', icon: BookOpen },
];

export function AppSidebar({ session }: { session: Session }) {
    const pathname = usePathname();

    const initials = (session.user.name ?? session.user.email)
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Sidebar>
            <SidebarHeader className="px-4 py-5">
                <div className="flex items-center justify-between gap-2">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-lg font-bold tracking-tight">Lumen</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const active =
                                    item.href === '/'
                                        ? pathname === '/'
                                        : pathname.startsWith(item.href);
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            render={<Link href={item.href} />}
                                            isActive={active}
                                            tooltip={item.label}
                                        >
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent"
                                    />
                                }
                            >
                                <Avatar className="h-7 w-7 rounded-md">
                                    <AvatarFallback className="rounded-md text-[10px]">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {session.user.name}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {session.user.email}
                                    </span>
                                </div>
                                <ChevronsUpDown className="ml-auto" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align="start"
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                            >
                                <DropdownMenuItem>
                                    <Link
                                        href="/api/auth/sign-out"
                                        className="flex w-full items-center gap-2"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
