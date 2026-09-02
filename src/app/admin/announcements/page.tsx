"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getStatusColor, formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;
const CATEGORIES = ["general", "emergency", "event", "community_program", "meeting", "public_notice"];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("announcements")
        .select("*, author:users(first_name, last_name)", { count: "exact" })
        .order("published_date", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (category) query = query.eq("category", category);

      const { data, count } = await query;

      setAnnouncements(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };

    fetchAnnouncements();
  }, [category, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500">Publish announcements to residents</p>
        </div>
        <Link href="/admin/announcements/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <select className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Announcements</CardTitle>
          <span className="text-sm text-gray-500">{total} announcements</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-6 w-6" />}
              title="No announcements yet"
              description="Publish your first announcement."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link href={`/admin/announcements/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{a.category.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{a.author?.first_name} {a.author?.last_name}</TableCell>
                      <TableCell>{formatDate(a.published_date)}</TableCell>
                      <TableCell>{a.expiry_date ? formatDate(a.expiry_date) : "—"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(a.status)}>{a.status}</Badge>
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
