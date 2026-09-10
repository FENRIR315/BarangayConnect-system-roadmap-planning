import { getTableInfo, resolveJoin, query } from "@/lib/db";

// ------------------------------------------------------------------ types

export interface Filter {
  type: "eq" | "neq" | "in" | "ilike" | "like" | "gte" | "gt" | "lte" | "lt" | "not";
  column: string;
  notOp?: string;
  value: unknown;
}

export interface OrderBy {
  column: string;
  asc: boolean;
}

export interface EmbedSpec {
  alias: string;
  table: string;
  fkHint?: string;
  spec: SelectSpec;
}

export interface SelectSpec {
  columns: string[];
  embeds: EmbedSpec[];
}

export interface Query {
  table: string;
  verb: "select" | "insert" | "update" | "delete";
  select?: string | null;
  opts?: { count?: "exact" | "planned"; head?: boolean };
  filters: Filter[];
  ors: string[];
  orderBy: OrderBy[];
  range?: [number, number];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  values?: unknown;
}

export interface DbResult {
  data: any;
  count: number | null;
  error: { message: string; code?: string } | null;
}

// --------------------------------------------------------- select parsing

function splitTopLevel(input: string, sep = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      if (cur.trim()) parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

export function parseSelect(raw: string | null | undefined): SelectSpec {
  const spec: SelectSpec = { columns: [], embeds: [] };
  if (!raw) return spec;
  for (const token of splitTopLevel(raw)) {
    const t = token.trim();
    if (!t) continue;
    const colonIdx = t.indexOf(":");
    if (colonIdx === -1) {
      spec.columns.push(t);
      continue;
    }
    const alias = t.slice(0, colonIdx).trim();
    const rest = t.slice(colonIdx + 1).trim();
    const openIdx = rest.indexOf("(");
    const tablePart = openIdx === -1 ? rest : rest.slice(0, openIdx).trim();
    const hintMatch = tablePart.match(/^([a-zA-Z_][\w]*)(?:!([a-zA-Z_][\w]*))?$/);
    if (!hintMatch) continue;
    const table = hintMatch[1];
    const fkHint = hintMatch[2] || undefined;
    const inner = openIdx === -1 ? "*" : rest.slice(openIdx + 1, rest.lastIndexOf(")"));
    spec.embeds.push({ alias, table, fkHint, spec: parseSelect(inner) });
  }
  return spec;
}

// ------------------------------------------------------------- execution

class Ctx {
  params: unknown[] = [];
  private n = 0;
  nextAlias(): string {
    return `x${this.n++}`;
  }
  add(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }
}

function err(message: string, code?: string): DbResult {
  return { data: null, count: null, error: { message, code } };
}

function toJsonb(v: unknown): unknown {
  return typeof v === "string" ? tryJson(v) : v;
}

function tryJson(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

async function buildObjectExpr(table: string, spec: SelectSpec, alias: string, ctx: Ctx): Promise<string> {
  const info = await getTableInfo(table);
  if (!info) return "NULL::jsonb";

  const all = spec.columns.includes("*");
  const cols = spec.columns
    .filter((c) => c !== "*")
    .map((c) => c.trim())
    .filter((c) => info.columns.has(c));
  const used = all ? [...info.columns] : cols;

  const pairs: string[] = [];
  for (const col of used) {
    pairs.push(`'${col.replace(/'/g, "''")}'`, `"${alias}"."${col}"`);
  }
  for (const e of spec.embeds) {
    const join = await resolveJoin(table, e.table, e.fkHint);
    if (!join) continue;
    const childAlias = ctx.nextAlias();
    const childExpr = await buildObjectExpr(e.table, e.spec, childAlias, ctx);
    const cond = `"${childAlias}"."${join.childKey}" = "${alias}"."${join.parentKey}"`;
    if (join.single) {
      pairs.push(`'${e.alias.replace(/'/g, "''")}'`, `(SELECT ${childExpr} FROM "${e.table}" "${childAlias}" WHERE ${cond})`);
    } else {
      pairs.push(
        `'${e.alias.replace(/'/g, "''")}'`,
        `(SELECT COALESCE(jsonb_agg(${childExpr}), '[]'::jsonb) FROM "${e.table}" "${childAlias}" WHERE ${cond})`
      );
    }
  }
  return `jsonb_build_object(${pairs.join(",")})`;
}

async function runSelect(q: Query): Promise<DbResult> {
  const info = await getTableInfo(q.table);
  if (!info) return err(`relation "${q.table}" does not exist`);
  const allowed = info.columns;

  const spec = parseSelect(q.select);
  const allRoot = spec.columns.includes("*");
  const rootCols = spec.columns.filter((c) => c !== "*").map((c) => c.trim()).filter((c) => allowed.has(c));
  const cols = allRoot ? [...allowed] : rootCols;
  if (cols.length === 0) cols.push("id");

  // ---- count (exact)
  let count: number | null = null;
  if (q.opts?.count === "exact") {
    const cctx = new Ctx();
    const w = await buildWhere(q, "t0", cctx, allowed);
    const sql = `SELECT count(*)::int AS tt FROM "${q.table}" "t0"${w.clause}`;
    const r = await query(sql, cctx.params);
    count = (r.rows[0] as { tt: number } | undefined)?.tt ?? 0;
  }

  if (q.opts?.head) {
    return { data: [], count, error: null };
  }

  // ---- data
  const ctx = new Ctx();
  const w = await buildWhere(q, "t0", ctx, allowed);

  const selectParts = cols.map((c) => `"t0"."${c}"`);
  const embedSqls: string[] = [];
  for (const e of spec.embeds) {
    const join = await resolveJoin(q.table, e.table, e.fkHint);
    if (!join) {
      embedSqls.push("NULL::jsonb");
      continue;
    }
    const childAlias = ctx.nextAlias();
    const childExpr = await buildObjectExpr(e.table, e.spec, childAlias, ctx);
    const cond = `"${childAlias}"."${join.childKey}" = "t0"."${join.parentKey}"`;
    embedSqls.push(
      join.single
        ? `(SELECT ${childExpr} FROM "${e.table}" "${childAlias}" WHERE ${cond})`
        : `(SELECT COALESCE(jsonb_agg(${childExpr}), '[]'::jsonb) FROM "${e.table}" "${childAlias}" WHERE ${cond})`
    );
  }

  const allowedOrders = q.orderBy.filter((o) => allowed.has(o.column));
  if (q.orderBy.length > allowedOrders.length) {
    const bad = q.orderBy.find((o) => !allowed.has(o.column));
    return err(`column "${bad?.column}" does not exist on table "${q.table}"`);
  }
  const orderSql = allowedOrders.length > 0
    ? " ORDER BY " + allowedOrders.map((o) => `"t0"."${o.column}" ${o.asc ? "ASC" : "DESC"} NULLS LAST`).join(", ")
    : "";

  let limitSql = "";
  if (q.range) {
    const [from, to] = q.range;
    limitSql = ` LIMIT ${to - from + 1} OFFSET ${from}`;
  } else if (q.limit != null) {
    limitSql = ` LIMIT ${q.limit}`;
  }

  const sql = `SELECT ${selectParts.join(", ")}${
    embedSqls.length ? ", " + embedSqls.map((s, i) => `${s} AS "__embed_${i}"`).join(", ") : ""
  } FROM "${q.table}" "t0"${w.clause}${orderSql}${limitSql}`;

  const res = await query(sql, ctx.params);
  if (process.env.LOCAL_DEBUG) console.log("[local-sql]", sql);
  const rows = res.rows as Record<string, unknown>[];

  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("__embed_")) {
        const idx = Number(k.slice("__embed_".length));
        const e = spec.embeds[idx];
        if (e) out[e.alias] = toJsonb(v);
      } else {
        out[k] = toJsonb(v);
      }
    }
    return out;
  });

  if (q.single) {
    if (data.length === 0) {
      if (q.maybeSingle) return { data: null, count, error: null };
      return err("JSON object requested, multiple (or no) rows returned", "PGRST116");
    }
    if (data.length > 1) {
      if (q.maybeSingle) return err("JSON object requested, multiple (or no) rows returned", "PGRST116");
      return err("JSON object requested, multiple (or no) rows returned", "PGRST116");
    }
    return { data: data[0], count, error: null };
  }

  return { data, count, error: null };
}

