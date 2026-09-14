import { pool } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { parseSelect, type Query } from "@/lib/local/sql";

/**
 * Server-side access control for the generic /api/local/db endpoint.
 *
 * Roles:
 *  - anon:  read-only, only `documents` (single verified row, safe columns) and
 *           `barangay_settings`.
 *  - resident: reads/writes scoped to THEIR OWN rows; sensitive tables blocked;
 *              writes must use only allowlisted columns.
 *  - staff (everything else): full access to business data, but `users`,
 *           `sessions`, `login_attempts` are never writable through this
 *           endpoint and audit-logs inserts are column-restricted.
 *
 * The database layer enforces the same limits at the privilege level
 * (column grants + SECURITY DEFINER functions); this module returns clean
 * 403s before SQL is ever built and adds ownership scoping for residents.
 *
 * Returns either an error to short-circuit, or a possibly-rewritten Query.
 */
export interface AclResult {
  error?: { message: string; code?: string };
  query?: Query;
}

// Owner columns per table for resident scoping.
// user_id -> the session user's id; resident_id -> the resident row for that user.
const OWNER_BY_TABLE: Record<string, "user_id" | "resident_id"> = {
  appointments: "resident_id",
  complaints: "resident_id",
  document_requests: "resident_id",
  documents: "resident_id",
  payments: "resident_id",
  resident_documents: "resident_id",
  residents: "user_id",
  notifications: "user_id",
};

// Tables residents may READ.
const RESIDENT_READ_TABLES = new Set([
  ...Object.keys(OWNER_BY_TABLE),
  "announcements",
  "appointment_services",
  "barangay_settings",
  "complaint_types",
  "document_types",
]);

// Tables residents may INSERT on (still owner-scoped + column-allowlisted).
const RESIDENT_WRITE_TABLES = new Set([
  "appointments",
  "complaints",
  "document_requests",
  "notifications",
  "resident_documents",
]);

// Tables nobody can reach through this generic endpoint regardless of role.
const BLOCKED_TABLES = new Set(["sessions", "login_attempts"]);

// Residents may UPDATE `residents` (their own profile) but never INSERT/DELETE.
const RESIDENT_UPDATE_TABLES = new Set(["residents"]);

// Exact columns residents may INSERT per table. The owner column (user_id /
// resident_id) is NOT listed: the server injects and enforces it.
const RESIDENT_INSERT_COLUMNS: Record<string, Set<string>> = {
  appointments: new Set([
    "appointment_number",
    "service_id",
    "scheduled_date",
    "scheduled_time",
    "purpose",
    "status",
    "remarks",
  ]),
  complaints: new Set([
    "complaint_number",
    "complaint_type_id",
    "description",
    "location",
    "date_of_incident",
    "time_of_incident",
    "status",
    "evidence_urls",
  ]),
  document_requests: new Set([
    "request_number",
    "document_type_id",
    "purpose",
    "status",
    "payment_status",
    "remarks",
  ]),
  notifications: new Set(["title", "message", "type", "link", "is_read"]),
  resident_documents: new Set([
    "title",
    "category",
    "file_url",
    "mime_type",
    "file_size",
    "uploaded_by",
  ]),
};

// Exact columns residents may UPDATE per table.
const RESIDENT_UPDATE_COLUMNS: Record<string, Set<string>> = {
  residents: new Set([
    "first_name",
    "middle_name",
    "last_name",
    "suffix",
    "dob",
    "sex",
    "civil_status",
    "address",
    "purok",
    "contact_number",
    "occupation",
    "emergency_contact_name",
    "emergency_contact_phone",
  ]),
  notifications: new Set(["is_read"]),
};

// Columns staff may insert into audit_logs. user_id / ip_address are set by
// the server route from the live session, never accepted from the client.
const STAFF_AUDIT_INSERT_COLUMNS = new Set([
  "action",
  "module",
  "record_id",
  "before_values",
  "old_values",
  "new_values",
  "details",
]);

// Anonymous access.
const ANON_READ_TABLES = new Set(["documents", "barangay_settings"]);
const ANON_DOC_COLUMNS = new Set([
  "id",
  "certificate_number",
  "resident_name",
  "verification_status",
  "issued_at",
  "issue_date",
  "document_type_id",
  "created_at",
]);
// anon may join documents -> document_types(name) for the verify page only.
const ANON_DOC_EMBEDS: Record<string, { table: string; columns: Set<string> }> = {
  document_type: { table: "document_types", columns: new Set(["name", "description"]) },
};

function forbidden(table: string, message: string) {
  return { error: { message: `${message} (table: ${table})` } };
}

function validateAnonSelect(q: Query) {
  const spec = parseSelect(q.select);
  for (const col of spec.columns) {
    if (col !== "*" && !ANON_DOC_COLUMNS.has(col)) return forbidden("documents", "Column not allowed for public access");
    if (col === "*") return forbidden("documents", "Selecting * is not allowed publicly");
  }
  const keys = Object.keys(ANON_DOC_EMBEDS);
  for (const em of spec.embeds) {
    const rule = ANON_DOC_EMBEDS[em.alias] ?? ANON_DOC_EMBEDS[em.table];
    if (!rule || rule.table !== em.table || (keys.length && !keys.includes(em.alias))) {
      return forbidden("documents", "Join not allowed for public access");
    }
    for (const c of em.spec.columns) {
      if (c !== "*" && !rule.columns.has(c)) return forbidden("documents", "Join column not allowed publicly");
      if (c === "*") return forbidden("documents", "Selecting * in a public join is not allowed");
    }
  }
  return null;
}

function hasAllowedAnonFilter(q: Query): boolean {
  return q.filters.some((f) => f.type === "eq" && (f.column === "id" || f.column === "certificate_number"));
}

