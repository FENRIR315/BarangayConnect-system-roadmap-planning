import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Names of buckets used for on-premise uploads.
const FILE_BUCKETS = new Set(["barangay-attachments", "avatars"]);

function storageRoot(): string {
  return process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage");
}

function contentTypeOf(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  const [bucket, ...rest] = segments;
  const rel = rest.join("/");

  if (!bucket || !rel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!FILE_BUCKETS.has(bucket) && bucket !== "logos") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Public access only for the barangay logo.
  const isPublic = bucket === "logos" || rel.startsWith("logos/");
  if (!isPublic) {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Residents may only read files inside their own namespace.
    if (user.role === "resident" && !rel.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  const root = path.resolve(storageRoot());
  const target = path.resolve(root, bucket, ...rest);
  if (!target.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buf = await fs.readFile(target);
    const contentType = contentTypeOf(target);
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    };
    // Serve non-image files (e.g. PDFs) as downloads so they are not rendered
    // inline in the browser (avoids stored-XSS/polyglot preview issues).
    if (!contentType.startsWith("image/")) {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(target).replace(/"/g, "")}"`;
    }
    return new NextResponse(new Uint8Array(buf), { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}