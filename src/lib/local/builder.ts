import type { Query, DbResult } from "@/lib/local/sql";

export type Executor = (q: Query) => Promise<DbResult>;

type FilterOp = "eq" | "neq" | "in" | "ilike" | "like" | "gte" | "gt" | "lte" | "lt";

/**
 * A supabase-js-compatible query builder backed by our local SQL engine.
 * The same class is used by the browser client (via fetch to /api/local/db)
 * and by server helpers (direct query execution).
 */
export class QueryChain {
  private q: Query;
  constructor(
    private table: string,
    private exec: Executor
  ) {
    this.q = { table, verb: "select", filters: [], ors: [], orderBy: [] };
  }

  // ------------------------------------------------------------ verb setters
  select(columns?: string, opts?: { count?: "exact" | "planned"; head?: boolean }) {
    this.q.verb = "select";
    this.q.select = columns ?? "*";
    this.q.opts = opts;
    return this;
  }
  insert(values: unknown) {
    this.q.verb = "insert";
    this.q.values = values;
    return this;
  }
  update(values: unknown) {
    this.q.verb = "update";
    this.q.values = values;
    return this;
  }
  upsert(values: unknown) {
    this.q.verb = "insert";
    this.q.values = values;
    return this;
  }
  delete() {
    this.q.verb = "delete";
    return this;
  }

  // -------------------------------------------------------------- filters
  private addFilter(type: FilterOp) {
    return (column: string, value: unknown) => {
      this.q.filters.push({ type, column, value });
      return this;
    };
  }
  eq = this.addFilter("eq");
  neq = this.addFilter("neq");
  in = this.addFilter("in");
  ilike = this.addFilter("ilike");
  like = this.addFilter("like");
  gte = this.addFilter("gte");
  gt = this.addFilter("gt");
  lte = this.addFilter("lte");
  lt = this.addFilter("lt");

  not(column: string, op: string, value: unknown) {
    this.q.filters.push({ type: "not", column, notOp: op, value });
    return this;
  }

  or(filters: string) {
    this.q.ors.push(filters);
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.q.orderBy.push({ column, asc: opts?.ascending ?? true });
    return this;
  }

  range(from: number, to: number) {
    this.q.range = [from, to];
    return this;
  }

  limit(n: number) {
    this.q.limit = n;
    return this;
  }

  single() {
    this.q.single = true;
    return this;
  }

  maybeSingle() {
    this.q.single = true;
    this.q.maybeSingle = true;
    return this;
  }

  // ------------------------------------------------------------ promise
  then<TResult1 = DbResult, TResult2 = never>(
    resolve?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(resolve, reject);
  }

  catch<TResult = never>(
    reject?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<DbResult | TResult> {
    return this.run().catch(reject);
  }

  async run(): Promise<DbResult> {
    return this.exec(this.q);
  }
}

export function makeTable(table: string, exec: Executor): () => QueryChain {
  return () => new QueryChain(table, exec);
}