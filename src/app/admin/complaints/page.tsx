"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
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
import { formatDate, getStatusColor } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES = ["submitted", "under_review", "investigating", "resolved", "closed", "rejected"];

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("complaints")
        .select("*, resident:residents(first_name, middle_name, last_name, suffix), complaint_type:complaint_types(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (status) query = query.eq("status", status);

      const { data, count } = await query;

      setComplaints(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    fetchComplaints();
  }, [status, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500">Manage resident complaints</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton definition={PEOPLE.complaints} />
          <PrintReportButton definition={PEOPLE.complaints} />
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Complaint List</CardTitle>
          <span className="text-sm text-gray-500">{total} complaints</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="No complaints found"
              description="Complaints will appear here when residents submit them."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Complaint #</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-gray-900">{c.complaint_number}</TableCell>
                      <TableCell>{c.resident?.first_name} {c.resident?.last_name}</TableCell>
                      <TableCell>{c.complaint_type?.name}</TableCell>
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/complaints/${c.id}`)}>
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