// Enforce that a values payload only contains allowlisted columns and pin the
// ownership column on every row (batch inserts included).
function validateWriteValues(
  table: string,
  values: unknown,
  allowed: Set<string>,
  ownerCol?: string,
  ownerValue?: string
): AclResult | null {
  const rows = Array.isArray(values) ? values : [values];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      return forbidden(table, "Invalid write payload");
    }
    for (const k of Object.keys(row)) {
      if (!allowed.has(k)) {
        return forbidden(table, `Column "${k}" is not allowed on this table`);
      }
    }
  }
  if (ownerCol && ownerValue) {
    for (const row of rows) {
      (row as Record<string, unknown>)[ownerCol] = ownerValue;
    }
  }
  return null;
}

export async function authorizeQuery(
  user: SessionUser | null,
  q: Query
): Promise<AclResult> {
  const table = q.table;

  if (BLOCKED_TABLES.has(table)) {
    return forbidden(table, "This endpoint cannot access that table");
  }

  // ---- anonymous ---------------------------------------------------------
  if (!user) {
    if (q.verb !== "select" || !ANON_READ_TABLES.has(table)) {
      return { error: { message: "Not authenticated. Please sign in again.", code: "auth" } };
    }
    if (table === "documents") {
      const v = validateAnonSelect(q);
      if (v) return v;
      const singleRow = q.single || q.maybeSingle || q.limit === 1;
      if (!hasAllowedAnonFilter(q) || !singleRow) {
        return forbidden("documents", "Public documents lookup must filter by a single certificate");
      }
    }
    return { query: q };
  }

  const role = user.role;

  // ---- staff (non-resident) -------------------------------------------------
  if (role !== "resident") {
    if (table === "users" && q.verb !== "select") {
      return forbidden("users", "Account changes are made through the authorized office tools");
    }
    if (table === "audit_logs") {
      if (q.verb === "update" || q.verb === "delete") {
        return forbidden("audit_logs", "Audit logs are read-only except through audited inserts");
      }
      if (q.verb === "insert") {
        return validateWriteValues(table, q.values, STAFF_AUDIT_INSERT_COLUMNS) ?? { query: q };
      }
      return { query: q };
    }

    const flat = `${q.select ?? ""} ${q.filters.map((f) => `${f.column}`).join(" ")} ${(q.ors ?? []).join(" ")}`;
    if (flat.includes("password_hash")) {
      return forbidden("users", "Password hashes are not exposed through the API");
    }
    const spec = parseSelect(q.select);
    for (const em of spec.embeds) {
      if (em.table === "users" && (em.spec.columns.includes("*") || em.spec.columns.includes("password_hash"))) {
        return forbidden("users", "Password hashes are not exposed through the API");
      }
    }
    return { query: q };
  }

  // ---- resident ---------------------------------------------------------
  if (!RESIDENT_READ_TABLES.has(table)) {
    return forbidden(table, "You do not have permission for this data");
  }

  if (q.verb === "select") {
    if (OWNER_BY_TABLE[table]) {
      const id = await ownerIdFor(user, table);
      if (!id) return forbidden(table, "Your account is not linked to a resident record yet");
      q.filters = q.filters.filter((f) => !(f.type === "eq" && f.column === OWNER_BY_TABLE[table]));
      q.filters.push({ type: "eq", column: OWNER_BY_TABLE[table], value: id });
    }
    return { query: q };
  }

  // ---- resident writes ----
  const canInsert = RESIDENT_WRITE_TABLES.has(table) && q.verb === "insert";
  const canUpdate = (RESIDENT_WRITE_TABLES.has(table) || RESIDENT_UPDATE_TABLES.has(table)) && q.verb === "update";
  const canDelete = RESIDENT_WRITE_TABLES.has(table) && q.verb === "delete";
  if (!canInsert && !canUpdate && !canDelete) {
    return forbidden(table, "You are not allowed to modify this data");
  }

  const ownerCol = OWNER_BY_TABLE[table];
  const id = await ownerIdFor(user, table);
  if (!id) return forbidden(table, "Your account is not linked to a resident record yet");

  if (q.verb === "insert") {
    const allowed = RESIDENT_INSERT_COLUMNS[table];
    if (!allowed) return forbidden(table, "You are not allowed to insert into this table");
    return validateWriteValues(table, q.values, allowed, ownerCol, id) ?? { query: q };
  }

  // update / delete
  q.filters = q.filters.filter((f) => !(f.type === "eq" && f.column === ownerCol));
  q.filters.push({ type: "eq", column: ownerCol, value: id });
  if (q.verb === "update") {
    const allowed = RESIDENT_UPDATE_COLUMNS[table];
    if (!allowed) return forbidden(table, "You are not allowed to update this table");
    if (q.values && typeof q.values === "object" && !Array.isArray(q.values)) {
      for (const k of Object.keys(q.values)) {
        if (!allowed.has(k)) return forbidden(table, `Column "${k}" is not allowed on this table`);
      }
      delete (q.values as Record<string, unknown>)[ownerCol];
    }
  }

  return { query: q };
}

const ownerIdCache = new Map<string, string>();

async function ownerIdFor(user: SessionUser, table: string): Promise<string | null> {
  const col = OWNER_BY_TABLE[table];
  if (col === "user_id") return user.id;
  if (ownerIdCache.has(user.id)) return ownerIdCache.get(user.id)!;
  const r = await pool.query(`select id from public.residents where user_id = $1 limit 1`, [user.id]);
  const rid = (r.rows[0] as { id?: string } | undefined)?.id ?? null;
  if (rid) ownerIdCache.set(user.id, rid);
  return rid;
}