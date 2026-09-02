"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default function ResidentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const supabase = createClient();
      const today = new Date().toISOString();

      const { data } = await supabase
        .from("announcements")
        .select("*, author:users(first_name, last_name)")
        .eq("status", "published")
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order("is_pinned", { ascending: false })
        .order("published_date", { ascending: false });

      setAnnouncements(data ?? []);
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  const categoryColors: Record<string, string> = {
    general: "bg-blue-50 text-blue-700",
    emergency: "bg-red-50 text-red-700",
    event: "bg-green-50 text-green-700",
    community_program: "bg-purple-50 text-purple-700",
    meeting: "bg-yellow-50 text-yellow-700",
    public_notice: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500">Latest news from your barangay</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No announcements"
          description="There are no active announcements right now."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className={a.is_pinned ? "border-blue-300" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={categoryColors[a.category] || "bg-gray-100 text-gray-700"}>
                        {a.category.replace(/_/g, " ")}
                      </Badge>
                      {a.is_pinned && <Badge variant="warning">Pinned</Badge>}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-gray-900">{a.title}</h2>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{formatDate(a.published_date)}</p>
                    {a.author && <p className="mt-1">{a.author.first_name} {a.author.last_name}</p>}
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{a.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
