import { getSession } from "@/lib/auth/session";
import type { AppRole, AppSession } from "@/lib/types";

export async function requireApiRole(role: AppRole): Promise<AppSession> {
  const session = await getSession();
  if (!session || session.role !== role) {
    throw new Error("Unauthorized");
  }
  return session;
}

