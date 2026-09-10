import { pool } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { parseSelect, type Query } from "@/lib/local/sql";

/**
 * Server-side access control for the generic /api/local/db endpoint.
 *
 * Roles:
 *  - anon:  read-only, only `documents` (single verified row, safe columns) and
 *           `barangay_settings`.
 *  - resident: reads/writes scoped to THEIR OWN rows; sensitive tables blocked.
 *  - staff (everything else): full access, but `password_hash` / `sessions`
 *           are never reachable through this endpoint.
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

// Tables residents may READ (and write, see RESIDENT_WRITE_TABLES below).
const RESIDENT_READ_TABLES = new Set([
  ...Object.keys(OWNER_BY_TABLE),
  "announcements",
  "appointment_services",
  "barangay_settings",
  "complaint_types",
  "document_types",
]);

// Tables residents may INSERT / UPDATE / DELETE on (still owner-scoped).
const RESIDENT_WRITE_TABLES = new Set([
  "appointments",
  "complaints",
  "document_requests",
  "notifications",
  "resident_documents",
]);

// Tables nobody can reach through this generic endpoint regardless of role.
const BLOCKED_TABLES = new Set(["sessions", "audit_logs"]);

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

function containsToken(list: string[], token: string): boolean {
  return list.some((c) => c === token);
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

  // writes
  if (!RESIDENT_WRITE_TABLES.has(table)) {
    return forbidden(table, "You are not allowed to modify this data");
  }
  const ownerCol = OWNER_BY_TABLE[table];
  const id = await ownerIdFor(user, table);
  if (!id) return forbidden(table, "Your account is not linked to a resident record yet");

  if (ownerCol === "user_id") {
    q.filters = q.filters.filter((f) => !(f.type === "eq" && f.column === "user_id"));
    q.filters.push({ type: "eq", column: "user_id", value: user.id });
    if (q.values && typeof q.values === "object" && !Array.isArray(q.values)) {
      (q.values as Record<string, unknown>)["user_id"] = user.id;
    }
  } else {
    q.filters = q.filters.filter((f) => !(f.type === "eq" && f.column === "resident_id"));
    q.filters.push({ type: "eq", column: "resident_id", value: id });
    if (q.values && typeof q.values === "object" && !Array.isArray(q.values)) {
      (q.values as Record<string, unknown>)["resident_id"] = id;
    }
  }

  // Inserts must not be able to set a foreign owner id even by overriding values:
  // (filters on insert go into the VALUES? no - inserts build from values; the
  //  forced values above already win because runQuery() gives values precedence.)

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