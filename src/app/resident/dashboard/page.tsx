"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  AlertTriangle,
  Megaphone,
  Bell,
  ArrowRight,
  FilePlus,
  CalendarPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  residentId: string | null;
  requestsCount: number;
  upcomingAppointments: any[];
  myComplaints: any[];
  announcements: any[];
  unreadNotifications: number;
}

export default function ResidentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const supabase = createClient();

      const { data: resident } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const residentId = resident?.id ?? null;

      const [requestsRes, appointmentsRes, complaintsRes, announcementsRes, notifRes] =
        await Promise.all([
          supabase
            .from("document_requests")
            .select("id, status, request_number, document_type:document_types(name), created_at")
            .eq("resident_id", residentId ?? "")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("appointments")
            .select("id, appointment_number, scheduled_date, scheduled_time, status, service:appointment_services(name)")
            .eq("resident_id", residentId ?? "")
            .gte("scheduled_date", new Date().toISOString().split("T")[0])
            .order("scheduled_date", { ascending: true })
            .limit(3),
          supabase
            .from("complaints")
            .select("id, complaint_number, status, complaint_type:complaint_types(name), created_at")
            .eq("resident_id", residentId ?? "")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("announcements")
            .select("id, title, category, published_date")
            .eq("status", "published")
            .or(`expiry_date.is.null,expiry_date.gte.${new Date().toISOString()}`)
            .order("published_date", { ascending: false })
            .limit(4),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
        ]);

      setData({
        residentId,
        requestsCount: requestsRes.data?.length ?? 0,
        upcomingAppointments: appointmentsRes.data ?? [],
        myComplaints: complaintsRes.data ?? [],
        announcements: announcementsRes.data ?? [],
        unreadNotifications: notifRes.count ?? 0,
      });
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to your resident portal</h1>
          <p className="text-sm text-gray-500">View your documents, appointments, and announcements.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/resident/documents/new">
            <Button size="sm">
              <FilePlus className="mr-2 h-4 w-4" /> Request Document
            </Button>
          </Link>
          <Link href="/resident/appointments/new">
            <Button size="sm" variant="outline">
              <CalendarPlus className="mr-2 h-4 w-4" /> Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/resident/documents">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.requestsCount}</p>
                <p className="text-sm text-gray-500">Document Requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/resident/notifications">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-50">
                <Bell className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.unreadNotifications}</p>
                <p className="text-sm text-gray-500">Unread Notifications</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/resident/complaints/new">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Submit a complaint</p>
                <p className="text-xs text-gray-500">File a complaint with the barangay</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link href="/resident/appointments" className="flex items-center text-sm text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No upcoming appointments</div>
            ) : (
              <div className="space-y-4">
                {data.upcomingAppointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appt.service?.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(appt.scheduled_date).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} at {appt.scheduled_time}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Announcements</CardTitle>
            <Link href="/resident/announcements" className="flex items-center text-sm text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.announcements.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No announcements</div>
            ) : (
              <div className="space-y-4">
                {data.announcements.map((ann: any) => (
                  <Link key={ann.id} href="/resident/announcements" className="block">
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <Megaphone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ann.title}</p>
                          <p className="text-xs capitalize text-gray-500">{ann.category}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My complaints */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Complaints</CardTitle>
            <Link href="/resident/complaints" className="flex items-center text-sm text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.myComplaints.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No complaints submitted</div>
            ) : (
              <div className="space-y-3">
                {data.myComplaints.map((complaint: any) => (
                  <div key={complaint.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{complaint.complaint_type?.name}</p>
                      <p className="text-xs text-gray-500">{complaint.complaint_number}</p>
                    </div>
                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium capitalize text-yellow-700">
                      {complaint.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
