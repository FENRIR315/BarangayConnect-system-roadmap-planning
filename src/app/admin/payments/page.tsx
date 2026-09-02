"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("payments")
        .select("*, resident:residents(first_name, last_name), request:document_requests(request_number)")
        .order("payment_date", { ascending: false })
        .limit(100);

      setPayments(data ?? []);
      setTotal((data ?? []).length);
      setLoading(false);
    };

    fetchPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Track barangay payment transactions</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Payment Records</CardTitle>
          <span className="text-sm text-gray-500">{total} records</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="h-6 w-6" />}
              title="No payments recorded"
              description="Payments will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-gray-900">{p.receipt_number}</TableCell>
                    <TableCell>{p.resident?.first_name} {p.resident?.last_name}</TableCell>
                    <TableCell>{p.request?.request_number ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="capitalize">{p.payment_method}</TableCell>
                    <TableCell><Badge>Recorded</Badge></TableCell>
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
