# BarangayConnect 🏛️

A full-stack **Barangay Management and Information System** — a white-label, client-presentable web platform that digitizes day-to-day barangay operations: resident records, document requests, appointments, complaints, incidents, announcements, payments, and more.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**, and **Supabase** (PostgreSQL + Auth + Storage).

---

## ✨ Features

### Admin Portal (`/admin`)
- **Dashboard** — statistics with charts (population by age group, sex, purok; recent requests)
- **Residents** — full CRUD, search, filter, deactivate; **scan & attach documents/photos** to a resident record (scanner, camera, or upload)
- **Households** — record households, assign members
- **Documents** — request processing workflow (approve → certificate generation → release), PDF certificate printing
- **Appointments** — confirm, complete, cancel, no-show
- **Complaints** — status workflow + resolution (residents can attach photo evidence)
- **Incidents** — report barangay incidents (with attached photos/scans) and track status
- **Announcements** — publish announcements (with optional attachment) and notify residents
- **Payments** — track barangay transactions
- **Reports** — analytics and revenue summary, **Export All** Excel workbook (one sheet per module)
- **Excel & PDF exports** — every list page (Residents, Households, Payments, Documents, Complaints, Incidents, Announcements, Appointments, Officials) offers **Export Excel** (print-ready .xlsx) and **Print Report** (PDF) buttons
- **Officials** — display current elected/appointed officials
- **Audit Logs** — administrative activity trail
- **Settings** — barangay profile configuration

### Resident Portal (`/resident`)
- Dashboard with quick actions and recent activity
- **Profile** — self-service personal information
- **Documents** — request and track barangay certificates
- **Appointments** — book and manage appointments
- **Complaints** — file and track complaints, attach photo evidence
- **Announcements** — read the latest barangay news
- **Notifications** — real-time updates

### Public & Security
- **QR Certificate Verification** (`/verify/[certificateNumber]`) — public verification of issued certificates
- **Role-based access control** — `captain`, `secretary`, `treasurer`, `kagawad`, `staff`, `resident`
- **Row Level Security (RLS)** at the database level
- **Audit logging** using the service-role client (never exposed client-side)

---

## 🧱 Tech Stack

| Layer      | Technology |
|------------|-----------|
| Framework  | Next.js 16 (App Router, Turbopack) |
| Language   | TypeScript |
| Styling    | Tailwind CSS v4 |
| UI         | Radix UI primitives, lucide-react icons |
| Forms      | React Hook Form + Zod validation |
| Data       | Supabase (PostgreSQL, Auth, Storage), TanStack Query |
| PDFs       | @react-pdf/renderer, jsPDF + jspdf-autotable |
| Excel      | SheetJS (xlsx) |
| Charts     | Recharts |
| Auth       | Supabase Auth (email/password) |

---

## 📁 Project Structure

```
barangay-connect/
├── src/
│   ├── app/
│   │   ├── admin/          # Admin portal routes (dashboard, residents, documents, ...)
│   │   ├── resident/       # Resident portal routes
│   │   ├── (auth)/         # Login, signup, reset-password
│   │   ├── api/            # API routes (e.g. document PDF print)
│   │   ├── verify/         # Public certificate verification
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   ├── ui/             # Reusable UI primitives (incl. FileUpload scanner)
│   │   ├── layout/         # AdminSidebar, ResidentSidebar
│   │   └── export-buttons.tsx  # Excel / PDF / Export-All buttons
│   ├── lib/
│   │   ├── supabase/       # client / server / admin clients
│   │   ├── validation/     # Zod schemas
│   │   ├── pdf/            # certificate PDF templates
│   │   ├── upload.ts       # Supabase Storage upload helpers
│   │   └── export/         # export definitions, Excel & PDF builders
│   ├── services/           # audit & notification helpers
│   ├── hooks/              # auth context
│   ├── types/              # TypeScript types & enums
│   └── constants/          # puroks, roles, nav items
├── supabase/migrations/    # SQL schema, RLS policies, storage & seed data
├── scripts/                # setup-admin & seed-demo
└── .env.example
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (recommended)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Never commit your real `.env.local`** — it is gitignored. The service-role key grants full database access and must only be used server-side.

### 3. Set up the database

Go to **Supabase → SQL Editor** and run the migration files **in order**:

1. `supabase/migrations/001_initial_schema.sql` — tables, indexes, triggers
2. `supabase/migrations/002_rls_policies.sql` — row-level security
3. `supabase/migrations/003_seed_data.sql` — lookup/reference data
4. `supabase/migrations/004_scan_uploads.sql` — storage bucket + resident document scans

> Migration 004 creates the public `barangay-attachments` Storage bucket (10 MB max, JPG/PNG/WebP/PDF) and the `resident_documents` table with RLS.

### 4. Create the first admin (captain)

```bash
npx tsx scripts/setup-admin.ts
```

This creates the admin login:

```
Email:    admin@barangayconnect.com
Password: Admin@123456
```

> Change the password after first login. You can override the password with the `ADMIN_PASSWORD` env var.

### 5. (Optional) Seed demo data

```bash
npx tsx scripts/seed-demo.ts
```

Seeds realistic demo data (40+ residents, households, document requests, appointments, complaints, incidents, announcements, and payments).

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in at `/login` with the admin credentials above.

---

## 🔑 Roles

| Role        | Access |
|-------------|--------|
| `captain`   | Full admin access |
| `secretary` | Full admin access |
| `treasurer` | Full admin access |
| `kagawad`   | Full admin access |
| `staff`     | Full admin access |
| `resident`  | Resident portal only |

Role-based routing is enforced in `src/proxy.ts` (Next.js 16 `proxy()`).

---

## 🔒 Security Notes

- **RLS** is enabled on every table with row-level policies.
- The **service-role client** (`src/lib/supabase/admin.ts`) is used for audit logs and notifications and is **never** imported into client components.
- **Supabase Storage** buckets are protected by RLS (public read, authenticated staff write/delete); uploads are validated (file type + 10 MB size limit) before they reach storage.
- Resident data access is scoped: residents read/update only their own records.
- Certificate verification is intentionally public (read-only by certificate number).

---

## 🧰 Useful Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # ESLint
```

---

## 📄 License

This is a demo/presentable system. Deployment per-barangay customizations (name, municipality, captain) are driven by the env vars under "Barangay Info" for white-labeling.
