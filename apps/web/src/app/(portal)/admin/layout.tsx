import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("admin");

  return (
    <AppShell
      role="admin"
      title={`Welcome back, ${session.name} 👋`}
      description="Manage your visitor management system."
      userName={session.name}
    >
      {children}
    </AppShell>
  );
}
