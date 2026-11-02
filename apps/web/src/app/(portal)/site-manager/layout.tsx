import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app/app-shell";
import { fetchAssignedSites, fetchProfileByEmail } from "@/lib/server/live-data";

export default async function SiteManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("site_manager");
  let siteNames: string[] = [];

  try {
    const profile = await fetchProfileByEmail(session.email);
    siteNames = profile ? (await fetchAssignedSites(profile)).map((site) => site.name) : [];
  } catch {
    // The dashboard APIs still enforce assigned-site access; a temporary lookup
    // error must not block a successful login.
  }

  return (
    <AppShell
      role="site_manager"
      title={`Welcome back, ${session.name} 👋`}
      description={
        <>
          <span>Assigned Sites:</span>
          <span className="block font-medium text-foreground">{siteNames.length ? siteNames.join(", ") : "Not Assigned"}</span>
        </>
      }
      userName={session.name}
    >
      {children}
    </AppShell>
  );
}
