"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Save, Loader2, UserX, Undo2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { residentSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatDate, calculateAge } from "@/lib/utils";
import { Puroks } from "@/constants";

type ResidentForm = z.infer<typeof residentSchema>;

function ResidentView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";
  const [resident, setResident] = useState<any>(null);
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<ResidentForm>({
    resolver: zodResolver(residentSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: res } = await supabase
        .from("residents")
        .select("*")
        .eq("id", params.id)
        .single();

      const { data: hh } = await supabase.from("households").select("*").eq("status", "active");

      setResident(res);
      setHouseholds(hh ?? []);

      if (res) {
        form.reset({
          first_name: res.first_name,
          middle_name: res.middle_name,
          last_name: res.last_name,
          suffix: res.suffix,
          dob: res.dob,
          sex: res.sex,
          civil_status: res.civil_status,
          address: res.address,
          purok: res.purok,
          contact_number: res.contact_number,
          email: res.email,
          occupation: res.occupation,
          voter_status: res.voter_status,
          residency_status: res.residency_status,
          household_id: res.household_id,
          emergency_contact_name: res.emergency_contact_name,
          emergency_contact_phone: res.emergency_contact_phone,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  const handleSave = async (data: ResidentForm) => {
    setSaving(true);
    setError(null);
    const oldValues = { ...resident };

    const { data: updated, error: updateError } = await supabase
      .from("residents")
      .update({
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        suffix: data.suffix || null,
        dob: data.dob,
        sex: data.sex,
        civil_status: data.civil_status,
        address: data.address,
        purok: data.purok,
        contact_number: data.contact_number || null,
        email: data.email || null,
        occupation: data.occupation || null,
        voter_status: data.voter_status || null,
        residency_status: data.residency_status || "active",
        household_id: data.household_id || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      setError("Unable to update resident. Please try again.");
      setSaving(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "resident_updated",
      module: "residents",
      record_id: params.id,
      old_values: oldValues,
      new_values: data as Record<string, unknown>,
    });

    setResident(updated);
    setSaving(false);
    router.push(`/admin/residents/${params.id}`);
    router.refresh();
  };

  const handleDeactivate = async () => {
    if (!confirm("Deactivate this resident? They will no longer appear as active.")) return;
    await supabase.from("residents").update({ status: "deactivated" }).eq("id", params.id);
    await supabase.from("audit_logs").insert({
      action: "resident_deactivated",
      module: "residents",
      record_id: params.id,
    });
    router.refresh();
    window.location.reload();
  };

  const handleReactivate = async () => {
    await supabase.from("residents").update({ status: "active" }).eq("id", params.id);
    router.refresh();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!resident) {
    return <div className="py-12 text-center text-gray-500">Resident not found.</div>;
  }

  const age = calculateAge(resident.dob);

  const infoItems = [
    { label: "Date of Birth", value: formatDate(resident.dob) },
    { label: "Age", value: `${age} years old` },
    { label: "Sex", value: resident.sex },
    { label: "Civil Status", value: resident.civil_status },
    { label: "Occupation", value: resident.occupation || "—" },
    { label: "Voter Status", value: resident.voter_status || "—" },
    { label: "Residency", value: resident.residency_status },
    { label: "Contact Number", value: resident.contact_number || "—" },
    { label: "Email", value: resident.email || "—" },
    { label: "Registered", value: formatDate(resident.date_registered) },
    { label: "Emergency Contact", value: resident.emergency_contact_name || "—" },
    { label: "Emergency Phone", value: resident.emergency_contact_phone || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/residents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {resident.first_name} {resident.middle_name ? `${resident.middle_name[0]}. ` : ""}
                {resident.last_name}{resident.suffix ? ` ${resident.suffix}` : ""}
              </h1>
            </div>
            <p className="text-sm text-gray-500">{resident.address}, {resident.purok}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => router.push(`?edit=1`)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              {resident.status === "active" ? (
                <Button variant="destructive" onClick={handleDeactivate}>
                  <UserX className="mr-2 h-4 w-4" /> Deactivate
                </Button>
              ) : (
                <Button variant="outline" onClick={handleReactivate}>
                  <Undo2 className="mr-2 h-4 w-4" /> Reactivate
                </Button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => router.push(`/admin/residents/${params.id}`)}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSave)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600">
              {resident.first_name[0]}{resident.last_name[0]}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {resident.first_name} {resident.last_name}
            </h2>
            <p className="text-sm text-gray-500">{resident.purok}</p>
            <div className="mt-4">
              <Badge className={getStatusColor(resident.status)}>{resident.status}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <form>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input {...form.register("first_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Middle Name</Label>
                        <Input {...form.register("middle_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input {...form.register("last_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Suffix</Label>
                        <Input {...form.register("suffix")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Date of Birth *</Label>
                        <Input type="date" {...form.register("dob")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sex *</Label>
                        <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("sex")}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Civil Status *</Label>
                        <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("civil_status")}>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="widowed">Widowed</option>
                          <option value="separated">Separated</option>
                          <option value="divorced">Divorced</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Address *</Label>
                        <Input {...form.register("address")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Purok *</Label>
                        <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("purok")}>
                          {Puroks.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input {...form.register("contact_number")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" {...form.register("email")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input {...form.register("occupation")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Voter Status</Label>
                        <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("voter_status")}>
                          <option value="">Select</option>
                          <option value="registered">Registered</option>
                          <option value="unregistered">Unregistered</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Household</Label>
                        <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("household_id")}>
                          <option value="">None</option>
                          {households.map((h: any) => (
                            <option key={h.id} value={h.id}>{h.household_number}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Emergency Contact</Label>
                        <Input {...form.register("emergency_contact_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency Phone</Label>
                        <Input {...form.register("emergency_contact_phone")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Resident Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {infoItems.map((item) => (
                    <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                      <dt className="text-xs font-medium text-gray-500">{item.label}</dt>
                      <dd className="mt-1 text-sm capitalize text-gray-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResidentDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResidentView />
    </Suspense>
  );
}
