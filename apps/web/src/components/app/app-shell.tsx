"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, LogOut, NotebookTabs, Settings2, UserCircle2, Users2 } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WebAIHPTextLogo } from "@/components/branding/web-aihp-text-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { PageHeader } from "@/components/app/page-header";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/visitors", label: "Visitors", icon: Users2 },
  { href: "/admin/sites", label: "Sites", icon: Building2 },
  { href: "/admin/site-managers", label: "Users", icon: UserCircle2 },
  { href: "/admin/reports", label: "Reports", icon: NotebookTabs },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

const siteManagerNav = [
  { href: "/site-manager/dashboard", label: "Dashboard", icon: Home },
  { href: "/site-manager/visitors", label: "Visitors", icon: Users2 },
  { href: "/site-manager/reports", label: "Reports", icon: NotebookTabs },
  { href: "/site-manager/notifications", label: "Notifications", icon: UserCircle2 },
  { href: "/site-manager/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({
  children,
  description,
  role,
  title,
  userName,
}: {
  children: React.ReactNode;
  description: React.ReactNode;
  role: AppRole;
  title: string;
  userName: string;
}) {
  const navigation = role === "admin" ? adminNav : siteManagerNav;
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-sidebar-border/70">
        <SidebarHeader className="px-4 py-5">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-[var(--color-aqua)] p-5 text-primary-foreground shadow-lg shadow-primary/20">
            <WebAIHPTextLogo size="lg" />
            <h2 className="mt-3 text-xl font-semibold">Visitor Management System</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Secure visitor lifecycle operations for enterprise teams.
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full justify-start gap-2">
              <LogOut className="size-4" />
              Logout
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={cn("min-h-screen bg-[radial-gradient(circle_at_top,_rgba(18,138,160,0.15),_transparent_30%),var(--background)]")}>
        <PageHeader title={title} description={description} userName={userName} />
        <div className="flex-1 px-6 py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
