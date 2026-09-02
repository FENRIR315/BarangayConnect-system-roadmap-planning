"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*, author:users(first_name, last_name)")
        .eq("id", params.id)
        .single();

      setAnnouncement(data);
      setLoading(false);
    };
    fetchAnnouncement();
  }, [params.id]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-48" /></div>;
  }

  if (!announcement) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Announcement not found</h1>
        <Link href="/admin/announcements" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to announcements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/announcements">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">{announcement.category.replace(/_/g, " ")}</Badge>
            <Badge>{announcement.status}</Badge>
            {announcement.is_pinned && <Badge variant="warning">Pinned</Badge>}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{announcement.title}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            {announcement.author && (
              <span className="flex items-center gap-1">
                <Megaphone className="h-4 w-4" />
                {announcement.author.first_name} {announcement.author.last_name}
              </span>
            )}
            <span>Published {formatDate(announcement.published_date)}</span>
            {announcement.expiry_date && <span>Expires {formatDate(announcement.expiry_date)}</span>}
          </div>
          <div className="mt-6 whitespace-pre-wrap text-gray-700">{announcement.description}</div>
        </CardContent>
      </Card>
    </div>
  );
}
