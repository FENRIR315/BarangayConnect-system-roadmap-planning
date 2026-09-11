import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import type { Query } from "@/lib/local/sql";
import { enqueueEmail, isEmailEnabled, notificationHtml } from "@/lib/mail";

const REQUEST_NOTIFY_STATUSES = new Set(["approved", "ready", "issued", "rejected"]);
const APPOINTMENT_NOTIFY_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

export async function createNotification(opts: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
}): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `insert into public.notifications (id, user_id, title, message, type, link)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, opts.userId, opts.title, opts.message, opts.type, opts.link ?? null]
  );
  return id;
}

async function emailVerifiedUserEmail(userId: string): Promise<string | null> {
  const r = await pool.query(
    `select email from public.users where id = $1 and email_verified = true`,
    [userId]
  );
  return r.rows[0]?.email ?? null;
}

async function notifyResidentByResidentId(
  residentId: string,
  opts: { title: string; message: string; type?: string; link?: string | null }
): Promise<void> {
  const r = await pool.query(
    `select u.id as user_id from public.residents res join public.users u on u.id = res.user_id
     where res.id = $1`,
    [residentId]
  );
  const row = r.rows[0] as { user_id: string } | undefined;
  if (!row) return;

  const notifId = await createNotification({
    userId: row.user_id,
    title: opts.title,
    message: opts.message,
    type: opts.type ?? "info",
    link: opts.link,
  });

  if (isEmailEnabled()) {
    const email = await emailVerifiedUserEmail(row.user_id);
    if (email) {
      await enqueueEmail({
        to: email,
        subject: opts.title,
        html: notificationHtml(opts.message),
        notificationId: notifId,
      });
    }
  }
}

async function broadcastAnnouncement(row: Record<string, unknown>): Promise<void> {
  const id = String(row.id);
  const title = String(row.title ?? "New announcement");
  const message = String(row.description ?? "");

  const claimed = await pool.query(
    `update public.announcements set notified_at = now()
     where id = $1 and notified_at is null returning id`,
    [id]
  );
  if (claimed.rows.length === 0) return;
  if (!isEmailEnabled()) return;

  await pool.query(
    `insert into public.email_queue (id, to_email, subject, body_html, status)
     select gen_random_uuid(), u.email, $2, $3, 'pending'
     from public.users u
     where u.email_verified = true and u.email is not null and u.email <> ''`,
    [id, `New announcement: ${title}`, notificationHtml(`<b>${title}</b><br/>${message}`)]
  );
}

/**
 * Converts a successful write (insert/update) through /api/local/db into
 * in-app notifications + queued email notifications. Best effort; never throws.
 */
export async function dispatchAfterWrite(q: Query, data: any): Promise<void> {
  if (!data) return;
  const rows = (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;
  if (rows.length === 0) return;

  if (q.table === "announcements") {
    if (q.verb === "insert" || (q.verb === "update" && rows[0]?.status === "published")) {
      await broadcastAnnouncement(rows[0]);
    }
    return;
  }

  if (q.table === "document_requests" && q.verb === "update") {
    for (const row of rows) {
      const status = String(row.status ?? "");
      if (!REQUEST_NOTIFY_STATUSES.has(status)) continue;
      const claimed = await pool.query(
        `update public.document_requests set notified_status = $2
         where id = $1 and (notified_status is null or notified_status <> $2) returning id`,
        [row.id, status]
      );
      if (claimed.rows.length === 0) continue;
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      await notifyResidentByResidentId(String(row.resident_id), {
        title: `Document request ${label}`,
        message: `Your document request ${String(row.request_number ?? "")} is now ${status}. Please check the portal or visit the barangay hall.`,
        type: "info",
        link: "/resident/documents",
      });
    }
    return;
  }

  if (q.table === "appointments" && q.verb === "update") {
    for (const row of rows) {
      const status = String(row.status ?? "");
      if (!APPOINTMENT_NOTIFY_STATUSES.has(status)) continue;
      const claimed = await pool.query(
        `update public.appointments set notified_status = $2
         where id = $1 and (notified_status is null or notified_status <> $2) returning id`,
        [row.id, status]
      );
      if (claimed.rows.length === 0) continue;
      await notifyResidentByResidentId(String(row.resident_id), {
        title: `Appointment ${status}`,
        message: `Your appointment ${String(row.appointment_number ?? "")} status is now ${status}.`,
        type: "info",
        link: "/resident/appointments",
      });
    }
  }
}