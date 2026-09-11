"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { residentSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Puroks } from "@/constants";
import { FileUpload } from "@/components/ui/file-upload";
import { useAuth } from "@/hooks/useAuth";

type ResidentForm = z.infer<typeof residentSchema>;

export default function CreateResidentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanDocs, setScanDocs] = useState<string[]>([]);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResidentForm>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      residency_status: "active",
    },
  });

  const onSubmit = async (data: ResidentForm) => {
    setLoading(true);
    setError(null);

    if (createAccount) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) {
        setError("Enter a valid email for the resident's login account.");
        setLoading(false);
        return;
      }
      if (accountPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }
      if (accountPassword !== accountConfirm) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    const { data: resident, error: insertError } = await supabase
      .from("residents")
      .insert({
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
        email: createAccount ? accountEmail.trim() : (data.email || null),
        occupation: data.occupation || null,
        voter_status: data.voter_status || null,
        residency_status: data.residency_status || "active",
        household_id: data.household_id || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to create resident. Please try again.");
      setLoading(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "resident_created",
      module: "residents",
      record_id: resident.id,
      new_values: data as Record<string, unknown>,
    });

    if (scanDocs.length > 0) {
      const docRows = scanDocs.map((url) => ({
        resident_id: resident.id,
        title: "Scanned document",
        category: "other",
        file_url: url,
        uploaded_by: user?.id ?? null,
      }));
      await supabase.from("resident_documents").insert(docRows);
    }

    if (createAccount) {
      const resp = await fetch("/api/local/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-account",
          email: accountEmail.trim(),
          password: accountPassword,
          resident_id: resident.id,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) {
        setError(body?.error?.message ?? "Login account creation failed. The resident record was saved — retry from the resident page.");
        setLoading(false);
        return;
      }
      setAccountMsg(`Login account created for ${accountEmail.trim()}. Give these credentials to the resident.`);
    }

    setLoading(false);
    router.push(`/admin/residents/${resident.id}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/residents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Resident</h1>
          <p className="text-sm text-gray-500">Create a new resident record</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {accountMsg && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{accountMsg}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...register("first_name")} />
                  {errors.first_name && <p className="text-sm text-red-600">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input id="middle_name" {...register("middle_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" {...register("last_name")} />
                  {errors.last_name && <p className="text-sm text-red-600">{errors.last_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix">Suffix</Label>
                  <Input id="suffix" placeholder="Jr., Sr., III" {...register("suffix")} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input id="dob" type="date" {...register("dob")} />
                  {errors.dob && <p className="text-sm text-red-600">{errors.dob.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex *</Label>
                  <select id="sex" className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register("sex")}>
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.sex && <p className="text-sm text-red-600">{errors.sex.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="civil_status">Civil Status *</Label>
                  <select id="civil_status" className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register("civil_status")}>
                    <option value="">Select status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="widowed">Widowed</option>
                    <option value="separated">Separated</option>
                    <option value="divorced">Divorced</option>
                  </select>
                  {errors.civil_status && <p className="text-sm text-red-600">{errors.civil_status.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" {...register("occupation")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Complete Address *</Label>
                  <Input id="address" placeholder="e.g., 123 Rizal St., Brgy. Example" {...register("address")} />
                  {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purok">Purok *</Label>
                  <select id="purok" className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register("purok")}>
                    <option value="">Select purok</option>
                    {Puroks.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {errors.purok && <p className="text-sm text-red-600">{errors.purok.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input id="contact_number" placeholder="09XX XXX XXXX" {...register("contact_number")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voter_status">Voter Status</Label>
                  <select id="voter_status" className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register("voter_status")}>
                    <option value="">Select</option>
                    <option value="registered">Registered</option>
                    <option value="unregistered">Unregistered</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Person</Label>
                  <Input id="emergency_contact_name" {...register("emergency_contact_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Contact Number</Label>
                  <Input id="emergency_contact_phone" {...register("emergency_contact_phone")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login Account */}
          <Card>
            <CardHeader>
              <CardTitle>Login Account</CardTitle>
              <p className="text-sm text-gray-500">
                Like a school issuing student accounts: the barangay creates the resident&apos;s login, so no email
                verification is needed.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => {
                    setCreateAccount(e.target.checked);
                    if (e.target.checked && !accountEmail) setAccountEmail(watch("email") ?? "");
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Create a login account for this resident
                </span>
              </label>

              {createAccount && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="account_email">Account Email *</Label>
                    <Input
                      id="account_email"
                      type="email"
                      placeholder="resident@example.com"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">This is the email the resident will use to sign in.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account_password">Password *</Label>
                      <Input
                        id="account_password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_confirm">Confirm Password *</Label>
                      <Input
                        id="account_confirm"
                        type="password"
                        placeholder="Repeat the password"
                        value={accountConfirm}
                        onChange={(e) => setAccountConfirm(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-amber-700">
                    Note them down now — the resident will use these credentials to sign in at the portal.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Scanned Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Scanned Documents</CardTitle>
              <p className="text-sm text-gray-500">
                Scan and attach supporting documents like a government ID or birth certificate.
              </p>
            </CardHeader>
            <CardContent>
              <FileUpload
                folder="residents/pending"
                value={scanDocs}
                onChange={setScanDocs}
                multiple
                capture
                label="Attachments"
                hint="Use your scanner, phone camera, or paste an image directly."
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Link href="/admin/residents">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {loading ? "Saving..." : createAccount ? "Save Resident & Create Account" : "Save Resident"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
