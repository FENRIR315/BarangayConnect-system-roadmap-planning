import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_BUCKETS = new Set(["barangay-attachments", "avatars"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_BATCH_BYTES = 50 * 1024 * 1024; // 50 MB per upload request
const ALLOWED_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_TYPES = new Set([
  "",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/octet-stream",
]);

function storageRoot(): string {
  return process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage");
}

function safeResolve(bucket: string, relPath: string): string | null {
  const clean = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const bucketClean = bucket.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!bucketClean || !clean) return null;
  const resolved = path.resolve(storageRoot(), bucketClean, clean);
  const root = path.resolve(storageRoot());
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

// Magic-byte sniffing so a file's real content decides (not its name or the
// Content-Type header a client can fake). Returns a content group or null.
function sniff(bytes: Uint8Array): "pdf" | "png" | "jpeg" | "webp" | null {
  if (bytes.length === 0) return null;
  if (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  ) {
    return "pdf"; // %PDF
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.slice(0, 4).every((b, i) => b === "RIFF".charCodeAt(i)) &&
    bytes.slice(8, 12).every((b, i) => b === "WEBP".charCodeAt(i))
  ) {
    return "webp";
  }
  return null;
}

const EXT_GROUPS: Record<string, string[]> = {
  pdf: [".pdf"],
  png: [".png"],
  jpeg: [".jpg", ".jpeg"],
  webp: [".webp"],
};

function rejectInvalidFile(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return "File type not allowed";
  const ct = ((file.type ?? "") as string).split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(ct)) return "File type not allowed";
  return null;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

async function audit(
  request: NextRequest,
  user: { id: string },
  opts: { action: string; details?: unknown }
) {
  try {
    await pool.query(
      `insert into public.audit_logs (user_id, ip_address, action, module, details)
       values ($1, $2::text, $3, 'storage', $4::jsonb)`,
      [user.id, clientIp(request), opts.action, opts.details ? JSON.stringify(opts.details) : null]
    );
  } catch {
    // audit must never break the request
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Not authenticated. Please sign in again." } },
      { status: 401 }
    );
  }

  try {
    const form = await request.formData();
    const bucket = String(form.get("bucket") ?? "barangay-attachments");
    const rawPaths = String(form.get("paths") ?? "[]");
    const paths: unknown[] = JSON.parse(rawPaths);
    const files = form.getAll("files");

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ data: null, error: { message: "Bucket not allowed" } }, { status: 403 });
    }

    const uploaded: { path: string }[] = [];

    let batchTotal = 0;
    for (const f of files) {
      if (f instanceof File) batchTotal += f.size;
    }
    if (batchTotal > MAX_BATCH_BYTES) {
      return NextResponse.json(
        { data: null, error: { message: "Total upload size exceeds the 50 MB limit." } },
        { status: 400 }
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!(file instanceof File)) continue;
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { data: null, error: { message: "File is too large. Maximum size is 10 MB." } },
          { status: 400 }
        );
      }
      if (file.size === 0) {
        return NextResponse.json({ data: null, error: { message: "Empty files are not allowed." } }, { status: 400 });
      }
      const bad = rejectInvalidFile(file);
      if (bad) {
        return NextResponse.json({ data: null, error: { message: bad } }, { status: 400 });
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const sniffed = sniff(new Uint8Array(buf));
      const ext = path.extname(file.name).toLowerCase();
      if (!sniffed || !EXT_GROUPS[sniffed].includes(ext)) {
        return NextResponse.json(
          { data: null, error: { message: "File content does not match its declared type." } },
          { status: 400 }
        );
      }

      let rel: string;
      const requested = typeof paths[i] === "string" ? (paths[i] as string).replace(/\\/g, "/") : "";
      if (requested) {
        const segments = requested.split("/").filter(Boolean);
        if (segments.some((s) => s === ".." || s.includes(":"))) {
          return NextResponse.json({ data: null, error: { message: "Invalid file path" } }, { status: 400 });
        }
        rel = segments.join("/");
      } else {
        // Client-supplied name is best-effort sanitized; if it cannot be
        // sanitized into a safe token, fall back to a server-generated name.
        const sanitized = file.name.replace(/[^\w.\-]+/g, "_");
        rel = sanitized && sanitized !== "." && !sanitized.includes("..")
          ? `${Date.now()}_${sanitized}`
          : `${randomUUID()}${ext}`;
      }

      // Residents only: files are namespaced under their own user id so they can
      // never read/overwrite another user's files.
      if (user.role === "resident" && !rel.startsWith(`${user.id}/`)) {
        rel = `${user.id}/${rel}`;
      }
      const target = safeResolve(bucket, rel);
      if (!target) {
        return NextResponse.json({ data: null, error: { message: "Invalid file path" } }, { status: 400 });
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buf);
      uploaded.push({ path: rel });
    }

    await audit(request, user, {
      action: "file_upload",
      details: { bucket, count: uploaded.length, files: uploaded.map((u) => u.path) },
    });

    return NextResponse.json({ data: { path: uploaded[0]?.path ?? null, files: uploaded }, error: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ data: null, error: { message: msg || "Upload failed" } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Not authenticated. Please sign in again." } },
      { status: 401 }
    );
  }
  let body: { bucket?: string; paths?: string[] };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const bucket = body.bucket ?? "barangay-attachments";
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ data: { path: [] }, error: { message: "Bucket not allowed" } }, { status: 403 });
  }
  const removed = [];
  for (let rel of body.paths ?? []) {
    if (typeof rel !== "string") continue;
    rel = rel.replace(/\\/g, "/");
    if (rel.includes("..")) continue;
    if (user.role === "resident" && !rel.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { data: null, error: { message: "You can only delete your own files" } },
        { status: 403 }
      );
    }
    const target = safeResolve(bucket, rel);
    if (target) {
      try {
        await fs.unlink(target);
        removed.push(rel);
        // best-effort cleanup of now-empty parent folders
        let dir = path.dirname(target);
        while (dir.startsWith(storageRoot()) && dir !== storageRoot()) {
          const entries = await fs.readdir(dir);
          if (entries.length > 0) break;
          await fs.rmdir(dir).catch(() => {});
          dir = path.dirname(dir);
        }
      } catch {
        // already missing -> treat as removed
        removed.push(rel);
      }
    }
  }
  await audit(request, user, {
    action: "file_delete",
    details: { bucket, count: removed.length, files: removed },
  });
  return NextResponse.json({ data: { path: removed }, error: null });
}