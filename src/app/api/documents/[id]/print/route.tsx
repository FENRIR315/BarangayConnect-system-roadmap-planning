import { NextResponse } from "next/server";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { CertificateDocument } from "@/lib/pdf/templates/CertificateDocument";

/**
 * Resolve a logo reference to a real path/URL react-pdf can load offline:
 * - /api/local/files/<bucket>/<rel> -> the on-disk storage file
 * - /logos/<name>.png               -> the public folder file
 * - anything else (remote URL)      -> used as-is
 */
function resolvePdfImage(url: string | null | undefined, fallback: string): string {
  let src = url || fallback;
  if (src.startsWith("/api/local/files/")) {
    const rest = src.replace("/api/local/files/", "");
    const bucket = rest.slice(0, rest.indexOf("/"));
    const rel = rest.slice(rest.indexOf("/") + 1);
    const root = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage");
    return path.join(root, bucket, rel);
  }
  if (src.startsWith("/logos/")) {
    return path.join(process.cwd(), "public", src.replace(/^\//, ""));
  }
  return src;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated. Please sign in again." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select(
      "certificate_number, resident_name, resident_address, purpose, issued_at, verification_status, resident_id, document_type:document_types(name)"
    )
    .eq("id", id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  // Residents may only print their own certificates.
  if (user.role === "resident") {
    const r = await pool.query(`select id from public.residents where user_id = $1`, [user.id]);
    const residentId = r.rows[0]?.id;
    if (!residentId || String(doc.resident_id) !== String(residentId)) {
      return NextResponse.json({ error: "Not authorized to print this certificate" }, { status: 403 });
    }
  }

  const { data: settings } = await admin
    .from("barangay_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const bs = settings || {};

  try {
    const pdfBuffer = await renderToBuffer(
      <CertificateDocument
        barangayName={bs.barangay_name || "Barangay Example"}
        municipality={bs.municipality || "Municipality"}
        province={bs.province || "Province"}
        certificateNumber={doc.certificate_number}
        documentType={doc.document_type?.name ?? ""}
        residentName={doc.resident_name}
        address={doc.resident_address || ""}
        purpose={doc.purpose || ""}
        dateIssued={new Date(doc.issued_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
        captainName={bs.captain_name || "Hon. Juan Dela Cruz"}
        logoUrl={resolvePdfImage(bs.logo_url, "/logos/barangay.png")}
        philippinesLogoUrl={resolvePdfImage(null, "/logos/philippines.png")}
      />
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.certificate_number}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
