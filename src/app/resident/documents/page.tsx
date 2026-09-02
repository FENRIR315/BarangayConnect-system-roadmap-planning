"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Download, Eye } from "lucide-react";
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
import { formatDate, getStatusColor } from "@/lib/utils";

export default function ResidentDocumentsPage() {
  const { user } = useAuth();
  const [residentId, setResidentId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const supabase = createClient();

      let resId = residentId;
      if (!resId) {
        const { data: resident } = await supabase
          .from("residents")
          .select("id")
          .eq("user_id", user.id)
          .single();
        resId = resident?.id ?? null;
        setResidentId(resId);
      }

      if (!resId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("document_requests")
        .select("*, document_type:document_types(name, fee), document:documents(*)")
        .eq("resident_id", resId)
        .order("created_at", { ascending: false });

      setRequests(data ?? []);
      setLoading(false);
    };

    fetchRequests();
  }, [user, residentId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Document Requests</h1>
          <p className="text-sm text-gray-500">Request barangay documents online</p>
        </div>
        <Link href="/resident/documents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !residentId ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No resident profile found"
              description="Please contact the barangay office to link your resident profile."
            />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No document requests yet"
              description="Request a barangay clearance or certificate online."
              action={
                <Link href="/resident/documents/new">
                  <Button>Request a document</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium text-gray-900">{req.request_number}</TableCell>
                    <TableCell>{req.document_type?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                    <TableCell className="text-sm">{formatDate(req.created_at)}</TableCell>
                    <TableCell className="text-sm">₱{req.document_type?.fee?.toLocaleString() ?? "0"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(req.payment_status)}>{req.payment_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(req.status)}>{req.status.replace(/_/g, " ")}</Badge>
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
