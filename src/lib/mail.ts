import { createTransport, type Transporter } from "nodemailer";
import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";

export function isEmailEnabled(): boolean {
  return (
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASS) &&
    process.env.SMTP_ENABLED !== "false"
  );
}

export function brandName(): string {
  const raw = process.env.NEXT_PUBLIC_BARANGAY_NAME ?? "Barangay";
  return raw.replace(/"/g, "").trim();
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: (process.env.SMTP_SECURE ?? "true") !== "false",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }
  return transporter;
}

function layout(title: string, bodyHtml: string): string {
  const name = brandName();
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:520px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#2563eb;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold">${name}</div>
      <div style="padding:24px;color:#111827;font-size:14px;line-height:1.6">
        <h2 style="margin:0 0 12px;font-size:17px">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="background:#f9fafb;padding:14px 24px;color:#6b7280;font-size:12px">
        Sent by the ${name} system. <a href="${appUrl()}">Open ${name}</a>
      </div>
    </div>
  </body>
</html>`;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  notificationId?: string | null;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  await getTransporter().sendMail({
    from: `"${brandName()}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: layout(subject, html),
  });
}

export async function enqueueEmail(opts: MailOptions): Promise<void> {
  await pool.query(
    `insert into public.email_queue (id, to_email, subject, body_html, status, notification_id)
     values ($1, $2, $3, $4, 'pending', $5)`,
    [randomUUID(), opts.to, opts.subject, opts.html, opts.notificationId ?? null]
  );
}

export async function sendPendingEmails({ limit = 20 } = {}): Promise<number> {
  if (!isEmailEnabled()) return 0;
  const r = await pool.query(
    `select id, to_email, subject, body_html, attempts
     from public.email_queue where status = 'pending' order by created_at asc limit $1`,
    [limit]
  );
  const rows = r.rows as Array<{ id: string; to_email: string; subject: string; body_html: string; attempts: number }>;
  let sent = 0;
  for (const row of rows) {
    try {
      await sendMail({ to: row.to_email, subject: row.subject, html: row.body_html });
      await pool.query(
        `update public.email_queue set status = 'sent', sent_at = now(), last_error = null where id = $1`,
        [row.id]
      );
      sent++;
    } catch (e: any) {
      const attempts = (row.attempts ?? 0) + 1;
      const msg = String(e?.message ?? e).slice(0, 400);
      if (attempts >= 5) {
        await pool.query(
          `update public.email_queue set status = 'failed', attempts = $1, last_error = $2 where id = $3`,
          [attempts, msg, row.id]
        );
      } else {
        await pool.query(
          `update public.email_queue set attempts = $1, last_error = $2 where id = $3`,
          [attempts, msg, row.id]
        );
      }
    }
  }
  return sent;
}

// ---- templates -------------------------------------------------------------

export function notificationHtml(message: string): string {
  return `<p style="margin:0">${message}</p>`;
}