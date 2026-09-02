"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, getStatusColor, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("appointments")
        .select("*, resident:residents(first_name, middle_name, last_name, suffix), service:appointment_services(name)", { count: "exact" })
        .order("scheduled_date", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (status) query = query.eq("status", status);
      if (date) query = query.eq("scheduled_date", date);

      const { data, count } = await query;

      setAppointments(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    fetchAppointments();
  }, [status, date, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-sm text-gray-500">Manage resident appointments</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Appointment List</CardTitle>
          <span className="text-sm text-gray-500">{total} appointments</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No appointments found"
              description="Appointments will appear here when residents book them."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment #</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium text-gray-900">{appt.appointment_number}</TableCell>
                      <TableCell>
                        {appt.resident?.first_name} {appt.resident?.last_name}
                      </TableCell>
                      <TableCell>{appt.service?.name}</TableCell>
                      <TableCell>{formatDate(appt.scheduled_date)}</TableCell>
                      <TableCell>{appt.scheduled_time}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appt.status)}>{appt.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/appointments/${appt.id}`)}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
