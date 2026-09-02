"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getStatusColor, formatDate, formatTime } from "@/lib/utils";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchIncident = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*, incident_type:incident_types(name), reporter:users(first_name, last_name)")
        .eq("id", params.id)
        .single();

      setIncident(data);
      setResolution(data?.resolution || "");
      setStatus(data?.status || "");
      setLoading(false);
    };
    fetchIncident();
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("incidents")
      .update({ status: newStatus, resolution: resolution || null })
      .eq("id", params.id);

    if (!error) setStatus(newStatus);
    setSaving(false);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  }

  if (!incident) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Incident not found</h1>
        <Link href="/admin/incidents" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Back to incidents</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/incidents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{incident.incident_number}</h1>
          <p className="text-sm text-gray-500">{incident.incident_type?.name}</p>
        </div>
        <Badge className={getStatusColor(status)}>{status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Incident Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Location</Label>
            <p className="mt-1 text-sm text-gray-700">{incident.location}</p>
          </div>
          <div>
            <Label>Date & Time</Label>
            <p className="mt-1 text-sm text-gray-700">
              {formatDate(incident.date)}{incident.time ? ` at ${formatTime(incident.time)}` : ""}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{incident.description}</p>
          </div>
          {incident.people_involved?.length > 0 && (
            <div className="sm:col-span-2">
              <Label>People Involved</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {incident.people_involved.map((p: string, i: number) => (
                  <Badge key={i} variant="secondary">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {incident.reporter && (
            <div className="sm:col-span-2">
              <Label>Reported By</Label>
              <p className="mt-1 text-sm text-gray-700">{incident.reporter.first_name} {incident.reporter.last_name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manage Incident</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s.value}
                  variant={status === s.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateStatus(s.value)}
                  disabled={saving || status === s.value}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Enter resolution..." rows={4} />
            <div className="flex justify-end">
              <Button onClick={() => updateStatus(status)} disabled={saving}>Save Resolution</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
