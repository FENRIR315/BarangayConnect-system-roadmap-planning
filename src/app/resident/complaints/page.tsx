"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
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

export default function ResidentComplaintsPage() {
  const { user } = useAuth();
  const [residentId, setResidentId] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchComplaints = async () => {
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
          .from("complaints")
          .select("*, complaint_type:complaint_types(name)")
          .eq("resident_id", resId)
          .order("created_at", { ascending: false });

        setComplaints(data ?? []);
      }
      setLoading(false);
    };

    fetchComplaints();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
          <p className="text-sm text-gray-500">Track the status of your complaints</p>
        </div>
        <Link href="/resident/complaints/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> File Complaint
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="No complaints filed"
              description="If you have a concern, file a complaint with the barangay."
              action={
                <Link href="/resident/complaints/new">
                  <Button>File a complaint</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complaint #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Filed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-gray-900">{c.complaint_number}</TableCell>
                    <TableCell>{c.complaint_type?.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
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
