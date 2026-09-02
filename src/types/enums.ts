export const UserRole = {
  CAPTAIN: "captain",
  SECRETARY: "secretary",
  TREASURER: "treasurer",
  KAGAWAD: "kagawad",
  STAFF: "staff",
  RESIDENT: "resident",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Sex = {
  MALE: "male",
  FEMALE: "female",
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export const CivilStatus = {
  SINGLE: "single",
  MARRIED: "married",
  WIDOWED: "widowed",
  SEPARATED: "separated",
  DIVORCED: "divorced",
} as const;

export type CivilStatus = (typeof CivilStatus)[keyof typeof CivilStatus];

export const VoterStatus = {
  REGISTERED: "registered",
  UNREGISTERED: "unregistered",
  PENDING: "pending",
} as const;

export type VoterStatus = (typeof VoterStatus)[keyof typeof VoterStatus];

export const ResidencyStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TRANSFERRED: "transferred",
} as const;

export type ResidencyStatus = (typeof ResidencyStatus)[keyof typeof ResidencyStatus];

export const ResidentStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEACTIVATED: "deactivated",
} as const;

export type ResidentStatus = (typeof ResidentStatus)[keyof typeof ResidentStatus];

export const DocumentRequestStatus = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  READY_FOR_RELEASE: "ready_for_release",
  RELEASED: "released",
  CANCELLED: "cancelled",
} as const;

export type DocumentRequestStatus = (typeof DocumentRequestStatus)[keyof typeof DocumentRequestStatus];

export const PaymentStatus = {
  UNPAID: "unpaid",
  PAID: "paid",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const AppointmentStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const ComplaintStatus = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  INVESTIGATING: "investigating",
  RESOLVED: "resolved",
  CLOSED: "closed",
  REJECTED: "rejected",
} as const;

export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

export const IncidentStatus = {
  OPEN: "open",
  INVESTIGATING: "investigating",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const AnnouncementCategory = {
  GENERAL: "general",
  EMERGENCY: "emergency",
  EVENT: "event",
  COMMUNITY_PROGRAM: "community_program",
  MEETING: "meeting",
  PUBLIC_NOTICE: "public_notice",
} as const;

export type AnnouncementCategory = (typeof AnnouncementCategory)[keyof typeof AnnouncementCategory];

export const AnnouncementStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type AnnouncementStatus = (typeof AnnouncementStatus)[keyof typeof AnnouncementStatus];

export const DocumentStatus = {
  VALID: "valid",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const PaymentType = {
  CASH: "cash",
  GCASH: "gcash",
  MAYA: "maya",
  BANK_TRANSFER: "bank_transfer",
  OTHER: "other",
} as const;

export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const HouseOwnership = {
  OWNED: "owned",
  RENTED: "rented",
  LIVING_WITH_FAMILY: "living_with_family",
  OTHER: "other",
} as const;

export type HouseOwnership = (typeof HouseOwnership)[keyof typeof HouseOwnership];