async function buildWhere(
  q: Query,
  alias: string,
  ctx: Ctx,
  allowed: Set<string>
): Promise<{ clause: string }> {
  const conds: string[] = [];
  for (const f of q.filters) {
    if (allowed.size > 0 && !allowed.has(f.column)) continue;
    const colSql = `"${alias}"."${f.column}"`;
    switch (f.type) {
      case "eq":
        conds.push(`${colSql} = ${ctx.add(f.value)}`);
        break;
      case "neq":
        conds.push(`${colSql} <> ${ctx.add(f.value)}`);
        break;
      case "in":
        conds.push(`${colSql} = ANY(${ctx.add(f.value)})`);
        break;
      case "ilike":
        conds.push(`${colSql} ILIKE ${ctx.add(f.value)}`);
        break;
      case "like":
        conds.push(`${colSql} LIKE ${ctx.add(f.value)}`);
        break;
      case "gte":
        conds.push(`${colSql} >= ${ctx.add(f.value)}`);
        break;
      case "gt":
        conds.push(`${colSql} > ${ctx.add(f.value)}`);
        break;
      case "lte":
        conds.push(`${colSql} <= ${ctx.add(f.value)}`);
        break;
      case "lt":
        conds.push(`${colSql} < ${ctx.add(f.value)}`);
        break;
      case "not": {
        const op = f.notOp ?? "eq";
        let inner: string;
        if (op === "is") {
          inner = f.value === null ? `${colSql} IS NULL` : `${colSql} IS NOT DISTINCT FROM ${ctx.add(f.value)}`;
        } else {
          switch (op) {
            case "in":
              inner = `${colSql} = ANY(${ctx.add(f.value)})`;
              break;
            case "ilike":
              inner = `${colSql} ILIKE ${ctx.add(f.value)}`;
              break;
            case "like":
              inner = `${colSql} LIKE ${ctx.add(f.value)}`;
              break;
            case "neq":
              inner = `${colSql} <> ${ctx.add(f.value)}`;
              break;
            default:
              inner = `${colSql} = ${ctx.add(f.value)}`;
          }
        }
        conds.push(`NOT (${inner})`);
        break;
      }
    }
  }

  for (const orraw of q.ors) {
    const parts = splitTopLevel(orraw, ",");
    const subs: string[] = [];
    for (const token0 of parts) {
      const token = token0.trim();
      const m = token.match(/^([a-zA-Z_][\w]*)(?:\.([a-z]+)(?:\.(.+))?)?$/);
      if (!m) continue;
      const col = m[1];
      if (allowed.size > 0 && !allowed.has(col)) continue;
      const op = m[2] || "eq";
      const value = m[3] ?? null;
      const colSql = `"${alias}"."${col}"`;
      switch (op) {
        case "eq":
          subs.push(`${colSql} = ${ctx.add(value)}`);
          break;
        case "neq":
          subs.push(`${colSql} <> ${ctx.add(value)}`);
          break;
        case "ilike":
          subs.push(`${colSql} ILIKE ${ctx.add(value)}`);
          break;
        case "like":
          subs.push(`${colSql} LIKE ${ctx.add(value)}`);
          break;
        case "gte":
          subs.push(`${colSql} >= ${ctx.add(value)}`);
          break;
        case "lte":
          subs.push(`${colSql} <= ${ctx.add(value)}`);
          break;
        case "gt":
          subs.push(`${colSql} > ${ctx.add(value)}`);
          break;
        case "lt":
          subs.push(`${colSql} < ${ctx.add(value)}`);
          break;
        case "is":
          subs.push(`${colSql} IS ${value === "null" ? "NULL" : "NOT NULL"}`);
          break;
      }
    }
    if (subs.length > 0) conds.push(`(${subs.join(" OR ")})`);
  }

  return { clause: conds.length > 0 ? ` WHERE ${conds.join(" AND ")}` : "" };
}

