import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification({
  userId,
  title,
  message,
  type = "general",
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link: link || null,
  });

  if (error) {
    console.error("Notification error:", error);
  }

  return { error };
}

export async function notifyMultipleUsers(
  userIds: string[],
  title: string,
  message: string,
  type?: string,
  link?: string
) {
  const admin = createAdminClient();
  const notifications = userIds.map((uid) => ({
    user_id: uid,
    title,
    message,
    type: type || "general",
    link: link || null,
  }));

  const { error } = await admin.from("notifications").insert(notifications);

  if (error) {
    console.error("Bulk notification error:", error);
  }

  return { error };
}
