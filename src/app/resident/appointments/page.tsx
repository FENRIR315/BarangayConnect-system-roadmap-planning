"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Plus, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getStatusColor, formatDate } from "@/lib/utils";

export default function ResidentAppointmentsPage() {
  const { user } = useAuth();
  const [residentId, setResidentId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAppointments = async () => {
      const supabase = createClient();

      const { data: resident } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const resId = resident?.id ?? null;
      setResidentId(resId);

      if (resId) {
        const { data } = await supabase
          .from("appointments")
          .select("*, service:appointment_services(name)")
          .eq("resident_id", resId)
          .order("scheduled_date", { ascending: false });

        setAppointments(data ?? []);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-sm text-gray-500">Schedule appointments with barangay services</p>
        </div>
        <Link href="/resident/appointments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Book Appointment
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="No appointments yet"
              description="Book an appointment with your barangay."
              action={
                <Link href="/resident/appointments/new">
                  <Button>Book appointment</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment #</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium text-gray-900">{appt.appointment_number}</TableCell>
                    <TableCell>{appt.service?.name}</TableCell>
                    <TableCell>{formatDate(appt.scheduled_date)}</TableCell>
                    <TableCell>{appt.scheduled_time}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appt.status)}>{appt.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
