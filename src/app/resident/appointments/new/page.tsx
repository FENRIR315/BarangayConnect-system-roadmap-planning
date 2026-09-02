"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Send, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { appointmentSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppointmentForm = z.infer<typeof appointmentSchema>;

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [{ data: svcs }, { data: resident }] = await Promise.all([
        supabase.from("appointment_services").select("*").eq("is_active", true),
        supabase.from("residents").select("id").eq("user_id", user.id).single(),
      ]);

      setServices(svcs ?? []);
      setResidentId(resident?.id ?? null);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const onSubmit = async (data: AppointmentForm) => {
    setError(null);
    setLoading(true);

    if (!residentId) {
      setError("No resident profile found.");
      setLoading(false);
      return;
    }

    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true });

    const appointmentNumber = `APT-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: appt, error: insertError } = await supabase
      .from("appointments")
      .insert({
        appointment_number: appointmentNumber,
        resident_id: residentId,
        service_id: data.service_id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        purpose: data.purpose,
        status: "pending",
        remarks: data.remarks || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to book appointment. This slot may already be booked. Please try another time.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/resident/appointments");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/resident/appointments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-sm text-gray-500">Schedule a visit with barangay services</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="service_id">Service *</Label>
                <select
                  id="service_id"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("service_id")}
                >
                  <option value="">Select service</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.service_id && <p className="text-sm text-red-600">{errors.service_id.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Date *</Label>
                  <Input id="scheduled_date" type="date" min={new Date().toISOString().split("T")[0]} {...register("scheduled_date")} />
                  {errors.scheduled_date && <p className="text-sm text-red-600">{errors.scheduled_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Time *</Label>
                  <Input id="scheduled_time" type="time" {...register("scheduled_time")} />
                  {errors.scheduled_time && <p className="text-sm text-red-600">{errors.scheduled_time.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea id="purpose" placeholder="What do you need help with?" {...register("purpose")} />
                {errors.purpose && <p className="text-sm text-red-600">{errors.purpose.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Textarea id="remarks" {...register("remarks")} />
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/resident/appointments">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Book Appointment
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
