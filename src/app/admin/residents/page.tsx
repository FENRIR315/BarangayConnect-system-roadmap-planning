"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Users,
  Filter,
  UserPlus,
  Eye,
  Pencil,
  UserX,
} from "lucide-react";
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
import { ExportExcelButton, PrintReportButton } from "@/components/export-buttons";
import { PEOPLE } from "@/lib/export/definitions";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, getStatusColor } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function ResidentsPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [purok, setPurok] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [puroks, setPuroks] = useState<string[]>([]);

  useEffect(() => {
    const fetchPuroks = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("residents").select("purok").order("purok");
      setPuroks([...new Set((data ?? []).map((r: any) => r.purok))] as string[]);
    };
    fetchPuroks();
  }, []);

  useEffect(() => {
    const fetchResidents = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("residents")
        .select(
          "id, first_name, middle_name, last_name, suffix, sex, dob, purok, address, contact_number, email, voter_status, residency_status, status, household_id",
          { count: "exact" }
        )
        .order("last_name", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,contact_number.ilike.%${search}%`
        );
      }

      if (purok) query = query.eq("purok", purok);
      if (status) query = query.eq("status", status);

      const { data, count } = await query;

      setResidents(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    const delay = setTimeout(fetchResidents, 300);
    return () => clearTimeout(delay);
  }, [search, purok, status, page]);

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this resident?")) return;
    const supabase = createClient();
    await supabase.from("residents").update({ status: "deactivated" }).eq("id", id);
    router.refresh();
    window.location.reload();
  };

  const resetFilters = () => {
    setSearch("");
    setPurok("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <p className="text-sm text-gray-500">Manage all barangay residents</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton definition={PEOPLE.residents} />
          <PrintReportButton definition={PEOPLE.residents} />
          <Link href="/admin/residents/create">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Resident
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, contact..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={purok}
              onChange={(e) => {
                setPurok(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Puroks</option>
              {puroks.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Resident List</CardTitle>
          <span className="text-sm text-gray-500">{total} residents</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : residents.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No residents found"
              description="Try adjusting your search or filters."
              action={
                <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Purok</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Voter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residents.map((resident) => (
                    <TableRow key={resident.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {resident.first_name} {resident.middle_name ? `${resident.middle_name[0]}. ` : ""}
                            {resident.last_name}
                            {resident.suffix ? ` ${resident.suffix}` : ""}
                          </p>
                          <p className="text-xs text-gray-500">{resident.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resident.purok}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{resident.contact_number || "—"}</p>
                        <p className="text-xs text-gray-500 capitalize">{resident.sex}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize text-gray-600">
                          {resident.voter_status || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(resident.status)}>
                          {resident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/residents/${resident.id}`}>
                            <Button variant="ghost" size="icon" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" title="Edit"
                            onClick={() => router.push(`/admin/residents/${resident.id}?edit=1`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {resident.status === "active" && (
                            <Button variant="ghost" size="icon" title="Deactivate"
                              onClick={() => handleDeactivate(resident.id)}
                            >
                              <UserX className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
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
