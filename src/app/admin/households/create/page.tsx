"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { householdSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Puroks } from "@/constants";

type HouseholdForm = z.infer<typeof householdSchema>;

export default function CreateHouseholdPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HouseholdForm>({
    resolver: zodResolver(householdSchema),
  });

  useEffect(() => {
    const fetchResidents = async () => {
      const { data } = await supabase
        .from("residents")
        .select("id, first_name, middle_name, last_name, suffix, residency_status")
        .eq("residency_status", "active");
      setResidents(data ?? []);
    };
    fetchResidents();
  }, []);

  const onSubmit = async (data: HouseholdForm) => {
    setError(null);
    setLoading(true);

    const { data: household, error: insertError } = await supabase
      .from("households")
      .insert({
        household_number: data.household_number,
        address: data.address,
        purok: data.purok,
        household_head_id: data.household_head_id || null,
        monthly_income: data.monthly_income || null,
        house_ownership: data.house_ownership || null,
        status: data.status || "active",
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to create household. Please try again.");
      setLoading(false);
      return;
    }

    if (data.household_head_id) {
      await supabase.from("residents").update({ household_id: household.id }).eq("id", data.household_head_id);
    }

    setLoading(false);
    router.push("/admin/households");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/households">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Household</h1>
          <p className="text-sm text-gray-500">Register a new household</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Household Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="household_number">Household Number *</Label>
                <Input id="household_number" placeholder="e.g. H-001" {...register("household_number")} />
                {errors.household_number && <p className="text-sm text-red-600">{errors.household_number.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Purok *</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("purok")}>
                  <option value="">Select purok</option>
                  {Puroks.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.purok && <p className="text-sm text-red-600">{errors.purok.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" placeholder="Complete address" {...register("address")} />
              {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Head of Household</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("household_head_id")}>
                  <option value="">Select resident</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Income</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("monthly_income", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>House Ownership</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("house_ownership")}>
                  <option value="">Select</option>
                  <option value="owned">Owned</option>
                  <option value="rented">Rented</option>
                  <option value="living_with_family">Living with family</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/admin/households">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Create Household
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
