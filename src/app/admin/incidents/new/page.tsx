"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { incidentSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IncidentForm = z.infer<typeof incidentSchema>;

export default function NewIncidentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
  });

  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase.from("incident_types").select("*");
      setTypes(data ?? []);
      setLoading(false);
    };
    fetchTypes();
  }, []);

  const onSubmit = async (data: IncidentForm) => {
    setError(null);
    setLoading(true);

    const { count } = await supabase.from("incidents").select("id", { count: "exact", head: true });
    const incidentNumber = `INC-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: incident, error: insertError } = await supabase
      .from("incidents")
      .insert({
        incident_number: incidentNumber,
        incident_type_id: data.incident_type_id,
        date: data.date,
        time: data.time || null,
        location: data.location,
        description: data.description,
        status: "open",
        people_involved: data.people_involved?.split(",").map((s) => s.trim()).filter(Boolean) || [],
        reported_by: user?.id,
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to create incident report. Please try again.");
      setLoading(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "incident_created",
      module: "incidents",
      record_id: incident.id,
      new_values: data as Record<string, unknown>,
    });

    setLoading(false);
    router.push("/admin/incidents");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/incidents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report an Incident</h1>
          <p className="text-sm text-gray-500">Create a new incident report</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Incident Type *</Label>
                  <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("incident_type_id")}>
                    <option value="">Select type</option>
                    {types.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {errors.incident_type_id && <p className="text-sm text-red-600">{errors.incident_type_id.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input placeholder="Where did this happen?" {...register("location")} />
                  {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" {...register("date")} />
                  {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" {...register("time")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea placeholder="Describe the incident..." {...register("description")} />
                {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>People Involved (comma separated)</Label>
                <Input placeholder="Juan Dela Cruz, Maria Santos" {...register("people_involved")} />
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/admin/incidents">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Report Incident
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
