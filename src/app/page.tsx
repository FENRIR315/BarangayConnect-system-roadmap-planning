import Link from "next/link";
import { Building2, ShieldCheck, Users, FileText, CalendarClock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Users, title: "Resident & Household Management", description: "Complete digital records of all residents and households in the barangay." },
  { icon: FileText, title: "Document Requests & Certificates", description: "Online document requests with automatic PDF generation and QR verification." },
  { icon: CalendarClock, title: "Appointments & Scheduling", description: "Residents can book appointments with barangay officials online." },
  { icon: Bell, title: "Announcements & Notifications", description: "Real-time announcements and personal notifications for every resident." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">BarangayConnect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800">
            <ShieldCheck className="h-4 w-4" />
            Barangay Management and Information System
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Modern governance for your barangay
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            BarangayConnect streamlines resident records, document processing,
            appointments, and community engagement — everything your barangay
            needs in one secure platform.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">Log In</Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <feature.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} BarangayConnect. A Barangay Management and Information System.
        </div>
      </footer>
    </div>
  );
}
