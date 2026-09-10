import { runQuery } from "@/lib/local/sql";
import { QueryChain } from "@/lib/local/builder";

/**
 * Server-side client for Server Components. Executes directly against the
 * local PostgreSQL database (no HTTP hop, no per-request session scoping).
 */
export function createClient() {
  return {
    from: (table: string) => new QueryChain(table, runQuery),
  };
}