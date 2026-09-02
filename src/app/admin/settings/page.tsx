"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("barangay_settings").select("*").single();
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from("barangay_settings")
      .update({
        barangay_name: settings.barangay_name,
        municipality: settings.municipality,
        province: settings.province,
        hotline: settings.hotline,
        address: settings.address,
      })
      .eq("id", settings.id);

    setSaving(false);
    if (updateError) {
      setError("Unable to save settings. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-48" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure barangay information</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Settings saved successfully.</div>}

      <Card>
        <CardHeader>
          <CardTitle><SettingsIcon className="mr-2 inline h-5 w-5" /> Barangay Information</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Barangay Name</Label>
                  <Input value={settings.barangay_name || ""} onChange={(e) => handleChange("barangay_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Municipality</Label>
                  <Input value={settings.municipality || ""} onChange={(e) => handleChange("municipality", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input value={settings.province || ""} onChange={(e) => handleChange("province", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hotline</Label>
                  <Input value={settings.hotline || ""} onChange={(e) => handleChange("hotline", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={settings.address || ""} onChange={(e) => handleChange("address", e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Settings
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">No settings record found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
