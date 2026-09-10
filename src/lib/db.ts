import { Pool } from "pg";
import type { QueryResult } from "pg";

// PostgreSQL pool. The barangay computer points DATABASE_URL at its own
// local PostgreSQL instance; when absent we fall back to a dev connection.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.jqrhmqcjxrxhdgjzkpdy:5oJUvupMkopIfdZp@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5000,
});

// Normalise date/timestamp results to the ISO strings pages expect
// (supabase-style) instead of JS Date objects. Registered on each pooled
// client so the parser registry matches the `pg` module in use.
const isoDate = (v: string) => v.slice(0, 10);
const isoDateTime = (v: string) => new Date(v).toISOString();

pool.on("connect", (client) => {
  client.setTypeParser(1082, isoDate); // date
  client.setTypeParser(1114, isoDateTime); // timestamp
  client.setTypeParser(1184, isoDateTime); // timestamptz
});

export function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params as never[]);
}

// ---------------------------------------------------------------- schema cache

interface TableInfo {
  columns: Set<string>;
  /** foreign key columns on this table pointing to other tables (child -> parent) */
  fkTo: Record<string, string[]>; // key: referenced table name, value: local FK columns
  /** constraints by name: [localCols[], refTable, refCols[]] */
  constraints: Map<string, { local: string[]; refTable: string; ref: string[] }>;
}

const schemaCache = new Map<string, TableInfo>();

export async function getTableInfo(table: string): Promise<TableInfo | null> {
  const cached = schemaCache.get(table);
  if (cached) return cached;

  const cols = await pool.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table]
  );
  if (cols.rows.length === 0) return null;

  const fks = await pool.query(
    `select
       con.conname,
       (select array_agg(a.attname order by kn.pos) from unnest(con.conkey) with ordinality as kn(attnum0, pos)
         join pg_attribute a on a.attrelid = con.conrelid and a.attnum = kn.attnum0)::text[] as local_cols,
       confrelid::regclass::text as ref_table,
       (select array_agg(a.attname order by kf.pos) from unnest(con.confkey) with ordinality as kf(attnum0, pos)
         join pg_attribute a on a.attrelid = con.confrelid and a.attnum = kf.attnum0)::text[] as ref_cols
     from pg_constraint con
     join pg_class c on c.oid = con.conrelid
     join pg_namespace n on n.oid = c.relnamespace
     where con.contype = 'f' and c.relname = $1 and n.nspname = 'public'`,
    [table]
  );

  const fkTo: Record<string, string[]> = {};
  const constraints = new Map<string, { local: string[]; refTable: string; ref: string[] }>();

  for (const row of fks.rows as Array<{ conname: string; local_cols: string[]; ref_table: string; ref_cols: string[] }>) {
    // Offline mode: on-prem schemas have no auth schema — user FKs point at public.users.
    const refTable = row.ref_table.replace(/^public\./, "").replace(/^auth\.users$/, "users").replace(/^auth\./, "");
    constraints.set(row.conname, { local: row.local_cols, refTable, ref: row.ref_cols });
    if (row.local_cols.length > 0) fkTo[refTable] = [...(fkTo[refTable] ?? []), ...row.local_cols];
  }

  const info: TableInfo = {
    columns: new Set(cols.rows.map((r) => r.column_name)),
    fkTo,
    constraints,
  };
  schemaCache.set(table, info);
  return info;
}

/**
 * Resolve how `parent` joins to `child` for an embedded resource.
 * Returns the join columns in (parentKey, childKey) form plus the direction
 * (`single` when the parent holds the foreign key, `array` otherwise).
 */
export async function resolveJoin(
  parent: string,
  child: string,
  fkHint?: string
): Promise<{ parentKey: string; childKey: string; single: boolean } | null> {
  const pi = await getTableInfo(parent);
  const ci = await getTableInfo(child);
  if (!pi || !ci) return null;

  // Explicit constraint-name hint (e.g. residents!fk_households_head).
  if (fkHint) {
    const c = pi.constraints.get(fkHint) ?? ci.constraints.get(fkHint);
    if (c) {
      const refsParent = c.refTable === parent;
      if (refsParent) {
        return { parentKey: c.ref[0], childKey: c.local[0], single: false };
      }
      return { parentKey: c.local[0], childKey: c.ref[0], single: true };
    }
  }

  // Hint looks like a foreign key column name on the parent (e.g. household_id).
  if (fkHint && pi.columns.has(fkHint)) {
    return { parentKey: fkHint, childKey: "id", single: true };
  }

  // Parent -> child foreign key  = single object (parent.<col> = child.id).
  const parentToChild = pi.fkTo[child];
  if (parentToChild && parentToChild.length > 0) {
    return { parentKey: parentToChild[0], childKey: "id", single: true };
  }

  // Child -> parent foreign key = array (child.<col> = parent.id).
  const childToParent = ci.fkTo[parent];
  if (childToParent && childToParent.length > 0) {
    return { parentKey: "id", childKey: childToParent[0], single: false };
  }

  // Fallback heuristics for column naming conventions.
  if (pi.columns.has(`${child}_id`)) return { parentKey: `${child}_id`, childKey: "id", single: true };
  if (ci.columns.has(`${parent}_id`)) return { parentKey: "id", childKey: `${parent}_id`, single: false };
  return null;
}