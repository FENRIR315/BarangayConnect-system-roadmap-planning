"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Home, Plus, Trash2, Users as UsersIcon } from "lucide-react";
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
import { ExportExcelButton, PrintReportButton } from "@/components/export-buttons";
import { PEOPLE } from "@/lib/export/definitions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getStatusColor } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function HouseholdsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchHouseholds = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("households")
        .select(
          "*, household_head:household_head_id(id, first_name, middle_name, last_name, suffix), members:household_members(count)",
          { count: "exact" }
        )
        .order("household_number", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) {
        query = query.or(
          `household_number.ilike.%${search}%,address.ilike.%${search}%,purok.ilike.%${search}%`
        );
      }

      const { data, count } = await query;

      setHouseholds(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    const delay = setTimeout(fetchHouseholds, 300);
    return () => clearTimeout(delay);
  }, [search, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Households</h1>
          <p className="text-sm text-gray-500">Manage households and their members</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton definition={PEOPLE.households} />
          <PrintReportButton definition={PEOPLE.households} />
          <Link href="/admin/households/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Household
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by household number, address..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Household List</CardTitle>
          <span className="text-sm text-gray-500">{total} households</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : households.length === 0 ? (
            <EmptyState
              icon={<Home className="h-6 w-6" />}
              title="No households found"
              description="Try adjusting your search."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Household #</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Purok</TableHead>
                    <TableHead>Head of Household</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {households.map((hh) => (
                    <TableRow key={hh.id}>
                      <TableCell className="font-medium text-gray-900">
                        {hh.household_number}
                      </TableCell>
                      <TableCell>{hh.address}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{hh.purok}</Badge>
                      </TableCell>
                      <TableCell>
                        {hh.household_head
                          ? `${hh.household_head.first_name} ${hh.household_head.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
                          {hh.members?.[0]?.count ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(hh.status)}>{hh.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/households/${hh.id}`)}>
                          View
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