async function runInsert(q: Query): Promise<DbResult> {
  const info = await getTableInfo(q.table);
  if (!info) return err(`relation "${q.table}" does not exist`);
  const rows = Array.isArray(q.values) ? q.values : [q.values];
  if (rows.length === 0 || !rows[0]) return { data: [], count: null, error: null };

  const keys = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r ?? {})) if (info.columns.has(k)) keys.add(k);
  }
  const cols = [...keys];
  if (cols.length === 0) return err("no columns to insert");

  const ctx = new Ctx();
  const placeholders = rows.map((_r, ri) => {
    cols.forEach((c, ci) => ctx.add(rows[ri]?.[c] ?? null));
    return `(${cols.map((_c, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`;
  });
  const conflict = cols.includes("id") ? " ON CONFLICT (id) DO NOTHING" : "";
  const sql = `INSERT INTO "${q.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders.join(", ")}${conflict} RETURNING *`;
  const res = await query(sql, ctx.params);
  return { data: res.rows, count: null, error: null };
}

async function runUpdate(q: Query): Promise<DbResult> {
  const info = await getTableInfo(q.table);
  if (!info) return err(`relation "${q.table}" does not exist`);
  const val = q.values as Record<string, unknown> | null;
  if (!val) return err("missing update values");

  const ctx = new Ctx();
  const sets: string[] = [];
  for (const [k, v] of Object.entries(val)) {
    if (info.columns.has(k)) sets.push(`"${k}" = ${ctx.add(v)}`);
  }
  if (sets.length === 0) return err("no columns to update");

  const w = await buildWhere(q, "t0", ctx, info.columns);
  const sql = `UPDATE "${q.table}" "t0" SET ${sets.join(", ")}${w.clause} RETURNING *`;
  const res = await query(sql, ctx.params);
  return { data: res.rows, count: null, error: null };
}

async function runDelete(q: Query): Promise<DbResult> {
  const info = await getTableInfo(q.table);
  if (!info) return err(`relation "${q.table}" does not exist`);
  const ctx = new Ctx();
  const w = await buildWhere(q, "t0", ctx, info.columns);
  const sql = `DELETE FROM "${q.table}" "t0"${w.clause} RETURNING *`;
  const res = await query(sql, ctx.params);
  return { data: res.rows, count: null, error: null };
}

export async function runQuery(q: Query): Promise<DbResult> {
  try {
    let res: DbResult;
    switch (q.verb) {
      case "select":
        res = await runSelect(q);
        break;
      case "insert":
        res = await runInsert(q);
        break;
      case "update":
        res = await runUpdate(q);
        break;
      case "delete":
        res = await runDelete(q);
        break;
      default:
        return err("unknown verb");
    }
    // `.single()` works on write verbs too (insert(...).select().single())
    if (q.single && !res.error && Array.isArray(res.data)) {
      if (res.data.length !== 1) {
        return err("JSON object requested, multiple (or no) rows returned", "PGRST116");
      }
      res.data = res.data[0];
    }
    return res;
  } catch (e: any) {
    return err(e?.message ?? "database error", e?.code);
  }
}