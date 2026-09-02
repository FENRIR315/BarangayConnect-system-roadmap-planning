import type { Metadata } from "next";
import ResidentSidebar from "@/components/layout/ResidentSidebar";

export const metadata: Metadata = {
  title: "Resident Portal",
};

export default function ResidentLayout({ children }: LayoutProps<"/resident">) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ResidentSidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
