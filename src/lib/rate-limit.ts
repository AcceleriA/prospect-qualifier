import { createServiceClient } from "./supabase";
import { createHash } from "crypto";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function checkRateLimit(
  ipHash: string
): Promise<{ allowed: boolean; remaining: number }> {
  // If Supabase is not configured, skip rate limiting
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true, remaining: 99 };
  }

  try {
    const supabase = createServiceClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("prospect_qualifications")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    const used = count || 0;
    const limit = parseInt(process.env.RATE_LIMIT_PER_HOUR || "3");

    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
    };
  } catch {
    // If Supabase query fails, allow the request
    return { allowed: true, remaining: 99 };
  }
}
