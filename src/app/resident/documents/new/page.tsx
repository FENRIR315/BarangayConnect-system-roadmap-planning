"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Send, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { documentRequestSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RequestForm = z.infer<typeof documentRequestSchema>;

export default function NewDocumentRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(documentRequestSchema),
  });

  const selectedTypeId = watch("document_type_id");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [{ data: types }, { data: resident }] = await Promise.all([
        supabase.from("document_types").select("*").eq("is_active", true),
        supabase.from("residents").select("id").eq("user_id", user.id).single(),
      ]);

      setDocumentTypes(types ?? []);
      setResidentId(resident?.id ?? null);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const onSubmit = async (data: RequestForm) => {
    setError(null);
    setLoading(true);

    if (!residentId) {
      setError("No resident profile found. Please contact the barangay office.");
      setLoading(false);
      return;
    }

    const currentYear = new Date().getFullYear();
    const { count } = await supabase
      .from("document_requests")
      .select("id", { count: "exact", head: true });

    const requestNumber = `DR-${currentYear}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: req, error: insertError } = await supabase
      .from("document_requests")
      .insert({
        request_number: requestNumber,
        resident_id: residentId,
        document_type_id: data.document_type_id,
        purpose: data.purpose,
        status: "submitted",
        payment_status: "unpaid",
        remarks: data.remarks || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to submit request. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/resident/documents");
    router.refresh();
  };

  const selectedType = documentTypes.find((t) => t.id === selectedTypeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/resident/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request a Document</h1>
          <p className="text-sm text-gray-500">Submit a new document request</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Request Form</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : !residentId ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No resident profile found. Please contact the barangay office to link your profile.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="document_type_id">Document Type *</Label>
                <select
                  id="document_type_id"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("document_type_id")}
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (₱{t.fee?.toLocaleString() ?? "0"})
                    </option>
                  ))}
                </select>
                {errors.document_type_id && (
                  <p className="text-sm text-red-600">{errors.document_type_id.message}</p>
                )}
              </div>

              {selectedType && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedType.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{selectedType.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₱{selectedType.fee?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Processing fee</p>
                    </div>
                  </div>
                  {selectedType.requirements?.length > 0 && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-500">Requirements:</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedType.requirements.map((r: string, i: number) => (
                          <Badge key={i} variant="secondary">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Request *</Label>
                <Textarea
                  id="purpose"
                  placeholder="State the purpose of this document request..."
                  {...register("purpose")}
                />
                {errors.purpose && (
                  <p className="text-sm text-red-600">{errors.purpose.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Textarea
                  id="remarks"
                  placeholder="Any additional notes..."
                  {...register("remarks")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/resident/documents">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit Request
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
