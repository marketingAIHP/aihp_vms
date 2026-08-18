// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SECRET_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? "";
const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const expoPushUrl = "https://exp.host/--/api/v2/push/send";
const maximumBodyBytes = 32 * 1024;

type NotificationRecord = {
  id: string;
  message: string;
  target_roles: string[] | null;
  title: string;
  user_id: string | null;
};

type WebhookPayload = {
  record: NotificationRecord | null;
  schema: string;
  table: string;
  type: string;
};

type PushTokenRow = {
  expo_push_token: string;
};

type ExpoTicket = {
  details?: { error?: string };
  message?: string;
  status: "error" | "ok";
};

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (request) => {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      return json({ error: "Push delivery is not configured." }, 503);
    }

    const suppliedSecret = request.headers.get("x-webhook-secret") ?? "";
    if (!(await secretsMatch(suppliedSecret, webhookSecret))) {
      return json({ error: "Unauthorized." }, 401);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
      return json({ error: "Request is too large." }, 413);
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    if (
      payload.type !== "INSERT"
      || payload.schema !== "public"
      || payload.table !== "notifications"
      || !payload.record?.id
    ) {
      return json({ error: "Invalid notification webhook payload." }, 400);
    }

    const tokens = await resolveRecipientTokens(payload.record);
    if (tokens.length === 0) {
      return json({ sent: 0 });
    }

    let sent = 0;
    for (let index = 0; index < tokens.length; index += 100) {
      const batch = tokens.slice(index, index + 100);
      const tickets = await sendPushBatch(batch, payload.record);
      sent += tickets.filter((ticket) => ticket.status === "ok").length;
      await deactivateRejectedTokens(batch, tickets);
    }

    return json({ sent });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Push delivery failed.");
    return json({ error: "Push delivery failed." }, 500);
  }
});

async function resolveRecipientTokens(notification: NotificationRecord) {
  let userIds: string[] = [];

  if (notification.user_id) {
    userIds = [notification.user_id];
  } else {
    const requestedRoles = (notification.target_roles ?? [])
      .map((role) => role === "site_manager" ? "host" : role)
      .filter((role) => ["admin", "host", "receptionist"].includes(role));

    if (requestedRoles.length === 0) {
      return [];
    }

    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .in("role", Array.from(new Set(requestedRoles)))
      .eq("is_active", true)
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    userIds = (data ?? []).map((profile) => profile.id as string);
  }

  const tokenRows: PushTokenRow[] = [];
  for (let index = 0; index < userIds.length; index += 100) {
    const { data, error } = await adminClient
      .from("push_tokens")
      .select("expo_push_token")
      .in("user_id", userIds.slice(index, index + 100))
      .eq("is_active", true);

    if (error) {
      throw new Error(error.message);
    }

    tokenRows.push(...((data ?? []) as PushTokenRow[]));
  }

  return Array.from(new Set(tokenRows.map((row) => row.expo_push_token)));
}

async function sendPushBatch(tokens: string[], notification: NotificationRecord) {
  const messages = tokens.map((token) => ({
    to: token,
    title: notification.title.slice(0, 100),
    body: "A visitor update is available. Open AIHP VMS for details.",
    data: {
      destination: "notifications",
      notificationId: notification.id
    },
    sound: "default",
    priority: "high",
    channelId: "visitor-updates"
  }));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(expoPushUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });

    if (response.ok) {
      const result = await response.json() as { data?: ExpoTicket[] };
      return result.data ?? [];
    }

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Expo Push API rejected the request with status ${response.status}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }

  throw new Error("Expo Push API remained unavailable after retries.");
}

async function deactivateRejectedTokens(tokens: string[], tickets: ExpoTicket[]) {
  const rejected = tokens.filter((_, index) => {
    const ticket = tickets[index];
    return ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered";
  });

  if (rejected.length === 0) {
    return;
  }

  const { error } = await adminClient
    .from("push_tokens")
    .update({
      is_active: false,
      last_error: "DeviceNotRegistered",
      updated_at: new Date().toISOString()
    })
    .in("expo_push_token", rejected);

  if (error) {
    throw new Error(error.message);
  }
}

async function secretsMatch(candidate: string, expected: string) {
  if (!candidate || !expected) {
    return false;
  }

  const encoder = new TextEncoder();
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const candidateBytes = new Uint8Array(candidateHash);
  const expectedBytes = new Uint8Array(expectedHash);

  return candidateBytes.length === expectedBytes.length
    && candidateBytes.every((byte, index) => byte === expectedBytes[index]);
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

