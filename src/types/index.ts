export * from "./enums";
export * from "./database";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ResidentFilters extends SearchFilters {
  purok?: string;
  sex?: string;
  civil_status?: string;
  voter_status?: string;
  residency_status?: string;
  household_id?: string;
  age_min?: number;
  age_max?: number;
}

export interface DocumentRequestFilters extends SearchFilters {
  status?: string;
  document_type_id?: string;
  payment_status?: string;
}

export interface AppointmentFilters extends SearchFilters {
  status?: string;
  service_id?: string;
  date_from?: string;
  date_to?: string;
  assigned_official_id?: string;
}

export interface ComplaintFilters extends SearchFilters {
  status?: string;
  complaint_type_id?: string;
  assigned_official_id?: string;
}

export interface IncidentFilters extends SearchFilters {
  status?: string;
  incident_type_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilters extends SearchFilters {
  status?: string;
  payment_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface AuditLogFilters extends SearchFilters {
  module?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface DashboardStats {
  totalResidents: number;
  totalHouseholds: number;
  pendingDocumentRequests: number;
  todaysAppointments: number;
  pendingComplaints: number;
  openIncidents: number;
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface MonthlyData {
  month: string;
  count: number;
}
