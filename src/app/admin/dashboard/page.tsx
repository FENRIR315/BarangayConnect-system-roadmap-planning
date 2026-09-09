"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Home,
  FileText,
  Calendar,
  AlertTriangle,
  Shield,
  ArrowRight,
  UserPlus,
  FilePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatDate } from "@/lib/utils";

interface Stats {
  totalResidents: number;
  totalHouseholds: number;
  pendingRequests: number;
  todaysAppointments: number;
  pendingComplaints: number;
  openIncidents: number;
}

const COLORS = ["#2563eb", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#f97316", "#06b6d4"];

export default function AdminDashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [populationByPurok, setPopulationByPurok] = useState<any[]>([]);
  const [sexDistribution, setSexDistribution] = useState<any[]>([]);
  const [ageGroups, setAgeGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      const [
        residentsRes,
        householdsRes,
        pendingReqRes,
        appointmentsRes,
        complaintsRes,
        incidentsRes,
        recentReqRes,
        populationRes,
      ] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("households").select("id", { count: "exact", head: true }),
        supabase.from("document_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("scheduled_date", new Date().toISOString().split("T")[0]),
        supabase.from("complaints").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "investigating"]),
        supabase.from("incidents").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
        supabase.from("document_requests")
          .select("*, resident:residents(first_name, last_name), document_type:document_types(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("residents").select("dob, sex, purok"),
      ]);

      setStats({
        totalResidents: residentsRes.count ?? 0,
        totalHouseholds: householdsRes.count ?? 0,
        pendingRequests: pendingReqRes.count ?? 0,
        todaysAppointments: appointmentsRes.count ?? 0,
        pendingComplaints: complaintsRes.count ?? 0,
        openIncidents: incidentsRes.count ?? 0,
      });

      setRecentRequests(recentReqRes.data ?? []);

      const residents = populationRes.data ?? [];
      const age = (dob: string) => {
        const d = new Date(dob);
        const now = new Date();
        let years = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
        return years;
      };

      const ageGroups = [
        { name: "0-17", value: 0 },
        { name: "18-35", value: 0 },
        { name: "36-60", value: 0 },
        { name: "61+", value: 0 },
      ];
      const purokMap: Record<string, number> = {};
      const sexMap: Record<"male" | "female", number> = { male: 0, female: 0 };

      residents.forEach((r: any) => {
        const a = r.dob ? age(r.dob) : 0;
        if (a < 18) ageGroups[0].value++;
        else if (a <= 35) ageGroups[1].value++;
        else if (a <= 60) ageGroups[2].value++;
        else ageGroups[3].value++;

        const s: "male" | "female" = r.sex === "male" ? "male" : "female";
        sexMap[s]++;

        const p = r.purok || "Unassigned";
        purokMap[p] = (purokMap[p] ?? 0) + 1;
      });

      setAgeGroups(ageGroups);
      setSexDistribution(Object.entries(sexMap).map(([sex, count]) => ({ name: sex === "male" ? "Male" : "Female", count })));
      setPopulationByPurok(
        Object.entries(purokMap)
          .map(([purok, count]) => ({ purok, count }))
          .sort((a, b) => b.count - a.count)
      );

      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Residents", value: stats?.totalResidents, icon: Users, href: "/admin/residents", color: "bg-blue-50 text-blue-600" },
    { title: "Total Households", value: stats?.totalHouseholds, icon: Home, href: "/admin/households", color: "bg-green-50 text-green-600" },
    { title: "Pending Documents", value: stats?.pendingRequests, icon: FileText, href: "/admin/documents", color: "bg-yellow-50 text-yellow-600" },
    { title: "Today's Appointments", value: stats?.todaysAppointments, icon: Calendar, href: "/admin/appointments", color: "bg-purple-50 text-purple-600" },
    { title: "Pending Complaints", value: stats?.pendingComplaints, icon: AlertTriangle, href: "/admin/complaints", color: "bg-red-50 text-red-600" },
    { title: "Open Incidents", value: stats?.openIncidents, icon: Shield, href: "/admin/incidents", color: "bg-orange-50 text-orange-600" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.first_name}
          </h1>
          <p className="text-sm text-gray-500">Here&apos;s what&apos;s happening in your barangay today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/residents/create">
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Add Resident
            </Button>
          </Link>
          <Link href="/admin/documents/requests">
            <Button size="sm" variant="outline">
              <FilePlus className="mr-2 h-4 w-4" /> View Requests
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value ?? 0}</p>
                <p className="text-sm text-gray-500">{card.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Population by Age Group</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageGroups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Male / Female Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sexDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {sexDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Population by Purok</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={populationByPurok} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="purok" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Document Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No document requests yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.resident?.first_name} {req.resident?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{req.document_type?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                        {req.status.replace(/_/g, " ")}
                      </span>
                      <p className="mt-1 text-xs text-gray-400">{formatDate(req.created_at)}</p>
                    </div>
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
