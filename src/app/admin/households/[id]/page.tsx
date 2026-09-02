"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatCurrency } from "@/lib/utils";

export default function HouseholdDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availableResidents, setAvailableResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    const { data: hh } = await supabase
      .from("households")
      .select("*, household_head:household_head_id(id, first_name, last_name)")
      .eq("id", params.id)
      .single();

    const { data: m } = await supabase
      .from("household_members")
      .select("*, resident:resident_id(id, first_name, middle_name, last_name, suffix, dob, sex)")
      .eq("household_id", params.id);

    const { data: avail } = await supabase
      .from("residents")
      .select("id, first_name, last_name")
      .or(`household_id.is.null,household_id.neq.${params.id}`)
      .eq("residency_status", "active");

    setHousehold(hh);
    setMembers(m ?? []);
    setAvailableResidents(avail ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const addMember = async (residentId: string) => {
    setAdding(true);
    const { error } = await supabase.from("household_members").insert({
      household_id: params.id,
      resident_id: residentId,
      relationship: "member",
    });

    if (!error) {
      await supabase.from("residents").update({ household_id: params.id }).eq("id", residentId);
      await supabase.from("audit_logs").insert({
        action: "household_member_added",
        module: "households",
        record_id: params.id,
      });
    }

    setShowAdd(false);
    fetchData();
    setAdding(false);
  };

  const removeMember = async (memberId: string, residentId: string) => {
    const { error } = await supabase.from("household_members").delete().eq("id", memberId);
    if (!error) {
      await supabase.from("residents").update({ household_id: null }).eq("id", residentId);
      fetchData();
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  }

  if (!household) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Household not found</h1>
        <Link href="/admin/households" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Back to households</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/households">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{household.household_number}</h1>
          <p className="text-sm text-gray-500">{household.address} · {household.purok}</p>
        </div>
        <Badge className={getStatusColor(household.status)}>{household.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Household Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Head of Household</Label>
            <p className="mt-1 text-sm text-gray-700">
              {household.household_head ? `${household.household_head.first_name} ${household.household_head.last_name}` : "Not set"}
            </p>
          </div>
          <div>
            <Label>Monthly Income</Label>
            <p className="mt-1 text-sm text-gray-700">{household.monthly_income ? formatCurrency(Number(household.monthly_income)) : "—"}</p>
          </div>
          <div>
            <Label>House Ownership</Label>
            <p className="mt-1 text-sm text-gray-700 capitalize">{household.house_ownership?.replace(/_/g, " ") || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Household Members ({members.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {showAdd && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Label>Select resident</Label>
              <div className="mt-2 flex gap-2">
                <select className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm" id="add-member">
                  {availableResidents.map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
                <Button disabled={adding} onClick={() => {
                  const sel = (document.getElementById("add-member") as HTMLSelectElement).value;
                  if (sel) addMember(sel);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          )}

          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No members in this household yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.resident?.first_name} {m.resident?.last_name}
                    </p>
                    <p className="text-xs capitalize text-gray-500">{m.relationship}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMember(m.id, m.resident_id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
