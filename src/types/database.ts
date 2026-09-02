import { UserRole } from "./enums";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarangaySetting {
  id: string;
  barangay_name: string;
  municipality: string;
  province: string;
  region: string;
  logo_url: string | null;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  captain_name: string | null;
  motto: string | null;
  created_at: string;
  updated_at: string;
}

export interface Official {
  id: string;
  user_id: string;
  user?: User;
  position: string;
  term_start: string | null;
  term_end: string | null;
  committee_assignments: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resident {
  id: string;
  user_id: string | null;
  user?: User;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  dob: string;
  age?: number;
  sex: "male" | "female";
  civil_status: "single" | "married" | "widowed" | "separated" | "divorced";
  address: string;
  purok: string;
  contact_number: string | null;
  email: string | null;
  occupation: string | null;
  voter_status: "registered" | "unregistered" | "pending" | null;
  residency_status: "active" | "inactive" | "transferred";
  household_id: string | null;
  household?: Household;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_photo_url: string | null;
  date_registered: string;
  status: "active" | "inactive" | "deactivated";
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  household_number: string;
  address: string;
  purok: string;
  household_head_id: string | null;
  household_head?: Resident;
  monthly_income: number | null;
  house_ownership: "owned" | "rented" | "living_with_family" | "other" | null;
  status: "active" | "inactive";
  members?: HouseholdMember[];
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  resident_id: string;
  resident?: Resident;
  relationship_to_head: string | null;
  date_added: string;
}

export interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  fee: number;
  requirements: string[] | null;
  template_config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface DocumentRequest {
  id: string;
  request_number: string;
  resident_id: string;
  resident?: Resident;
  document_type_id: string;
  document_type?: DocumentType;
  purpose: string;
  status: "submitted" | "under_review" | "approved" | "rejected" | "ready_for_release" | "released" | "cancelled";
  processing_official_id: string | null;
  processing_official?: User;
  approval_date: string | null;
  release_date: string | null;
  rejection_reason: string | null;
  payment_status: "unpaid" | "paid" | "refunded";
  remarks: string | null;
  supporting_documents: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  request_id: string;
  request?: DocumentRequest;
  certificate_number: string;
  document_type: string;
  resident_name: string;
  resident_address: string | null;
  purpose: string | null;
  pdf_url: string | null;
  qr_code_url: string | null;
  issued_by: string | null;
  issued_by_user?: User;
  issued_at: string;
  expiry_date: string | null;
  status: "valid" | "expired" | "revoked";
  created_at: string;
}

export interface AppointmentService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  max_daily_slots: number;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  appointment_number: string;
  resident_id: string;
  resident?: Resident;
  service_id: string;
  service?: AppointmentService;
  scheduled_date: string;
  scheduled_time: string;
  purpose: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  assigned_official_id: string | null;
  assigned_official?: User;
  remarks: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  resident_id: string;
  resident?: Resident;
  complaint_type_id: string;
  complaint_type?: ComplaintType;
  description: string;
  location: string | null;
  date_of_incident: string | null;
  time_of_incident: string | null;
  evidence_urls: string[] | null;
  status: "submitted" | "under_review" | "investigating" | "resolved" | "closed" | "rejected";
  assigned_official_id: string | null;
  assigned_official?: User;
  resolution: string | null;
  resolution_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentType {
  id: string;
  name: string;
  description: string | null;
}

export interface Incident {
  id: string;
  incident_number: string;
  incident_type_id: string;
  incident_type?: IncidentType;
  date: string;
  time: string | null;
  location: string;
  description: string;
  people_involved: string[] | null;
  responding_officials: string[] | null;
  status: "open" | "investigating" | "resolved" | "closed";
  resolution: string | null;
  attachments: string[] | null;
  reported_by: string | null;
  reported_by_user?: User;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  category: "general" | "emergency" | "event" | "community_program" | "meeting" | "public_notice";
  published_date: string;
  expiry_date: string | null;
  author_id: string;
  author?: User;
  attachment_url: string | null;
  status: "draft" | "published" | "archived";
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  request_id: string | null;
  request?: DocumentRequest;
  resident_id: string;
  resident?: Resident;
  amount: number;
  payment_type: "cash" | "gcash" | "maya" | "bank_transfer" | "other";
  payment_date: string;
  or_number: string | null;
  recorded_by: string;
  recorded_by_user?: User;
  status: "paid" | "refunded" | "pending";
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  module: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
