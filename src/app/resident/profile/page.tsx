"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { residentSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatDate, calculateAge } from "@/lib/utils";
import { Puroks } from "@/constants";

type ProfileForm = z.infer<typeof residentSchema>;

export default function ResidentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<ProfileForm>();

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("residents")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(data);
      if (data) {
        form.reset({
          first_name: data.first_name,
          middle_name: data.middle_name,
          last_name: data.last_name,
          suffix: data.suffix,
          dob: data.dob,
          sex: data.sex,
          civil_status: data.civil_status,
          address: data.address,
          purok: data.purok,
          contact_number: data.contact_number,
          email: data.email || user.email,
          occupation: data.occupation,
          voter_status: data.voter_status,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
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
        occupation: data.occupation || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
      })
      .eq("user_id", user!.id);

    setSaving(false);
    if (updateError) {
      setError("Unable to update profile. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /></div>;
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Profile not found</h1>
        <p className="mt-1 text-sm text-gray-500">
          Please contact the barangay office to link your resident profile.
        </p>
      </div>
    );
  }

  const age = calculateAge(profile.dob);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Update your personal information</p>
        </div>
        {saved && <Badge variant="success">Saved</Badge>}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600">
              {profile.first_name[0]}{profile.last_name[0]}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-sm text-gray-500">{profile.purok}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge className={getStatusColor(profile.residency_status)}>
                {profile.residency_status}
              </Badge>
              <Badge variant="outline">{age} years old</Badge>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-500">
              <p>Registered: {formatDate(profile.date_registered)}</p>
              <p>Household: {profile.household_id ? "Assigned" : "Not assigned"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" disabled {...form.register("dob")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm disabled:opacity-50" disabled {...form.register("sex")}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Civil Status</Label>
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
                    <Label>Address</Label>
                    <Input {...form.register("address")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Purok</Label>
                    <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...form.register("purok")}>
                      {Puroks.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input {...form.register("contact_number")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input {...form.register("occupation")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" disabled {...form.register("email")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Emergency Contact Name</Label>
                    <Input {...form.register("emergency_contact_name")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone</Label>
                    <Input {...form.register("emergency_contact_phone")} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
