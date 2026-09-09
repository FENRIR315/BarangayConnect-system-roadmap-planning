"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Plus } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportExcelButton, PrintReportButton } from "@/components/export-buttons";
import { PEOPLE } from "@/lib/export/definitions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getStatusColor, formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES = ["open", "investigating", "resolved", "closed"];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("incidents")
        .select("*, incident_type:incident_types(name)", { count: "exact" })
        .order("date", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (status) query = query.eq("status", status);

      const { data, count } = await query;

      setIncidents(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    fetchIncidents();
  }, [status, page]);

  const navigate = (href: string) => {
    window.location.href = href;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500">Manage barangay incidents</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton definition={PEOPLE.incidents} />
          <PrintReportButton definition={PEOPLE.incidents} />
          <Link href="/admin/incidents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Report Incident
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <select
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Incident List</CardTitle>
          <span className="text-sm text-gray-500">{total} incidents</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-6 w-6" />}
              title="No incidents reported"
              description="Incidents will appear here when reported."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium text-gray-900">{inc.incident_number}</TableCell>
                      <TableCell>{inc.incident_type?.name}</TableCell>
                      <TableCell>{inc.location}</TableCell>
                      <TableCell>{formatDate(inc.date)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(inc.status)}>{inc.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/incidents/${inc.id}`)}>
                          View
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
