import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/auth/supabase";
import { AppShell } from "@/components/app/app-shell";

export default async function SiteManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("site_manager");
  const supabase = await getSupabaseServerClient();
  let siteName = "Not Assigned";

  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("email", session.email)
      .maybeSingle();

    if (typeof data?.company_name === "string" && data.company_name.trim()) {
      siteName = data.company_name.trim();
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
