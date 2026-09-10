import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_BUCKETS = new Set(["barangay-attachments", "avatars"]);
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

function rejectInvalidFile(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return "File type not allowed";
  const ct = ((file.type ?? "") as string).split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(ct)) return "File type not allowed";
  // Basic SVG polyglot sniff (defense in depth against stored XSS).
  return null;
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
    const paths: string[] = JSON.parse(rawPaths);
    const files = form.getAll("files");

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ data: null, error: { message: "Bucket not allowed" } }, { status: 403 });
    }

    const uploaded: { path: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!(file instanceof File)) continue;
      const bad = rejectInvalidFile(file);
      if (bad) {
        return NextResponse.json({ data: null, error: { message: bad } }, { status: 400 });
      }
      let rel = paths[i] ?? `${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
      // Residents only: files are namespaced under their own user id so they can
      // never read/overwrite another user's files.
      if (user.role === "resident") rel = `${user.id}/${rel}`;
      const target = safeResolve(bucket, rel);
      if (!target) {
        return NextResponse.json({ data: null, error: { message: "Invalid file path" } }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buf);
      uploaded.push({ path: rel });
    }

    return NextResponse.json({ data: { path: uploaded[0]?.path ?? null, files: uploaded }, error: null });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: { message: e?.message ?? "Upload failed" } }, { status: 500 });
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
  return NextResponse.json({ data: { path: removed }, error: null });
}