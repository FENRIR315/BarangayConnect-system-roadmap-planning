"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Loader2,
  Download,
  Printer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, getStatusColor } from "@/lib/utils";

const STATUS_ORDER = ["submitted", "under_review", "approved", "ready_for_release", "released"];

function DocumentRequestDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"approve" | "reject" | "ready" | "release" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchRequest = async () => {
      const { data } = await supabase
        .from("document_requests")
        .select("*, resident:residents(*), document_type:document_types(*)")
        .eq("id", params.id)
        .single();

      setRequest(data);

      if (data?.id) {
        const { data: doc } = await supabase
          .from("documents")
          .select("*")
          .eq("request_id", data.id)
          .single();
        setGeneratedPdf(doc ?? null);
      }

      setLoading(false);
    };

    fetchRequest();
  }, [params.id]);

  const updateStatus = async (
    newStatus: string,
    extra?: Record<string, unknown>
  ) => {
    setProcessing(true);
    const oldStatus = request.status;

    const updates: Record<string, unknown> = {
      status: newStatus,
      approval_date: newStatus === "approved" ? new Date().toISOString() : request.approval_date,
      release_date: newStatus === "released" ? new Date().toISOString() : request.release_date,
      rejection_reason: newStatus === "rejected" ? rejectionReason : request.rejection_reason,
      ...extra,
    };

    const { data, error } = await supabase
      .from("document_requests")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      alert("Unable to update request. Please try again.");
      setProcessing(false);
      return;
    }

    if (oldStatus !== newStatus) {
      await supabase.from("audit_logs").insert({
        action: newStatus === "rejected" ? "document_rejected" : `document_${newStatus}`,
        module: "documents",
        record_id: params.id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus },
      });
    }

    if (newStatus === "approved" && request.resident?.user_id) {
      await supabase.from("notifications").insert({
        user_id: request.resident.user_id,
        title: "Document Request Approved",
        message: `Your ${request.document_type?.name} request has been approved.`,
        type: "document",
        link: "/resident/documents",
      });
    }

    if (newStatus === "rejected" && request.resident?.user_id) {
      await supabase.from("notifications").insert({
        user_id: request.resident.user_id,
        title: "Document Request Rejected",
        message: `Your ${request.document_type?.name} request was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
        type: "document",
        link: "/resident/documents",
      });
    }

    // Generate certificate when approved
    if (newStatus === "approved" && !generatedPdf) {
      await generateCertificate(data);
    }

    setRequest(data);
    setProcessing(false);
    setAction(null);
    router.refresh();
  };

  const generateCertificate = async (data: any) => {
    const residentName = `${data.resident?.first_name} ${data.resident?.middle_name ? data.resident.middle_name[0] + ". " : ""}${data.resident?.last_name}${data.resident?.suffix ? " " + data.resident.suffix : ""}`;
    const existingCount = await getDocumentCount();

    const certNumber = `BRGY-${getTypeCode(data.document_type?.name)}-${new Date().getFullYear()}-${String(existingCount + 1).padStart(6, "0")}`;

    const { error } = await supabase.from("documents").insert({
      request_id: data.id,
      certificate_number: certNumber,
      document_type: data.document_type?.name,
      resident_name: residentName,
      resident_address: data.resident?.address,
      purpose: data.purpose,
      issued_by: data.processing_official_id,
      status: "valid",
    });

    if (!error) {
      const { data: doc } = await supabase
        .from("documents")
        .select("*")
        .eq("request_id", data.id)
        .single();
      setGeneratedPdf(doc);
    }
  };

  const getTypeCode = (name?: string) => {
    if (!name) return "DOC";
    const map: Record<string, string> = {
      "Barangay Clearance": "CLR",
      "Certificate of Residency": "RES",
      "Certificate of Indigency": "IND",
      "Certificate of Good Moral Character": "GMC",
      "Business Clearance": "BUS",
      "Certificate of Low Income": "LOW",
      "Other Barangay Certifications": "OTH",
    };
    return map[name] || "DOC";
  };

  const getDocumentCount = async () => {
    const { count, error } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true });
    return error ? 0 : (count ?? 0);
  };

  const printCertificate = () => {
    if (!generatedPdf) return;
    window.open(`/api/documents/${generatedPdf.id}/print`, "_blank");
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /></div>;
  }

  if (!request) {
    return <div className="py-12 text-center text-gray-500">Request not found.</div>;
  }

  const canApprove = ["submitted", "under_review"].includes(request.status);
  const canReject = ["submitted", "under_review"].includes(request.status);
  const canMarkReady = request.status === "approved";
  const canRelease = request.status === "ready_for_release";
  const statusIndex = STATUS_ORDER.indexOf(request.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request {request.request_number}</h1>
          <p className="text-sm text-gray-500">Submitted {formatDate(request.created_at)}</p>
        </div>
      </div>

      {/* Status tracker */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i < statusIndex
                      ? "bg-green-100 text-green-700"
                      : i === statusIndex
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </div>
                {i < STATUS_ORDER.length - 1 && <div className="mx-1 h-px w-4 bg-gray-300" />}
              </div>
            ))}
          </div>
          {request.status === "rejected" && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              Rejected: {request.rejection_reason || "No reason provided"}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Request details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Request Number</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{request.request_number}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Document Type</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{request.document_type?.name}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Fee</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">₱{request.document_type?.fee?.toLocaleString() ?? "0"}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Payment</dt>
                  <dd className="mt-1">
                    <Badge className={getStatusColor(request.payment_status)}>{request.payment_status}</Badge>
                  </dd>
                </div>
              </dl>
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Purpose</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.purpose}</dd>
              </div>
              {request.remarks && (
                <div className="mt-4 rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Remarks</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.remarks}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated certificate */}
          {(generatedPdf || request.status === "approved") && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedPdf ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                      <div>
                        <FileText className="mb-2 h-6 w-6 text-green-600" />
                        <p className="font-medium text-green-800">{generatedPdf.certificate_number}</p>
                        <p className="text-sm text-green-600">{generatedPdf.document_type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/verify/${generatedPdf.certificate_number}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" /> Verify
                          </Button>
                        </Link>
                        <Button size="sm" onClick={printCertificate}>
                          <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Certificate is ready. Approved requests generate a certificate with a QR verification code.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canApprove && (
                <Button className="w-full" onClick={() => updateStatus("approved")} disabled={processing}>
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              )}

              {canMarkReady && (
                <Button className="w-full" variant="secondary" onClick={() => updateStatus("ready_for_release")} disabled={processing}>
                  Mark Ready for Release
                </Button>
              )}

              {canRelease && (
                <Button className="w-full bg-green-600 hover:bg-green-700" variant="default" onClick={() => updateStatus("released")} disabled={processing}>
                  Mark as Released
                </Button>
              )}

              {canReject && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Rejection reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => updateStatus("rejected")}
                    disabled={processing}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}

              {!canApprove && !canReject && !canMarkReady && !canRelease && (
                <div className="text-sm text-gray-500">
                  No actions available for this request at its current status.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DocumentRequestDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocumentRequestDetail />
    </Suspense>
  );
}
