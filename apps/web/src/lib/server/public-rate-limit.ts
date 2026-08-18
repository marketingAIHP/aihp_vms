import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 5 * 60;
const MAX_REQUESTS = 30;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function getRateLimitState(request: Request, scope: string, supabase: SupabaseClient) {
  const clientHash = createHash("sha256").update(getClientIp(request)).digest("hex");
  const { data, error } = await supabase.rpc("consume_public_rate_limit", {
    p_client_hash: clientHash,
    p_max_requests: MAX_REQUESTS,
    p_scope: scope,
    p_window_seconds: WINDOW_SECONDS
  });

  if (error || !data?.[0]) {
    return { limited: true, remaining: 0, retryAfterSeconds: 60 };
  }

  return {
    limited: Boolean(data[0].limited),
    remaining: Number(data[0].remaining ?? 0),
    retryAfterSeconds: Number(data[0].retry_after_seconds ?? 1)
  };
}
