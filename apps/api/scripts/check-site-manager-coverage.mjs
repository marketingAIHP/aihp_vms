import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in apps/api/.env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sites = [
  "AIHP Tower",
  "AIHP Cyber Greens 2",
  "AIHP Cyber Greens",
  "AIHP Horizon",
  "AIHP Signature",
  "AIHP Palms",
  "AIHP Millennium",
  "AIHP Milestone",
  "BPTP Centra 1",
  "Eros City Square",
  "Silverton Tower",
  "SPAZE BUSINESS PARK",
  "Splendor Spectrum",
  "Unitech Business Zone",
  "M3M URBANA",
  "Pioneer Urban Square",
  "Palm Spring Plaza",
  "Ocus Technopolis",
  "Veritas",
  "MGF Metropolis",
  "AIHP SCO-27",
  "AIHP Executive Center",
  "AIHP Broadway",
  "AIHP Skyline",
  "Good Earth City Center Mall",
  "Spaze ITech Park",
  "AIHP Atrium",
  "AIHP Spectra",
  "AIHP ONE",
  "RP Farms",
  "GULBAGH MANDI FARMS",
  "PT NO: 390"
];

async function main() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, role, is_active")
    .eq("role", "host")
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  const profiles = data ?? [];
  const covered = new Set(profiles.map((item) => item.company_name).filter(Boolean));
  const missing = sites.filter((site) => !covered.has(site));

  console.log(JSON.stringify({
    activeHostProfiles: profiles.length,
    coveredSites: Array.from(covered).sort(),
    missingSites: missing
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
