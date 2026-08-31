import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/auth/supabase";
import { AppShell } from "@/components/app/app-shell";

export default async function SiteManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("site_manager");
  const supabase = await getSupabaseServerClient();
  let siteName = "Not Assigned";

  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("email", session.email)
        .maybeSingle();

      if (typeof data?.company_name === "string" && data.company_name.trim()) {
        siteName = data.company_name.trim();
      }
    } catch {
      // The dashboard APIs still enforce the assigned-site scope; a temporary
      // profile lookup error must not block a successful login.
    }
  }

  return (
    <AppShell
      role="site_manager"
      title={`Welcome back, ${session.name} 👋`}
      description={
        <>
          <span>Assigned Site:</span>
          <span className="block font-medium text-foreground">{siteName}</span>
        </>
      }
      userName={session.name}
    >
      {children}
    </AppShell>
  );
}
