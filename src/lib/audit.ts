import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";

export type ActorRole = "user" | "admin" | "system";

/**
 * Records a security/trust-relevant event. Fire-and-forget by design — an audit-log
 * write failing should never block or fail the action it's describing, so callers
 * don't need to await this in their critical path (though they can).
 */
export async function writeAuditLog(entry: {
  actorId: string | null;
  actorRole: ActorRole;
  action: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("audit_log").insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      target_id: entry.targetId ?? null,
      metadata: (entry.metadata ?? {}) as Json,
    });
  } catch (err) {
    console.error("audit log write failed", err, entry.action);
  }
}
