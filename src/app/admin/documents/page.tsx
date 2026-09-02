"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, CheckCircle2, XCircle, FileCheck } from "lucide-react";
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
import { formatDate, getStatusColor } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "ready_for_release",
  "released",
  "rejected",
  "cancelled",
];

export default function DocumentsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("document_requests")
        .select(
          "*, resident:residents(first_name, middle_name, last_name, suffix), document_type:document_types(name, fee)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) {
        query = query
          .or(`request_number.ilike.%${search}%,resident_id.ilike.%${search}%`)
          .ilike("resident.first_name", `%${search}%`)
          .ilike("resident.last_name", `%${search}%`);
      }

      if (status) query = query.eq("status", status);

      const { data, count } = await query;

      setRequests(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    const delay = setTimeout(fetchRequests, 300);
    return () => clearTimeout(delay);
  }, [search, status, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Requests</h1>
          <p className="text-sm text-gray-500">Review and process resident document requests</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by request number..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Requests</CardTitle>
          <span className="text-sm text-gray-500">{total} requests</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No document requests"
              description="Requests will appear here when residents submit them."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-gray-900">{req.request_number}</TableCell>
                      <TableCell>
                        {req.resident?.first_name} {req.resident?.last_name}
                      </TableCell>
                      <TableCell>{req.document_type?.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                      <TableCell className="text-sm">{formatDate(req.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        ₱{req.document_type?.fee?.toLocaleString() ?? "0"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.payment_status)}>
                          {req.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.status)}>
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/documents/requests/${req.id}`)}>
                          Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={Math.ceil(total / PAGE_SIZE)}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
