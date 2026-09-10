import type { LocalSupabase } from "@/lib/supabase/client";

export interface ExportColumn {
  header: string;
  accessor: (row: any) => string | number | null;
}

export interface ExportDefinition {
  key: string;
  sheetName: string;
  filename: string;
  title: string;
  columns: ExportColumn[];
  fetch: (supabase: LocalSupabase) => Promise<any[]>;
  /** optional summary line(s) rendered at the bottom of the PDF report */
  totals?: (rows: any[]) => { label: string; value: string }[];
}

const fmtDate = (v: any) => (v ? new Date(v).toISOString().split("T")[0] : "");
const joinName = (r: any) => {
  if (!r) return "";
  return [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ") || "";
};
const capitalized = (v: any) => (v ? String(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export const PEOPLE: Record<string, ExportDefinition> = {
  residents: {
    key: "residents",
    sheetName: "Residents",
    filename: "residents",
    title: "Residents Master List",
    columns: [
      { header: "Last Name", accessor: (r) => r.last_name ?? "" },
      { header: "First Name", accessor: (r) => r.first_name ?? "" },
      { header: "Middle Name", accessor: (r) => r.middle_name ?? "" },
      { header: "Suffix", accessor: (r) => r.suffix ?? "" },
      { header: "Sex", accessor: (r) => capitalized(r.sex) },
      { header: "Date of Birth", accessor: (r) => fmtDate(r.dob) },
      { header: "Civil Status", accessor: (r) => capitalized(r.civil_status) },
      { header: "Purok", accessor: (r) => r.purok ?? "" },
      { header: "Address", accessor: (r) => r.address ?? "" },
      { header: "Contact Number", accessor: (r) => r.contact_number ?? "" },
      { header: "Email", accessor: (r) => r.email ?? "" },
      { header: "Occupation", accessor: (r) => r.occupation ?? "" },
      { header: "Voter Status", accessor: (r) => capitalized(r.voter_status) },
      { header: "Residency Status", accessor: (r) => capitalized(r.residency_status) },
      { header: "Household", accessor: (r) => r.household?.household_number ?? "" },
      { header: "Date Registered", accessor: (r) => fmtDate(r.date_registered) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("residents")
        .select("*, household:households!household_id(household_number)")
        .order("last_name", { ascending: true });
      return data ?? [];
    },
  },
  households: {
    key: "households",
    sheetName: "Households",
    filename: "households",
    title: "Households List",
    columns: [
      { header: "Household Number", accessor: (r) => r.household_number ?? "" },
      { header: "Purok", accessor: (r) => r.purok ?? "" },
      { header: "Address", accessor: (r) => r.address ?? "" },
      { header: "Head of Household", accessor: (r) => joinName(r.head) },
      { header: "Monthly Income", accessor: (r) => (r.monthly_income != null ? Number(r.monthly_income) : "") },
      { header: "House Ownership", accessor: (r) => capitalized(r.house_ownership) },
      { header: "Status", accessor: (r) => capitalized(r.status) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("households")
        .select("*, head:residents!fk_households_head(first_name, middle_name, last_name)")
        .order("household_number", { ascending: true });
      return data ?? [];
    },
  },
  payments: {
    key: "payments",
    sheetName: "Payments",
    filename: "payments",
    title: "Payment Records",
    columns: [
      { header: "Receipt Number", accessor: (r) => r.receipt_number ?? "" },
      { header: "Resident", accessor: (r) => joinName(r.resident) },
      { header: "Reference", accessor: (r) => r.request?.request_number ?? "" },
      { header: "Amount (PHP)", accessor: (r) => (r.amount != null ? Number(r.amount) : "") },
      { header: "Payment Type", accessor: (r) => capitalized(r.payment_type) },
      { header: "Payment Method", accessor: (r) => r.payment_method ? capitalized(r.payment_method) : "" },
      { header: "Payment Date", accessor: (r) => fmtDate(r.payment_date) },
      { header: "OR Number", accessor: (r) => r.or_number ?? "" },
      { header: "Notes", accessor: (r) => r.notes ?? "" },
    ],
    totals: (rows) => [
      {
        label: "Total",
        value: rows.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        }),
      },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("payments")
        .select("*, resident:residents(first_name, middle_name, last_name), request:document_requests(request_number)")
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  },
  document_requests: {
    key: "document_requests",
    sheetName: "Documents",
    filename: "document-requests",
    title: "Document Requests",
    columns: [
      { header: "Request Number", accessor: (r) => r.request_number ?? "" },
      { header: "Resident", accessor: (r) => joinName(r.resident) },
      { header: "Document Type", accessor: (r) => r.type?.name ?? "" },
      { header: "Purpose", accessor: (r) => r.purpose ?? "" },
      { header: "Fee (PHP)", accessor: (r) => (r.fee != null ? Number(r.fee) : "") },
      { header: "Status", accessor: (r) => capitalized(r.status) },
      { header: "Remarks", accessor: (r) => r.remarks ?? "" },
      { header: "Date Requested", accessor: (r) => fmtDate(r.created_at) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("document_requests")
        .select("*, resident:residents(first_name, middle_name, last_name), type:document_types(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  complaints: {
    key: "complaints",
    sheetName: "Complaints",
    filename: "complaints",
    title: "Complaints Log",
    columns: [
      { header: "Complaint Number", accessor: (r) => r.complaint_number ?? "" },
      { header: "Resident", accessor: (r) => joinName(r.resident) },
      { header: "Complaint Type", accessor: (r) => r.type?.name ?? "" },
      { header: "Description", accessor: (r) => r.description ?? "" },
      { header: "Location", accessor: (r) => r.location ?? "" },
      { header: "Date of Incident", accessor: (r) => fmtDate(r.date_of_incident) },
      { header: "Time of Incident", accessor: (r) => r.time_of_incident ?? "" },
      { header: "Status", accessor: (r) => capitalized(r.status) },
      { header: "Resolution", accessor: (r) => r.resolution ?? "" },
      { header: "Date Filed", accessor: (r) => fmtDate(r.created_at) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("complaints")
        .select("*, resident:residents(first_name, middle_name, last_name), type:complaint_types(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  incidents: {
    key: "incidents",
    sheetName: "Incidents",
    filename: "incidents",
    title: "Incident Reports",
    columns: [
      { header: "Incident Number", accessor: (r) => r.incident_number ?? "" },
      { header: "Incident Type", accessor: (r) => r.type?.name ?? "" },
      { header: "Date", accessor: (r) => fmtDate(r.date) },
      { header: "Time", accessor: (r) => r.time ?? "" },
      { header: "Location", accessor: (r) => r.location ?? "" },
      { header: "Description", accessor: (r) => r.description ?? "" },
      { header: "People Involved", accessor: (r) => (r.people_involved ?? []).join(", ") },
      { header: "Status", accessor: (r) => capitalized(r.status) },
      { header: "Reported", accessor: (r) => fmtDate(r.created_at) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("incidents")
        .select("*, type:incident_types(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  announcements: {
    key: "announcements",
    sheetName: "Announcements",
    filename: "announcements",
    title: "Announcements",
    columns: [
      { header: "Title", accessor: (r) => r.title ?? "" },
      { header: "Category", accessor: (r) => capitalized(r.category) },
      { header: "Status", accessor: (r) => capitalized(r.status) },
      { header: "Pinned", accessor: (r) => (r.is_pinned ? "Yes" : "No") },
      { header: "Published Date", accessor: (r) => fmtDate(r.published_date) },
      { header: "Expiry Date", accessor: (r) => fmtDate(r.expiry_date) },
      { header: "Author", accessor: (r) => joinName(r.author) },
      { header: "Description", accessor: (r) => r.description ?? "" },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("announcements")
        .select("*, author:users(first_name, last_name)")
        .order("published_date", { ascending: false });
      return data ?? [];
    },
  },
  appointments: {
    key: "appointments",
    sheetName: "Appointments",
    filename: "appointments",
    title: "Appointments",
    columns: [
      { header: "Appointment Number", accessor: (r) => r.appointment_number ?? "" },
      { header: "Resident", accessor: (r) => joinName(r.resident) },
      { header: "Service", accessor: (r) => r.service?.name ?? "" },
      { header: "Scheduled Date", accessor: (r) => fmtDate(r.scheduled_date) },
      { header: "Scheduled Time", accessor: (r) => r.scheduled_time ?? "" },
      { header: "Purpose", accessor: (r) => r.purpose ?? "" },
      { header: "Status", accessor: (r) => capitalized(r.status) },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("appointments")
        .select("*, resident:residents(first_name, middle_name, last_name), service:appointment_services(name)")
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
  },
  officials: {
    key: "officials",
    sheetName: "Officials",
    filename: "officials",
    title: "Barangay Officials",
    columns: [
      { header: "Name", accessor: (r) => joinName(r.resident) },
      { header: "Position", accessor: (r) => r.position ?? "" },
      { header: "Committee", accessor: (r) => r.committee ?? "" },
      { header: "Term Start", accessor: (r) => fmtDate(r.term_start) },
      { header: "Term End", accessor: (r) => fmtDate(r.term_end) },
      { header: "Active", accessor: (r) => (r.is_active ? "Yes" : "No") },
    ],
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("officials")
        .select("*, resident:residents(first_name, middle_name, last_name)")
        .order("position", { ascending: true });
      return data ?? [];
    },
  },
};

export const EXPORT_KEYS = Object.keys(PEOPLE);