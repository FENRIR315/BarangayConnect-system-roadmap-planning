import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const residentSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().min(2, "Last name is required"),
  suffix: z.string().optional().nullable(),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["male", "female"], { message: "Sex is required" }),
  civil_status: z.enum(
    ["single", "married", "widowed", "separated", "divorced"],
    { message: "Civil status is required" }
  ),
  address: z.string().min(5, "Complete address is required"),
  purok: z.string().min(2, "Purok is required"),
  contact_number: z.string().optional().nullable(),
  email: z.string().email("Valid email required").optional().nullable().or(z.literal("")),
  occupation: z.string().optional().nullable(),
  voter_status: z.enum(["registered", "unregistered", "pending"]).optional().nullable(),
  residency_status: z.enum(["active", "inactive", "transferred"]).optional().nullable(),
  household_id: z.string().uuid().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  profile_photo_url: z.string().optional().nullable(),
});

export const householdSchema = z.object({
  household_number: z.string().min(3, "Household number is required"),
  address: z.string().min(5, "Address is required"),
  purok: z.string().min(2, "Purok is required"),
  household_head_id: z.string().uuid().optional().nullable(),
  monthly_income: z.number().optional().nullable(),
  house_ownership: z
    .enum(["owned", "rented", "living_with_family", "other"])
    .optional()
    .nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const documentRequestSchema = z.object({
  document_type_id: z.string().uuid("Document type is required"),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
  remarks: z.string().optional().nullable(),
  supporting_documents: z.array(z.string()).optional(),
});

export const documentTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional().nullable(),
  fee: z.number().min(0, "Fee cannot be negative"),
  requirements: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const appointmentSchema = z.object({
  service_id: z.string().uuid("Service is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  scheduled_time: z.string().min(1, "Time is required"),
  purpose: z.string().min(5, "Purpose is required"),
  remarks: z.string().optional().nullable(),
});

export const appointmentServiceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  description: z.string().optional().nullable(),
  duration_minutes: z.number().min(5, "Minimum 5 minutes").max(480, "Maximum 8 hours"),
  max_daily_slots: z.number().min(1, "At least 1 slot").default(20),
  is_active: z.boolean().default(true),
});

export const complaintSchema = z.object({
  complaint_type_id: z.string().uuid("Complaint type is required"),
  description: z.string().min(10, "Please describe the complaint in detail (min 10 chars)"),
  location: z.string().optional().nullable(),
  date_of_incident: z.string().optional().nullable(),
  time_of_incident: z.string().optional().nullable(),
  evidence_urls: z.array(z.string()).optional(),
});

export const complaintTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const incidentSchema = z.object({
  incident_type_id: z.string().uuid("Incident type is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional().nullable(),
  location: z.string().min(5, "Location is required"),
  description: z.string().min(10, "Description is required"),
  people_involved: z.string().optional(),
  responding_officials: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(5, "Title is required"),
  description: z.string().min(10, "Description is required"),
  category: z.enum([
    "general",
    "emergency",
    "event",
    "community_program",
    "meeting",
    "public_notice",
  ]),
  expiry_date: z.string().optional().nullable(),
  attachment_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  is_pinned: z.boolean().optional(),
});

export const paymentSchema = z.object({
  request_id: z.string().uuid("Request is required"),
  amount: z.number().min(0, "Amount cannot be negative"),
  payment_type: z.enum(["cash", "gcash", "maya", "bank_transfer", "other"]),
  payment_date: z.string().min(1, "Date is required"),
  or_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const officialSchema = z.object({
  user_id: z.string().uuid("User is required"),
  position: z.string().min(2, "Position is required"),
  term_start: z.string().optional().nullable(),
  term_end: z.string().optional().nullable(),
  committee_assignments: z.array(z.string()).optional().default([]),
  is_active: z.boolean().default(true),
});
