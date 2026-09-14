"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface AccountRow {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "captain", label: "Captain" },
  { value: "staff", label: "Staff" },
  { value: "resident", label: "Resident" },
];

export default function AccountsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<Record<string, { ok: boolean; msg: string } | undefined>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) return;
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("id, email, role, first_name, last_name")
        .order("created_at", { ascending: true });
      const list = (data ?? []) as AccountRow[];
      setRows(list);
      setDraft(Object.fromEntries(list.map((r) => [r.id, r.role])));
      setLoading(false);
    };
    load();
  }, [authLoading, profile]);

  const changeRole = useCallback(async (targetId: string) => {
    if (!draft[targetId]) return;
    setBusy((b) => ({ ...b, [targetId]: true }));
    setNotice((n) => ({ ...n, [targetId]: undefined }));
    try {
      const res = await fetch("/api/local/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-role", target_id: targetId, role: draft[targetId] }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setNotice((n) => ({ ...n, [targetId]: { ok: false, msg: json.error?.message ?? "Failed to change role" } }));
      } else {
        setRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, role: draft[targetId] } : r)));
        setNotice((n) => ({ ...n, [targetId]: { ok: true, msg: "Role updated. Their session has been reset." } }));
      }
    } catch {
      setNotice((n) => ({ ...n, [targetId]: { ok: false, msg: "Failed to change role" } }));
    } finally {
      setBusy((b) => ({ ...b, [targetId]: false }));
    }
  }, [draft]);

  if (authLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </CardContent>
      </Card>
    );
  }

  if (!profile || profile.role !== "captain") {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-sm font-medium text-gray-500">
            Only the barangay captain can manage account roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="text-sm text-gray-500">
          Change staff and resident roles. Changing a role signs that account out immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<User className="h-6 w-6" />}
              title="No accounts yet"
              description="Accounts appear here once residents or staff are registered."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isSelf = profile.id === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-gray-900">
                        {row.first_name} {row.last_name} {isSelf && <Badge className="ml-2">you</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{row.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={draft[row.id] ?? row.role}
                            onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={busy[row.id] || draft[row.id] === row.role}
                            onClick={() => changeRole(row.id)}
                          >
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                            Apply
                          </Button>
                          {notice[row.id] && (
                            <span
                              className={`text-xs ${notice[row.id]!.ok ? "text-green-600" : "text-red-600"}`}
                            >
                              {notice[row.id]!.msg}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}