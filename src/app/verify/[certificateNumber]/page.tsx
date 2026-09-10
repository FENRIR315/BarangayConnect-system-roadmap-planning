"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, ShieldX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

function VerificationPage() {
  const params = useParams<{ certificateNumber: string }>();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [doc, setDoc] = useState<any>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select(
          "certificate_number, resident_name, verification_status, issued_at, document_type:document_types(name)"
        )
        .eq("certificate_number", params.certificateNumber)
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      setDoc(data);
      setStatus(data.verification_status === "valid" ? "valid" : "invalid");
    };

    fetchDoc();
  }, [params.certificateNumber]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === "valid" ? (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-green-600">VERIFIED</h1>
              <p className="mt-2 mb-6 text-sm text-gray-500">
                This is a valid official document issued by the barangay.
              </p>

              <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-left">
                <div>
                  <p className="text-xs font-medium text-gray-500">Certificate Number</p>
                  <p className="text-sm font-semibold text-gray-900">{doc.certificate_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Document</p>
                  <p className="text-sm font-semibold text-gray-900">{doc.document_type?.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Resident</p>
                  <p className="text-sm font-semibold text-gray-900">{doc.resident_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Date Issued</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(doc.issued_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <p className="text-sm font-bold text-green-600">VALID</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <ShieldX className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-red-600">INVALID</h1>
              <p className="mt-2 text-sm text-gray-500">
                This document could not be verified. It may be invalid, expired, or the certificate number is incorrect.
              </p>
            </>
          )}

          <p className="mt-6 text-xs text-gray-400">
            This page is a public verification service. For inquiries, please contact your barangay hall.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerificationPage />
    </Suspense>
  );
}
