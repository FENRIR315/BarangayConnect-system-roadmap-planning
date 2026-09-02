import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { CertificateDocument } from "@/lib/pdf/templates/CertificateDocument";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("*, request:document_requests(*, resident:residents(*), document_type:document_types(*))")
    .eq("id", id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const { data: settings } = await admin
    .from("barangay_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const bs = settings || {};

  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      barangayName={bs.barangay_name || "Barangay Example"}
      municipality={bs.municipality || "Municipality"}
      province={bs.province || "Province"}
      certificateNumber={doc.certificate_number}
      documentType={doc.document_type}
      residentName={doc.resident_name}
      address={doc.resident_address || ""}
      purpose={doc.purpose || ""}
      dateIssued={new Date(doc.issued_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
      captainName={bs.captain_name || "Hon. Juan Dela Cruz"}
      logoUrl={bs.logo_url}
    />
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.certificate_number}.pdf"`,
    },
  });
}
