"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportExcelButton, PrintReportButton } from "@/components/export-buttons";
import { PEOPLE } from "@/lib/export/definitions";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  captain: "Barangay Captain",
  secretary: "Barangay Secretary",
  treasurer: "Barangay Treasurer",
  kagawad: "Kagawad",
  staff: "Barangay Staff",
};

const roleOrder = ["captain", "secretary", "treasurer", "kagawad", "staff"];

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfficials = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("officials")
        .select("*, resident:residents(first_name, middle_name, last_name, suffix)")
        .eq("is_active", true);

      const sorted = (data ?? []).sort((a, b) => {
        const ra = roleOrder.indexOf(a.position) === -1 ? 99 : roleOrder.indexOf(a.position);
        const rb = roleOrder.indexOf(b.position) === -1 ? 99 : roleOrder.indexOf(b.position);
        return ra - rb;
      });

      setOfficials(sorted);
      setLoading(false);
    };

    fetchOfficials();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barangay Officials</h1>
          <p className="text-sm text-gray-500">Current elected and appointed officials</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton definition={PEOPLE.officials} />
          <PrintReportButton definition={PEOPLE.officials} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : officials.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10">
              <EmptyState
                icon={<Crown className="h-6 w-6" />}
                title="No officials registered"
                description="Officials will appear here when registered."
              />
            </CardContent>
          </Card>
        ) : (
          officials.map((o) => {
            const name = `${o.resident?.first_name} ${o.resident?.middle_name ? o.resident.middle_name[0] + "." : ""} ${o.resident?.last_name}${o.resident?.suffix ? " " + o.resident.suffix : ""}`;
            return (
              <Card key={o.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
                      <p className="mt-1 text-sm font-medium capitalize text-blue-600">
                        {roleLabels[o.position] || o.position}
                      </p>
                    </div>
                    <Badge>{o.term_start ? `${o.term_start}–${o.term_end ?? "present"}` : "Current term"}</Badge>
                  </div>
                  {o.committee && (
                    <p className="mt-3 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">Committee:</span> {o.committee}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
