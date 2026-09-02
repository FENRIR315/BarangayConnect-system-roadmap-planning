export const APP_NAME = "BarangayConnect";
export const APP_DESCRIPTION = "Barangay Management and Information System";

export const Puroks = [
  "Purok 1",
  "Purok 2",
  "Purok 3",
  "Purok 4",
  "Purok 5",
  "Purok 6",
  "Purok 7",
  "Purok 8",
  "Purok 9",
  "Purok 10",
];

export const DocumentTypes = [
  "Barangay Clearance",
  "Certificate of Residency",
  "Certificate of Indigency",
  "Certificate of Good Moral Character",
  "Business Clearance",
  "Certificate of Low Income",
  "Other Barangay Certifications",
];

export const IncidentTypes = [
  "Fire",
  "Flood",
  "Accident",
  "Medical Emergency",
  "Public Disturbance",
  "Missing Person",
  "Road Incident",
  "Other",
];

export const ComplaintTypes = [
  "Noise Complaint",
  "Property Dispute",
  "Noise Nuisance",
  "Domestic Violence",
  "Theft",
  "Vandalism",
  "Public Disturbance",
  "Other",
];

export const AppointmentServices = [
  "Document Processing",
  "Barangay Clearance",
  "Certificate Request",
  "Complaint Filing",
  "General Inquiry",
  "Other",
];

export const AdminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Residents", href: "/residents", icon: "Users" },
  { label: "Households", href: "/households", icon: "Home" },
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Appointments", href: "/appointments", icon: "Calendar" },
  { label: "Complaints", href: "/complaints", icon: "AlertTriangle" },
  { label: "Incidents", href: "/incidents", icon: "Shield" },
  { label: "Announcements", href: "/announcements", icon: "Megaphone" },
  { label: "Payments", href: "/payments", icon: "DollarSign" },
  { label: "Reports", href: "/reports", icon: "BarChart3" },
  { label: "Officials", href: "/officials", icon: "Crown" },
  { label: "Audit Logs", href: "/audit-logs", icon: "ScrollText" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

export const ResidentNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "My Profile", href: "/profile", icon: "User" },
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Appointments", href: "/appointments", icon: "Calendar" },
  { label: "Complaints", href: "/complaints", icon: "AlertTriangle" },
  { label: "Announcements", href: "/announcements", icon: "Megaphone" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
];

export const Roles = [
  { value: "captain", label: "Barangay Captain" },
  { value: "secretary", label: "Barangay Secretary" },
  { value: "treasurer", label: "Barangay Treasurer" },
  { value: "kagawad", label: "Barangay Kagawad" },
  { value: "staff", label: "Barangay Staff" },
  { value: "resident", label: "Resident" },
];

export const OfficialPositions = [
  "Barangay Captain",
  "Barangay Secretary",
  "Barangay Treasurer",
  "Kagawad - Peace and Order",
  "Kagawad - Health",
  "Kagawad - Education",
  "Kagawad - Infrastructure",
  "Kagawad - Agriculture",
  "Kagawad - Budget and Finance",
  "Kagawad - Tourism",
  "Kagawad - Environment",
  "Barangay Staff",
];

export const SidebarWidth = 280;
export const HeaderHeight = 64;

export const ITEMS_PER_PAGE = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
