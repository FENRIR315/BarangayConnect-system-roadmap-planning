"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { announcementSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnnouncementForm = z.infer<typeof announcementSchema>;
const CATEGORIES = ["general", "emergency", "event", "community_program", "meeting", "public_notice"];

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { category: "general", status: "published" },
  });

  const onSubmit = async (data: AnnouncementForm) => {
    setError(null);
    setLoading(true);

    const { data: announcement, error: insertError } = await supabase
      .from("announcements")
      .insert({
        title: data.title,
        description: data.description,
        category: data.category,
        expiry_date: data.expiry_date || null,
        author_id: user?.id,
        status: data.status,
        is_pinned: isPinned,
      })
      .select()
      .single();

    if (insertError) {
      setError("Unable to create announcement. Please try again.");
      setLoading(false);
      return;
    }

    if (data.status === "published") {
      const { data: residents } = await supabase
        .from("residents")
        .select("user_id")
        .not("user_id", "is", null);

      const userIds = (residents ?? [])
        .map((r: any) => r.user_id)
        .filter(Boolean) as string[];

      if (userIds.length > 0) {
        await supabase.from("notifications").insert(
          userIds.map((uid) => ({
            user_id: uid,
            title: data.category === "emergency" ? "Emergency Announcement" : "New Announcement",
            message: data.title,
            type: data.category === "emergency" ? "emergency" : "announcement",
            link: "/resident/announcements",
          }))
        );
      }
    }

    setLoading(false);
    router.push("/admin/announcements");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/announcements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Announcement</h1>
          <p className="text-sm text-gray-500">Publish an announcement</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="Announcement title" {...register("title")} />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" placeholder="Announcement content..." {...register("description")} />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category *</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("category")}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" {...register("expiry_date")} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" {...register("status")}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_pinned" className="h-4 w-4" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
              <Label htmlFor="is_pinned">Pin this announcement</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/admin/announcements">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
