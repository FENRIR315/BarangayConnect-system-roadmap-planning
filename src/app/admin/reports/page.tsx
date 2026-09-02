"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, FileText, AlertTriangle, Calendar, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      const [residentsData, householdsData, docData, complaintsData, incidentsData, apptsData, paymentsData] =
        await Promise.all([
          supabase.from("residents").select("id", { count: "exact", head: true }),
          supabase.from("households").select("id", { count: "exact", head: true }),
          supabase.from("document_requests").select("id", { count: "exact", head: true }),
          supabase.from("complaints").select("id", { count: "exact", head: true }),
          supabase.from("incidents").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }),
          supabase.from("payments").select("amount"),
        ]);

      const totalPayments = (paymentsData.data ?? []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);

      setStats({
        residents: residentsData.count ?? 0,
        households: householdsData.count ?? 0,
        documents: docData.count ?? 0,
        complaints: complaintsData.count ?? 0,
        incidents: incidentsData.count ?? 0,
        appointments: apptsData.count ?? 0,
        totalPayments,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const groups = [
    { label: "Residents", value: stats?.residents, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Households", value: stats?.households, icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Document Requests", value: stats?.documents, icon: FileText, color: "text-purple-600 bg-purple-50" },
    { label: "Complaints", value: stats?.complaints, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "Incidents", value: stats?.incidents, icon: Shield, color: "text-orange-600 bg-orange-50" },
    { label: "Appointments", value: stats?.appointments, icon: Calendar, color: "text-cyan-600 bg-cyan-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Overview of barangay data</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${g.color}`}>
                    <g.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{g.value}</p>
                    <p className="text-sm text-gray-500">{g.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    ₱{Number(stats?.totalPayments || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total recorded payments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
