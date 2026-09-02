"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatDate } from "@/lib/utils";

function AppointmentDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchAppt = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, resident:residents(first_name, middle_name, last_name, suffix, contact_number, address), service:appointment_services(name, duration_minutes)")
        .eq("id", params.id)
        .single();
      setAppt(data);
      setLoading(false);
    };
    fetchAppt();
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setProcessing(true);
    const oldStatus = appt.status;
    const { data, error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      alert("Unable to update appointment.");
      setProcessing(false);
      return;
    }

    if (oldStatus !== newStatus && appt.resident?.id) {
      const { data: resident } = await supabase
        .from("residents")
        .select("user_id")
        .eq("id", appt.resident_id)
        .single();

      if (resident?.user_id) {
        await supabase.from("notifications").insert({
          user_id: resident.user_id,
          title: `Appointment ${newStatus.replace(/_/g, " ")}`,
          message: `Your appointment for ${appt.service?.name} on ${formatDate(appt.scheduled_date)} is now ${newStatus.replace(/_/g, " ")}.`,
          type: "appointment",
          link: "/resident/appointments",
        });
      }
    }

    await supabase.from("audit_logs").insert({
      action: `appointment_${newStatus}`,
      module: "appointments",
      record_id: params.id,
      old_values: { status: oldStatus },
      new_values: { status: newStatus },
    });

    setAppt(data);
    setProcessing(false);
    router.refresh();
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /></div>;
  }

  if (!appt) {
    return <div className="py-12 text-center text-gray-500">Appointment not found.</div>;
  }

  const actions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "no_show", "cancelled"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const availableActions = actions[appt.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/appointments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{appt.appointment_number}</h1>
          <p className="text-sm text-gray-500">{appt.service?.name}</p>
        </div>
        <Badge className={getStatusColor(appt.status)}>{appt.status.replace(/_/g, " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Resident</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {appt.resident?.first_name} {appt.resident?.last_name}
              </dd>
              <dd className="text-xs text-gray-500">{appt.resident?.contact_number}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Service</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{appt.service?.name}</dd>
              <dd className="text-xs text-gray-500">{appt.service?.duration_minutes} min duration</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Scheduled</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(appt.scheduled_date)} at {appt.scheduled_time}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Location</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{appt.resident?.address || "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <dt className="text-xs text-gray-500">Purpose</dt>
            <dd className="mt-1 text-sm text-gray-900">{appt.purpose}</dd>
          </div>
        </CardContent>
      </Card>

      {availableActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <Button
                key={action}
                variant={action === "cancelled" ? "destructive" : "default"}
                onClick={() => updateStatus(action)}
                disabled={processing}
              >
                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {action.replace(/_/g, " ")}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentDetail />
    </Suspense>
  );
}
