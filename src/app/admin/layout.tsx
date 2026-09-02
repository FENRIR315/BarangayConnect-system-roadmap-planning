import type { Metadata } from "next";
import AdminSidebar from "@/components/layout/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin Portal",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
