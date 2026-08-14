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

const buildingSeed = [
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

const masterDataSeed = [
  ...buildingSeed.map((value, index) => ({ kind: "buildings", value, sort_order: index + 1 })),
  { kind: "floors", value: "Ground", sort_order: 1 },
  { kind: "floors", value: "2", sort_order: 2 },
  { kind: "floors", value: "4", sort_order: 3 },
  { kind: "floors", value: "6", sort_order: 4 },
  { kind: "rooms", value: "Lobby Desk", sort_order: 1 },
  { kind: "rooms", value: "Orchid Room", sort_order: 2 },
  { kind: "rooms", value: "Cedar Room", sort_order: 3 },
  { kind: "rooms", value: "Board Room", sort_order: 4 },
  { kind: "purposes", value: "Partnership Meeting", sort_order: 1 },
  { kind: "purposes", value: "Interview", sort_order: 2 },
  { kind: "purposes", value: "Vendor Visit", sort_order: 3 },
  { kind: "purposes", value: "Audit", sort_order: 4 },
  { kind: "categories", value: "Guest", sort_order: 1 },
  { kind: "categories", value: "Vendor", sort_order: 2 },
  { kind: "categories", value: "Interviewee", sort_order: 3 },
  { kind: "categories", value: "Contractor", sort_order: 4 }
];

async function main() {
  console.log("Initializing Supabase master data for Visitor Management System...");

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(
      [
        `Supabase Admin API rejected the configured key: ${listError.message}`,
        "Update SUPABASE_SERVICE_ROLE_KEY in apps/api/.env with a valid service-role or secret key from Supabase Dashboard > Project Settings > Data API, then run this script again."
      ].join(" ")
    );
  }

  const { error: masterDataError } = await supabase
    .from("master_data")
    .upsert(masterDataSeed, { onConflict: "kind,value" });

  if (masterDataError) {
    throw new Error(
      `${masterDataError.message}. Run supabase/aihp_mobile_production.sql in the Supabase SQL editor first.`
    );
  }

  console.log(`Master data initialized. Existing auth users in project: ${listed.users.length}`);
  console.log("No demo accounts or demo visits were created.");
  console.log("Create the first admin manually from Supabase Dashboard or SQL as documented in docs/aihp-supabase-admin-setup.md.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
