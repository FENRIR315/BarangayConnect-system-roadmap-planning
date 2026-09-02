"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getStatusColor, formatDate } from "@/lib/utils";

const STATUSES = ["submitted", "under_review", "investigating", "resolved", "closed", "rejected"];

function ComplaintDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resolution, setResolution] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchComplaint = async () => {
      const { data } = await supabase
        .from("complaints")
        .select("*, resident:residents(first_name, middle_name, last_name, suffix, contact_number, address), complaint_type:complaint_types(name)")
        .eq("id", params.id)
        .single();
      setComplaint(data);
      if (data?.resolution) setResolution(data.resolution);
      setLoading(false);
    };
    fetchComplaint();
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setProcessing(true);
    const oldStatus = complaint.status;

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolution = resolution;
      updates.resolution_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("complaints")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      alert("Unable to update complaint.");
      setProcessing(false);
      return;
    }

    if (oldStatus !== newStatus) {
      const { data: resident } = await supabase
        .from("residents")
        .select("user_id")
        .eq("id", complaint.resident_id)
        .single();

      if (resident?.user_id) {
        await supabase.from("notifications").insert({
          user_id: resident.user_id,
          title: "Complaint Status Updated",
          message: `Your complaint (${complaint.complaint_number}) is now ${newStatus.replace(/_/g, " ")}.`,
          type: "complaint",
          link: "/resident/complaints",
        });
      }

      await supabase.from("audit_logs").insert({
        action: `complaint_${newStatus}`,
        module: "complaints",
        record_id: params.id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus },
      });
    }

    setComplaint(data);
    setProcessing(false);
    router.refresh();
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /></div>;
  }

  if (!complaint) {
    return <div className="py-12 text-center text-gray-500">Complaint not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/complaints">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{complaint.complaint_number}</h1>
          <p className="text-sm text-gray-500">{complaint.complaint_type?.name}</p>
        </div>
        <Badge className={getStatusColor(complaint.status)}>{complaint.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Resident</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {complaint.resident?.first_name} {complaint.resident?.last_name}
                  </dd>
                  <dd className="text-xs text-gray-500">{complaint.resident?.contact_number}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.location || "—"}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Submitted</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(complaint.created_at)}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Incident Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {complaint.date_of_incident ? `${formatDate(complaint.date_of_incident)}${complaint.time_of_incident ? ` at ${complaint.time_of_incident}` : ""}` : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{complaint.description}</dd>
              </div>
              {complaint.resolution && (
                <div className="mt-4 rounded-lg bg-green-50 p-3">
                  <dt className="text-xs text-green-600">Resolution</dt>
                  <dd className="mt-1 text-sm text-green-800">{complaint.resolution}</dd>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Resolution (for resolve/close)</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Enter resolution details..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={["submitted", "under_review", "investigating", "rejected"].includes(s) ? "outline" : "default"}
                    size="sm"
                    onClick={() => updateStatus(s)}
                    disabled={processing || s === complaint.status}
                  >
                    {processing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    {s.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComplaintDetail />
    </Suspense>
  );
}
