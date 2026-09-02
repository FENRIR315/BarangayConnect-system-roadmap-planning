"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { complaintSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComplaintForm = z.infer<typeof complaintSchema>;

export default function NewComplaintPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [types, setTypes] = useState<any[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [{ data: t }, { data: resident }] = await Promise.all([
        supabase.from("complaint_types").select("*").eq("is_active", true),
        supabase.from("residents").select("id").eq("user_id", user.id).single(),
      ]);
      setTypes(t ?? []);
      setResidentId(resident?.id ?? null);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const onSubmit = async (data: ComplaintForm) => {
    setError(null);
    setLoading(true);
    if (!residentId) {
      setError("No resident profile found.");
      setLoading(false);
      return;
    }

    const { count } = await supabase.from("complaints").select("id", { count: "exact", head: true });
    const complaintNumber = `CMP-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert({
        complaint_number: complaintNumber,
        resident_id: residentId,
        complaint_type_id: data.complaint_type_id,
        description: data.description,
        location: data.location || null,
        date_of_incident: data.date_of_incident || null,
        time_of_incident: data.time_of_incident || null,
        status: "submitted",
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to submit complaint. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/resident/complaints");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/resident/complaints">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File a Complaint</h1>
          <p className="text-sm text-gray-500">Submit a complaint to the barangay</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Complaint Type *</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("complaint_type_id")}>
                  <option value="">Select type</option>
                  {types.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.complaint_type_id && <p className="text-sm text-red-600">{errors.complaint_type_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Please describe the complaint in detail..."
                  {...register("description")}
                />
                {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Where did this happen?" {...register("location")} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date of Incident</Label>
                  <Input type="date" {...register("date_of_incident")} />
                </div>
                <div className="space-y-2">
                  <Label>Time of Incident</Label>
                  <Input type="time" {...register("time_of_incident")} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/resident/complaints">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
