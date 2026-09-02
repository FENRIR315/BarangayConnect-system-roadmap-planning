import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit({
  userId,
  action,
  module,
  recordId,
  oldValues = null,
  newValues = null,
}: {
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    user_id: userId,
    action,
    module,
    record_id: recordId || null,
    old_values: oldValues,
    new_values: newValues,
  });

  if (error) {
    console.error("Audit log error:", error);
  }
}
