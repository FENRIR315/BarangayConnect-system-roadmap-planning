import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

interface AppShellSkeletonProps {
  variant?: "admin" | "resident";
}

export default function AppShellSkeleton({ variant = "admin" }: AppShellSkeletonProps) {
  const isAdmin = variant === "admin";
  const navCount = isAdmin ? 6 : 5;
  const statCount = isAdmin ? 6 : 4;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: navCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>

      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-52" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: statCount }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>

            {isAdmin ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}